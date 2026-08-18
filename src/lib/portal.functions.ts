import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createTicketSchema,
  ticketMessageSchema,
  updateProfileSchema,
} from "@/lib/schemas";
import { daysRemaining } from "@/lib/format";

export const getPortalSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const [{ data: services }, { data: tickets }, { data: unread }] = await Promise.all([
      supabase
        .from("customer_services")
        .select("id, status, expiration_date, products(name)"),
      supabase.from("support_tickets").select("id, status"),
      supabase.from("notifications").select("id").is("read_at", null),
    ]);

    const list = services ?? [];
    const activos = list.filter((s) => s.status === "activo");
    const porVencer = activos.filter((s) => {
      const d = daysRemaining(s.expiration_date);
      return d !== null && d >= 0 && d <= 7;
    });
    const vencidos = activos.filter((s) => {
      const d = daysRemaining(s.expiration_date);
      return d !== null && d < 0;
    });

    return {
      totalServicios: list.length,
      activos: activos.length - porVencer.length - vencidos.length,
      porVencer: porVencer.length,
      vencidos: vencidos.length,
      pagoPendiente: list.filter((s) => s.status === "pago_pendiente").length,
      enRenovacion: list.filter((s) => s.status === "en_renovacion").length,
      ticketsAbiertos: (tickets ?? []).filter(
        (t) => !["resuelto", "cerrado"].includes(t.status),
      ).length,
      notificacionesSinLeer: (unread ?? []).length,
      proximosVencimientos: activos
        .filter((s) => {
          const d = daysRemaining(s.expiration_date);
          return d !== null && d <= 14;
        })
        .sort((a, b) => (a.expiration_date ?? "").localeCompare(b.expiration_date ?? ""))
        .slice(0, 4)
        .map((s) => ({
          id: s.id,
          expirationDate: s.expiration_date,
          productName:
            (Array.isArray(s.products) ? s.products[0]?.name : s.products?.name) ?? "Servicio",
        })),
    };
  });

export const getMyServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const [{ data }, { data: renewalOrders }] = await Promise.all([
      supabase
        .from("customer_services")
        .select(
          "id, service_reference, status, start_date, expiration_date, created_at, products(id, name, image_url, billing_label, duration_days, price), order_items!customer_services_order_item_id_fkey(id, orders(id, order_number, status, payments(id, status, receipt_path)))",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select(
          "id, order_number, status, created_at, order_items(customer_service_id), payments(status, receipt_path)",
        )
        .eq("kind", "renovacion")
        .eq("status", "pendiente")
        .order("created_at", { ascending: false }),
    ]);

    // Última orden de renovación pendiente por servicio (para "Completar pago" desde el portal)
    const renewalByService = new Map<
      string,
      { id: string; orderNumber: string; paymentStatus: string | null; hasReceipt: boolean }
    >();
    for (const order of renewalOrders ?? []) {
      const items = Array.isArray(order.order_items) ? order.order_items : [];
      const payment = Array.isArray(order.payments)
        ? (order.payments[0] ?? null)
        : order.payments;
      for (const item of items) {
        if (!item.customer_service_id || renewalByService.has(item.customer_service_id)) continue;
        renewalByService.set(item.customer_service_id, {
          id: order.id,
          orderNumber: order.order_number,
          paymentStatus: payment?.status ?? null,
          hasReceipt: Boolean(payment?.receipt_path),
        });
      }
    }

    return {
      services: (data ?? []).map((s) => {
        const orderItem = Array.isArray(s.order_items) ? (s.order_items[0] ?? null) : s.order_items;
        const order = orderItem?.orders
          ? Array.isArray(orderItem.orders)
            ? (orderItem.orders[0] ?? null)
            : orderItem.orders
          : null;
        const payment = order?.payments
          ? Array.isArray(order.payments)
            ? (order.payments[0] ?? null)
            : order.payments
          : null;
        return {
          id: s.id,
          serviceReference: s.service_reference,
          status: s.status,
          startDate: s.start_date,
          expirationDate: s.expiration_date,
          createdAt: s.created_at,
          product: Array.isArray(s.products) ? (s.products[0] ?? null) : s.products,
          purchaseOrder: order
            ? {
                id: order.id,
                orderNumber: order.order_number,
                status: order.status,
                paymentStatus: payment?.status ?? null,
                hasReceipt: Boolean(payment?.receipt_path),
              }
            : null,
          renewalOrder: renewalByService.get(s.id) ?? null,
        };
      }),
    };
  });

export const getServiceDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ serviceId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: service } = await supabase
      .from("customer_services")
      .select(
        "id, service_reference, status, start_date, expiration_date, created_at, order_item_id, products(name, image_url, description, billing_label, duration_days, benefits, support_url, price)",
      )
      .eq("id", data.serviceId)
      .maybeSingle();
    if (!service) return { service: null };

    const itemsFilter = service.order_item_id
      ? `customer_service_id.eq.${data.serviceId},id.eq.${service.order_item_id}`
      : `customer_service_id.eq.${data.serviceId}`;

    const [{ data: events }, { data: tickets }, { data: items }] = await Promise.all([
      supabase
        .from("service_events")
        .select("id, event_type, description, created_at")
        .eq("customer_service_id", data.serviceId)
        .order("created_at", { ascending: false }),
      supabase
        .from("support_tickets")
        .select("id, ticket_number, subject, status, created_at")
        .eq("customer_service_id", data.serviceId)
        .order("created_at", { ascending: false }),
      supabase
        .from("order_items")
        .select(
          "id, service_name, unit_price, duration_days, orders(id, order_number, kind, status, total, created_at, payments(id, status, amount, provider, receipt_path, created_at))",
        )
        .or(itemsFilter)
        .order("created_at", { ascending: false }),
    ]);

    return {
      service: {
        ...service,
        product: Array.isArray(service.products) ? (service.products[0] ?? null) : service.products,
      },
      events: events ?? [],
      tickets: tickets ?? [],
      orderItems: items ?? [],
    };
  });

export const getMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("payments")
      .select(
        "id, amount, currency, status, provider, transaction_reference, receipt_path, rejection_reason, created_at, orders(order_number, kind, status, created_at)",
      )
      .order("created_at", { ascending: false });

    return {
      payments: (data ?? []).map((p) => ({
        ...p,
        order: Array.isArray(p.orders) ? (p.orders[0] ?? null) : p.orders,
      })),
    };
  });

export const getMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("support_tickets")
      .select(
        "id, ticket_number, subject, category, priority, status, rating, created_at, updated_at, customer_services(service_reference, products(name))",
      )
      .order("created_at", { ascending: false });

    return {
      tickets: (data ?? []).map((t) => {
        const cs = Array.isArray(t.customer_services)
          ? (t.customer_services[0] ?? null)
          : t.customer_services;
        const product = cs?.products
          ? Array.isArray(cs.products)
            ? (cs.products[0] ?? null)
            : cs.products
          : null;
        return { ...t, serviceReference: cs?.service_reference ?? null, productName: product?.name ?? null };
      }),
    };
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createTicketSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: service } = await supabase
      .from("customer_services")
      .select("id, status, service_reference")
      .eq("id", data.customerServiceId)
      .maybeSingle();
    if (!service) throw new Error("Servicio no encontrado");
    if (!["activo", "en_renovacion"].includes(service.status))
      throw new Error("Solo puedes abrir tickets sobre servicios activos");

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: userId,
        customer_service_id: data.customerServiceId,
        category: data.category,
        priority: data.priority,
        subject: data.subject,
        description: data.description,
      })
      .select("id, ticket_number")
      .single();
    if (error || !ticket) throw new Error("No se pudo crear el ticket. Inténtalo de nuevo.");

    if (data.attachmentPath) {
      if (!data.attachmentPath.startsWith(`${userId}/`))
        throw new Error("Ruta de adjunto inválida");
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_id: userId,
        message: "Adjunto enviado con la solicitud",
        attachment_path: data.attachmentPath,
      });
    }

    await supabase.from("service_events").insert({
      customer_service_id: data.customerServiceId,
      event_type: "soporte",
      description: `Ticket ${ticket.ticket_number} abierto: ${data.subject}`,
    });
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "ticket",
      title: "Tu solicitud fue recibida correctamente",
      content: `Un agente revisará tu caso ${ticket.ticket_number}. Te avisaremos cuando haya novedades.`,
    });

    return { ticketId: ticket.id, ticketNumber: ticket.ticket_number };
  });

export const getTicketDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ ticketId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select(
        "id, ticket_number, user_id, subject, description, category, priority, status, rating, created_at, closed_at, customer_services(service_reference, products(name))",
      )
      .eq("id", data.ticketId)
      .maybeSingle();
    if (!ticket) return { ticket: null };

    const { data: messages } = await supabase
      .from("ticket_messages")
      .select("id, sender_id, message, is_internal_note, attachment_path, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    const cs = Array.isArray(ticket.customer_services)
      ? (ticket.customer_services[0] ?? null)
      : ticket.customer_services;
    const product = cs?.products
      ? Array.isArray(cs.products)
        ? (cs.products[0] ?? null)
        : cs.products
      : null;

    return {
      ticket: {
        ...ticket,
        serviceReference: cs?.service_reference ?? null,
        productName: product?.name ?? null,
      },
      messages: messages ?? [],
    };
  });

export const addTicketMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ticketMessageSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.attachmentPath && !data.attachmentPath.startsWith(`${userId}/`))
      throw new Error("Ruta de adjunto inválida");

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, status, ticket_number")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (!ticket) throw new Error("Ticket no encontrado");
    if (["cerrado"].includes(ticket.status)) throw new Error("Este ticket está cerrado");

    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: userId,
      message: data.message,
      attachment_path: data.attachmentPath || null,
    });
    if (error) throw new Error("No se pudo enviar el mensaje");

    if (ticket.status === "en_espera") {
      await supabase
        .from("support_tickets")
        .update({ status: "en_proceso" })
        .eq("id", ticket.id)
        .eq("status", "en_espera");
    }

    return { ok: true as const };
  });

export const rateTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ ticketId: z.string().uuid(), rating: z.number().int().min(1).max(5) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .update({ rating: data.rating, status: "cerrado", closed_at: new Date().toISOString() })
      .eq("id", data.ticketId)
      .eq("status", "resuelto")
      .select("id")
      .maybeSingle();

    if (error) throw new Error("No se pudo registrar tu calificación");
    if (!ticket) throw new Error("Este ticket no está disponible para calificar");

    return { ok: true as const };
  });

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications")
      .select("id, type, title, content, read_at, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(50);
    return { notifications: data ?? [] };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("read_at", null);
    return { ok: true as const };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    return { ok: true as const };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("full_name, phone, document_number, notification_prefs, created_at")
      .eq("id", context.userId)
      .maybeSingle();
    return { profile: data ?? null };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateProfileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone || null,
        document_number: data.documentNumber || null,
        notification_prefs: data.notificationPrefs,
      })
      .eq("id", context.userId);
    if (error) throw new Error("No se pudo actualizar tu perfil");
    return { ok: true as const };
  });
