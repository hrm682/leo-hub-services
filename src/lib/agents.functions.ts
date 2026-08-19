import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assignAgentSchema, clientIdSchema, logInteractionSchema } from "@/lib/schemas";

/**
 * Panel de agentes: asigna un agente de soporte principal por cliente y
 * expone el historial de interacción. Las tablas `client_agent_assignments`
 * y `agent_interactions` son nuevas y aún no están en los tipos generados de
 * Supabase, por lo que se accede a través de un cliente casteado sin genéricos.
 */

type TimelineItem = {
  at: string;
  kind: "asignacion" | "ticket" | "interaccion" | "servicio";
  title: string;
  detail: string;
  actor: string | null;
};

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

async function staffProfiles(db: SupabaseClient) {
  const { data: roles } = await db
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "soporte"]);
  const ids = [...new Set((roles ?? []).map((r: { user_id: string }) => r.user_id))];
  const { data: profiles } = ids.length
    ? await db.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] as { id: string; full_name: string }[] };
  const roleById = new Map<string, string[]>();
  for (const r of (roles ?? []) as { user_id: string; role: string }[]) {
    roleById.set(r.user_id, [...(roleById.get(r.user_id) ?? []), r.role]);
  }
  return (profiles ?? []).map((p: { id: string; full_name: string }) => ({
    id: p.id,
    fullName: p.full_name || "Agente",
    isAdmin: (roleById.get(p.id) ?? []).includes("admin"),
  }));
}

/** Lista de clientes con su agente actual + catálogo de agentes para asignar. */
export const listClientAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Solo el equipo de LoMaximoLeo");

    const db = await loadAdmin();

    const [{ data: profiles }, { data: current }, { data: services }, { data: tickets }, agents] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, phone, created_at")
          .order("created_at", { ascending: false }),
        db
          .from("client_agent_assignments")
          .select("client_id, agent_id, assigned_at")
          .is("unassigned_at", null),
        supabase.from("customer_services").select("user_id, status"),
        supabase.from("support_tickets").select("user_id, status"),
        staffProfiles(db),
      ]);

    const agentName = new Map(agents.map((a) => [a.id, a.fullName]));
    const currentByClient = new Map(
      ((current ?? []) as { client_id: string; agent_id: string; assigned_at: string }[]).map(
        (r) => [r.client_id, r],
      ),
    );
    const openStates = ["abierto", "en_revision", "en_espera", "en_proceso"];

    const customers = (profiles ?? []).map((p) => {
      const cur = currentByClient.get(p.id);
      return {
        id: p.id,
        fullName: p.full_name || "Sin nombre",
        phone: p.phone,
        agentId: cur?.agent_id ?? null,
        agentName: cur ? (agentName.get(cur.agent_id) ?? "Agente") : null,
        assignedAt: cur?.assigned_at ?? null,
        activeServices: (services ?? []).filter((s) => s.user_id === p.id && s.status === "activo")
          .length,
        openTickets: (tickets ?? []).filter(
          (t) => t.user_id === p.id && openStates.includes(t.status),
        ).length,
      };
    });

    const assignedCount = new Map<string, number>();
    for (const c of customers) {
      if (c.agentId) assignedCount.set(c.agentId, (assignedCount.get(c.agentId) ?? 0) + 1);
    }

    return {
      customers,
      agents: agents.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        isAdmin: a.isAdmin,
        clients: assignedCount.get(a.id) ?? 0,
      })),
      unassigned: customers.filter((c) => !c.agentId).length,
    };
  });

/** Asigna (o reasigna) el agente principal de un cliente. Solo admin. */
export const assignAgentToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => assignAgentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo administradores pueden asignar agentes");

    const { data: agentIsStaff } = await supabase.rpc("is_staff", { _user_id: data.agentId });
    if (!agentIsStaff) throw new Error("El usuario elegido no es parte del equipo de soporte");

    const db = await loadAdmin();

    const { data: existing } = await db
      .from("client_agent_assignments")
      .select("id, agent_id")
      .eq("client_id", data.clientId)
      .is("unassigned_at", null)
      .maybeSingle();

    if (existing && existing.agent_id === data.agentId) {
      return { ok: true as const, unchanged: true as const };
    }

    if (existing) {
      await db
        .from("client_agent_assignments")
        .update({ unassigned_at: new Date().toISOString(), unassigned_by: userId })
        .eq("id", existing.id);
    }

    const { error: insertError } = await db.from("client_agent_assignments").insert({
      client_id: data.clientId,
      agent_id: data.agentId,
      assigned_by: userId,
      note: data.note || null,
    });
    if (insertError) throw new Error("No se pudo asignar el agente: " + insertError.message);

    const { data: agentProfile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", data.agentId)
      .maybeSingle();

    await db.from("agent_interactions").insert({
      client_id: data.clientId,
      agent_id: data.agentId,
      type: "reasignacion",
      summary: existing
        ? `Reasignado a ${agentProfile?.full_name || "un agente"}`
        : `Asignado a ${agentProfile?.full_name || "un agente"}`,
    });

    await db.from("audit_logs").insert({
      user_id: userId,
      action: "agent_assigned",
      entity_type: "client_agent_assignment",
      entity_id: data.clientId,
      metadata: { agent_id: data.agentId },
    });

    return { ok: true as const, unchanged: false as const };
  });

/** Quita el agente actual de un cliente. Solo admin. */
export const unassignAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => clientIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo administradores pueden quitar agentes");

    const db = await loadAdmin();
    const { data: existing } = await db
      .from("client_agent_assignments")
      .select("id")
      .eq("client_id", data.clientId)
      .is("unassigned_at", null)
      .maybeSingle();
    if (!existing) return { ok: true as const };

    await db
      .from("client_agent_assignments")
      .update({ unassigned_at: new Date().toISOString(), unassigned_by: userId })
      .eq("id", existing.id);

    await db.from("audit_logs").insert({
      user_id: userId,
      action: "agent_unassigned",
      entity_type: "client_agent_assignment",
      entity_id: data.clientId,
      metadata: {},
    });

    return { ok: true as const };
  });

/** Registra una interacción manual (nota/llamada/seguimiento) con el cliente. */
export const logAgentInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => logInteractionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Solo el equipo de LoMaximoLeo");

    const db = await loadAdmin();
    const { error } = await db.from("agent_interactions").insert({
      client_id: data.clientId,
      agent_id: userId,
      type: data.type,
      summary: data.summary,
    });
    if (error) throw new Error("No se pudo registrar la interacción");

    return { ok: true as const };
  });

/** Timeline unificado de interacción de un cliente (asignaciones, tickets, notas, eventos). */
export const getClientInteractionHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => clientIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Solo el equipo de LoMaximoLeo");

    const db = await loadAdmin();

    const { data: client } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("id", data.clientId)
      .maybeSingle();
    if (!client) throw new Error("Cliente no encontrado");

    const { data: myServices } = await supabase
      .from("customer_services")
      .select("id")
      .eq("user_id", data.clientId);
    const serviceIds = (myServices ?? []).map((s) => s.id);

    const [{ data: assignments }, { data: tickets }, { data: interactions }, { data: events }] =
      await Promise.all([
        db
          .from("client_agent_assignments")
          .select("agent_id, assigned_by, assigned_at, unassigned_at, unassigned_by, note")
          .eq("client_id", data.clientId)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("support_tickets")
          .select("ticket_number, subject, status, created_at, assigned_to")
          .eq("user_id", data.clientId)
          .order("created_at", { ascending: false }),
        db
          .from("agent_interactions")
          .select("agent_id, type, summary, created_at")
          .eq("client_id", data.clientId)
          .order("created_at", { ascending: false }),
        serviceIds.length
          ? supabase
              .from("service_events")
              .select("event_type, description, created_at")
              .in("customer_service_id", serviceIds)
              .order("created_at", { ascending: false })
              .limit(40)
          : Promise.resolve({
              data: [] as { event_type: string; description: string; created_at: string }[],
            }),
      ]);

    // Resolver nombres de todos los usuarios referenciados.
    const userRefs = new Set<string>();
    for (const a of (assignments ?? []) as { agent_id: string; assigned_by: string | null }[]) {
      userRefs.add(a.agent_id);
      if (a.assigned_by) userRefs.add(a.assigned_by);
    }
    for (const i of (interactions ?? []) as { agent_id: string }[]) userRefs.add(i.agent_id);
    for (const t of (tickets ?? []) as { assigned_to: string | null }[]) {
      if (t.assigned_to) userRefs.add(t.assigned_to);
    }
    const refIds = [...userRefs];
    const { data: refProfiles } = refIds.length
      ? await db.from("profiles").select("id, full_name").in("id", refIds)
      : { data: [] as { id: string; full_name: string }[] };
    const nameById = new Map(
      (refProfiles ?? []).map((p: { id: string; full_name: string }) => [
        p.id,
        p.full_name || "Agente",
      ]),
    );

    const timeline: TimelineItem[] = [];

    const interactionLabel: Record<string, string> = {
      nota: "Nota",
      llamada: "Llamada",
      seguimiento: "Seguimiento",
      reasignacion: "Reasignación",
    };

    for (const a of (assignments ?? []) as {
      agent_id: string;
      assigned_by: string | null;
      assigned_at: string;
      unassigned_at: string | null;
      unassigned_by: string | null;
      note: string | null;
    }[]) {
      timeline.push({
        at: a.assigned_at,
        kind: "asignacion",
        title: `Asignado a ${nameById.get(a.agent_id) ?? "Agente"}`,
        detail: a.note || (a.assigned_by ? `Por ${nameById.get(a.assigned_by) ?? "admin"}` : ""),
        actor: a.assigned_by ? (nameById.get(a.assigned_by) ?? null) : null,
      });
      if (a.unassigned_at) {
        timeline.push({
          at: a.unassigned_at,
          kind: "asignacion",
          title: `Removido de ${nameById.get(a.agent_id) ?? "Agente"}`,
          detail: a.unassigned_by ? `Por ${nameById.get(a.unassigned_by) ?? "admin"}` : "",
          actor: a.unassigned_by ? (nameById.get(a.unassigned_by) ?? null) : null,
        });
      }
    }

    for (const t of (tickets ?? []) as {
      ticket_number: string;
      subject: string;
      status: string;
      created_at: string;
      assigned_to: string | null;
    }[]) {
      timeline.push({
        at: t.created_at,
        kind: "ticket",
        title: `Ticket ${t.ticket_number}: ${t.subject}`,
        detail: `Estado: ${t.status}`,
        actor: t.assigned_to ? (nameById.get(t.assigned_to) ?? null) : null,
      });
    }

    for (const i of (interactions ?? []) as {
      agent_id: string;
      type: string;
      summary: string;
      created_at: string;
    }[]) {
      timeline.push({
        at: i.created_at,
        kind: "interaccion",
        title: `${interactionLabel[i.type] ?? "Interacción"}`,
        detail: i.summary,
        actor: nameById.get(i.agent_id) ?? null,
      });
    }

    for (const e of (events ?? []) as {
      event_type: string;
      description: string;
      created_at: string;
    }[]) {
      timeline.push({
        at: e.created_at,
        kind: "servicio",
        title: `Servicio: ${e.event_type}`,
        detail: e.description,
        actor: null,
      });
    }

    timeline.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

    const cur = (assignments ?? []).find(
      (a: { unassigned_at: string | null }) => a.unassigned_at === null,
    ) as { agent_id: string } | undefined;

    return {
      client: { id: client.id, fullName: client.full_name || "Sin nombre", phone: client.phone },
      currentAgent: cur
        ? { id: cur.agent_id, fullName: nameById.get(cur.agent_id) ?? "Agente" }
        : null,
      timeline,
    };
  });
