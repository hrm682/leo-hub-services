import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { productInputSchema, reviewPaymentSchema, ticketMessageSchema } from "@/lib/schemas";

export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Solo el equipo de Leo Hub");

    const [{ data: profiles }, { data: payments }, { data: services }, { data: tickets }, { data: orders }] =
      await Promise.all([
        supabase.from("profiles").select("id"),
        supabase.from("payments").select("id, status, amount"),
        supabase.from("customer_services").select("id, status, expiration_date"),
        supabase.from("support_tickets").select("id, status"),
        supabase
          .from("orders")
          .select("id, order_number, kind, status, total, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

    const pagos = payments ?? [];
    const ingresos = pagos
      .filter((p) => p.status === "aprobado")
      .reduce((acc, p) => acc + Number(p.amount), 0);
    const soon = new Date(Date.now() + 7 * 86_400_000).toISOString();

    return {
      clientes: (profiles ?? []).length,
      ingresos: Math.round(ingresos * 100) / 100,
      pagosPendientes: pagos.filter((p) => p.status === "pendiente").length,
      renovacionesProximas: (services ?? []).filter(
        (s) =>
          s.status === "activo" &&
          s.expiration_date &&
          s.expiration_date <= soon &&
          s.expiration_date >= new Date().toISOString(),
      ).length,
      serviciosActivos: (services ?? []).filter((s) => s.status === "activo").length,
      ticketsAbiertos: (tickets ?? []).filter((t) => !["resuelto", "cerrado"].includes(t.status))
        .length,
      ticketsResueltos: (tickets ?? []).filter((t) => ["resuelto", "cerrado"].includes(t.status))
        .length,
      ultimasOrdenes: orders ?? [],
    };
  });

export const listPaymentsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Solo el equipo de Leo Hub");

    const { data } = await supabase
      .from("payments")
      .select(
        "id, amount, currency, status, provider, transaction_reference, receipt_path, rejection_reason, created_at, orders(id, order_number, kind, status, total, user_id)",
      )
      .order("created_at", { ascending: false });

    const rows = (data ?? []).map((p) => ({
      ...p,
      order: Array.isArray(p.orders) ? (p.orders[0] ?? null) : p.orders,
    }));

    const userIds = [...new Set(rows.map((r) => r.order?.user_id).filter(Boolean))] as string[];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, phone").in("id", userIds)
      : { data: [] };
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p]));

    return {
      payments: rows.map((r) => ({
        ...r,
        customer: r.order?.user_id ? (nameById.get(r.order.user_id) ?? null) : null,
      })),
    };
  });

export const reviewPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => reviewPaymentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Solo administradores pueden revisar pagos");

    const { data: payment } = await supabase
      .from("payments")
      .select("id, status, amount, order_id, orders(id, order_number, kind, user_id, total)")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!payment) throw new Error("Pago no encontrado");
    if (payment.status !== "pendiente") throw new Error("Este pago ya fue revisado");

    const order = Array.isArray(payment.orders) ? payment.orders[0] : payment.orders;
    if (!order) throw new Error("Orden asociada no encontrada");

    const { error: payError } = await supabase
      .from("payments")
      .update({
        status: data.approve ? "aprobado" : "rechazado",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: data.approve ? null : (data.reason || "Comprobante no válido"),
      })
      .eq("id", payment.id)
      .eq("status", "pendiente");
    if (payError) throw new Error("No se pudo actualizar el pago");

    const { data: items } = await supabase
      .from("order_items")
      .select("id, customer_service_id, duration_days, service_name")
      .eq("order_id", order.id);

    if (data.approve) {
      await supabase.from("orders").update({ status: "pagada" }).eq("id", order.id);

      const { data: services } = await supabase
        .from("customer_services")
        .select("id, status, expiration_date, order_item_id")
        .eq("user_id", order.user_id);
      const byOrderItem = new Map((services ?? []).map((s) => [s.order_item_id, s]));

      for (const item of items ?? []) {
        const targetId = item.customer_service_id ?? byOrderItem.get(item.id)?.id;
        if (!targetId) continue;
        const current = (services ?? []).find((s) => s.id === targetId);

        const now = new Date();
        let start = now;
        if (order.kind === "renovacion" && current?.expiration_date) {
          const exp = new Date(current.expiration_date);
          if (exp > now) start = exp;
        }
        const expiration = new Date(start.getTime() + item.duration_days * 86_400_000);

        await supabase
          .from("customer_services")
          .update({
            status: "activo",
            start_date: now.toISOString(),
            expiration_date: expiration.toISOString(),
          })
          .eq("id", targetId);

        await supabase.from("service_events").insert({
          customer_service_id: targetId,
          event_type: order.kind === "renovacion" ? "renovacion" : "activacion",
          description:
            order.kind === "renovacion"
              ? `Renovación aprobada. Nuevo vencimiento: ${expiration.toLocaleDateString("es-EC")}.`
              : "Pago aprobado. Servicio activado.",
        });
      }

      await supabase.from("notifications").insert({
        user_id: order.user_id,
        type: "pago",
        title: "Pago aprobado",
        content: `Tu pago de la orden ${order.order_number} fue aprobado. Tu servicio ya está activo.`,
      });
    } else {
      await supabase.from("orders").update({ status: "rechazada" }).eq("id", order.id);

      for (const item of items ?? []) {
        if (!item.customer_service_id) continue;
        await supabase
          .from("customer_services")
          .update({ status: "activo" })
          .eq("id", item.customer_service_id)
          .eq("status", "en_renovacion");
        await supabase.from("service_events").insert({
          customer_service_id: item.customer_service_id,
          event_type: "pago",
          description: "Pago de renovación rechazado. El servicio continúa activo.",
        });
      }

      await supabase.from("notifications").insert({
        user_id: order.user_id,
        type: "pago",
        title: "Pago rechazado",
        content: `No pudimos validar el pago de tu orden ${order.order_number}. Motivo: ${data.reason || "Comprobante no válido"}. Puedes abrir un ticket de soporte si necesitas ayuda.`,
      });
    }

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: data.approve ? "payment_approved" : "payment_rejected",
      entity_type: "payment",
      entity_id: payment.id,
      metadata: { order_number: order.order_number, amount: payment.amount },
    });

    return { ok: true as const };
  });

export const listOrdersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Solo el equipo de Leo Hub");

    const { data } = await supabase
      .from("orders")
      .select(
        "id, order_number, kind, status, subtotal, discount, total, coupon_code, created_at, user_id, order_items(service_name, quantity), payments(id, status)",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    const rows = data ?? [];
    const userIds = [...new Set(rows.map((o) => o.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] };
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    return {
      orders: rows.map((o) => ({
        ...o,
        customerName: nameById.get(o.user_id) ?? "Cliente",
        payment: Array.isArray(o.payments) ? (o.payments[0] ?? null) : o.payments,
      })),
    };
  });

export const listCustomersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Solo el equipo de Leo Hub");

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone, document_number, created_at")
      .order("created_at", { ascending: false });

    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = ids.length
      ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] };
    const { data: services } = ids.length
      ? await supabase
          .from("customer_services")
          .select("id, user_id, status")
          .in("user_id", ids)
      : { data: [] };

    const rolesById = new Map<string, string[]>();
    for (const r of roles ?? []) {
      rolesById.set(r.user_id, [...(rolesById.get(r.user_id) ?? []), r.role]);
    }

    return {
      customers: (profiles ?? []).map((p) => ({
        ...p,
        roles: rolesById.get(p.id) ?? ["cliente"],
        servicesCount: (services ?? []).filter((s) => s.user_id === p.id).length,
        activeServices: (services ?? []).filter(
          (s) => s.user_id === p.id && s.status === "activo",
        ).length,
      })),
    };
  });

export const upsertProductAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => productInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Solo administradores");

    const payload = {
      category_id: data.categoryId,
      name: data.name,
      slug: data.slug,
      short_description: data.shortDescription,
      description: data.description,
      benefits: data.benefits,
      image_url: data.imageUrl,
      price: data.price,
      duration_days: data.durationDays,
      billing_label: data.billingLabel,
      is_active: data.isActive,
      is_featured: data.isFeatured,
    };

    const { error } = data.id
      ? await supabase.from("products").update(payload).eq("id", data.id)
      : await supabase.from("products").insert(payload);
    if (error) throw new Error("No se pudo guardar el producto: " + error.message);

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: data.id ? "product_updated" : "product_created",
      entity_type: "product",
      entity_id: data.id ?? data.slug,
      metadata: { name: data.name },
    });

    return { ok: true as const };
  });

export const listProductsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Solo administradores");

    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase
        .from("products")
        .select("id, category_id, name, slug, short_description, description, benefits, image_url, price, duration_days, billing_label, is_active, is_featured")
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name").order("sort_order"),
    ]);

    return { products: products ?? [], categories: categories ?? [] };
  });

export const listTicketsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Solo el equipo de Leo Hub");

    const { data } = await supabase
      .from("support_tickets")
      .select(
        "id, ticket_number, subject, category, priority, status, rating, created_at, updated_at, user_id, assigned_to, customer_services(service_reference, products(name))",
      )
      .order("created_at", { ascending: false });

    const rows = data ?? [];
    const userIds = [...new Set(rows.flatMap((t) => [t.user_id, t.assigned_to]).filter(Boolean))] as string[];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] };
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    return {
      tickets: rows.map((t) => {
        const cs = Array.isArray(t.customer_services)
          ? (t.customer_services[0] ?? null)
          : t.customer_services;
        const product = cs?.products
          ? Array.isArray(cs.products)
            ? (cs.products[0] ?? null)
            : cs.products
          : null;
        return {
          ...t,
          customerName: nameById.get(t.user_id) ?? "Cliente",
          assigneeName: t.assigned_to ? (nameById.get(t.assigned_to) ?? "Agente") : null,
          serviceReference: cs?.service_reference ?? null,
          productName: product?.name ?? null,
        };
      }),
    };
  });

export const setTicketStatusAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        ticketId: z.string().uuid(),
        status: z.enum(["abierto", "en_revision", "en_espera", "en_proceso", "resuelto", "cerrado"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Solo el equipo de Leo Hub");

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, user_id, status")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (!ticket) throw new Error("Ticket no encontrado");

    const { error } = await supabase
      .from("support_tickets")
      .update({
        status: data.status,
        closed_at: data.status === "cerrado" ? new Date().toISOString() : null,
      })
      .eq("id", ticket.id);
    if (error) throw new Error("No se pudo actualizar el estado");

    await supabase.from("notifications").insert({
      user_id: ticket.user_id,
      type: "ticket",
      title: "Ticket actualizado",
      content: `Tu ticket ${ticket.ticket_number} cambió de estado. Revisa la conversación para más detalles.`,
    });

    return { ok: true as const };
  });

export const replyTicketAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    ticketMessageSchema.extend({ isInternalNote: z.boolean().default(false) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Solo el equipo de Leo Hub");

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, user_id, status, assigned_to")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (!ticket) throw new Error("Ticket no encontrado");

    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: userId,
      message: data.message,
      is_internal_note: data.isInternalNote,
    });
    if (error) throw new Error("No se pudo enviar la respuesta");

    const updates: {
      assigned_to?: string;
      status?: "abierto" | "en_revision" | "en_espera" | "en_proceso" | "resuelto" | "cerrado";
    } = {};
    if (!ticket.assigned_to) updates.assigned_to = userId;
    if (!data.isInternalNote && ["abierto", "en_revision", "en_espera"].includes(ticket.status)) {
      updates.status = "en_proceso";
    }
    if (Object.keys(updates).length) {
      await supabase.from("support_tickets").update(updates).eq("id", ticket.id);
    }

    if (!data.isInternalNote) {
      await supabase.from("notifications").insert({
        user_id: ticket.user_id,
        type: "ticket",
        title: "Nueva respuesta de soporte",
        content: `Tu ticket ${ticket.ticket_number} tiene una nueva respuesta del equipo.`,
      });
    }

    return { ok: true as const };
  });
