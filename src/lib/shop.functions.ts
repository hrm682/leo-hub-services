import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachReceiptSchema, createOrderSchema, createRenewalSchema } from "@/lib/schemas";

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ code: z.string().trim().min(1).max(50) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: coupon } = await context.supabase
      .from("coupons")
      .select("code, description, discount_percent")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();

    if (!coupon) return { valid: false as const };
    return {
      valid: true as const,
      code: coupon.code,
      description: coupon.description,
      discountPercent: Number(coupon.discount_percent),
    };
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, duration_days, is_active")
      .in("id", ids);
    if (productsError || !products) throw new Error("No se pudo procesar el catálogo");

    const byId = new Map(products.map((p) => [p.id, p]));
    for (const item of data.items) {
      const p = byId.get(item.productId);
      if (!p || !p.is_active)
        throw new Error("Uno de los servicios ya no está disponible. Actualiza tu carrito.");
    }

    let subtotal = 0;
    for (const item of data.items) {
      subtotal += Number(byId.get(item.productId)!.price) * item.quantity;
    }
    subtotal = Math.round(subtotal * 100) / 100;

    let discount = 0;
    let couponCode: string | null = null;
    if (data.couponCode) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("code, discount_percent")
        .eq("code", data.couponCode.toUpperCase())
        .maybeSingle();
      if (coupon) {
        discount = Math.round(subtotal * (Number(coupon.discount_percent) / 100) * 100) / 100;
        couponCode = coupon.code;
      }
    }
    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        kind: "compra",
        coupon_code: couponCode,
        subtotal,
        discount,
        total,
      })
      .select("id, order_number")
      .single();
    if (orderError || !order) throw new Error("No se pudo crear la orden. Inténtalo de nuevo.");

    for (const item of data.items) {
      const p = byId.get(item.productId)!;
      const { data: orderItem, error: itemError } = await supabase
        .from("order_items")
        .insert({
          order_id: order.id,
          product_id: p.id,
          service_name: p.name,
          unit_price: Number(p.price),
          quantity: item.quantity,
          duration_days: p.duration_days,
        })
        .select("id")
        .single();
      if (itemError || !orderItem) throw new Error("No se pudo registrar el detalle de la orden");

      for (let q = 0; q < item.quantity; q++) {
        const { data: svc, error: svcError } = await supabase
          .from("customer_services")
          .insert({
            user_id: userId,
            product_id: p.id,
            order_item_id: orderItem.id,
            status: "pago_pendiente",
          })
          .select("id")
          .single();
        if (svcError || !svc) throw new Error("No se pudo registrar el servicio");
        await supabase.from("service_events").insert({
          customer_service_id: svc.id,
          event_type: "compra",
          description: `Orden ${order.order_number} creada. Servicio pendiente de pago.`,
        });
      }
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      order_id: order.id,
      provider: "binance_manual",
      amount: total,
      currency: "USD",
    });
    if (paymentError) throw new Error("No se pudo registrar el pago de la orden");

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "orden",
      title: "Recibimos tu orden",
      content: `Tu orden ${order.order_number} fue creada. Sube tu comprobante de pago para activar tus servicios.`,
    });
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "order_created",
      entity_type: "order",
      entity_id: order.id,
      metadata: { order_number: order.order_number, total },
    });

    return { orderId: order.id, orderNumber: order.order_number, total };
  });

export const createRenewalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createRenewalSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: service } = await supabase
      .from("customer_services")
      .select("id, status, service_reference, products(id, name, price, duration_days, is_active)")
      .eq("id", data.serviceId)
      .maybeSingle();

    if (!service) throw new Error("Servicio no encontrado");
    if (service.status === "en_renovacion")
      throw new Error("Este servicio ya tiene una renovación en proceso");
    if (service.status !== "activo")
      throw new Error("Este servicio no está disponible para renovación");

    const product = Array.isArray(service.products) ? service.products[0] : service.products;
    if (!product || !product.is_active)
      throw new Error("Este servicio ya no está disponible en el catálogo");

    const total = Number(product.price);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({ user_id: userId, kind: "renovacion", subtotal: total, discount: 0, total })
      .select("id, order_number")
      .single();
    if (orderError || !order) throw new Error("No se pudo crear la orden de renovación");

    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      customer_service_id: service.id,
      service_name: `${product.name} (renovación)`,
      unit_price: total,
      quantity: 1,
      duration_days: product.duration_days,
    });
    if (itemError) throw new Error("No se pudo registrar la renovación");

    const { error: payError } = await supabase.from("payments").insert({
      order_id: order.id,
      provider: "binance_manual",
      amount: total,
      currency: "USD",
    });
    if (payError) throw new Error("No se pudo registrar el pago de la renovación");

    const { error: statusError } = await supabase
      .from("customer_services")
      .update({ status: "en_renovacion" })
      .eq("id", service.id)
      .eq("status", "activo");
    if (statusError) throw new Error("No se pudo actualizar el estado del servicio");

    await supabase.from("service_events").insert({
      customer_service_id: service.id,
      event_type: "renovacion",
      description: `Renovación solicitada con la orden ${order.order_number}. Pendiente de pago.`,
    });
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "renovacion",
      title: "Renovación en proceso",
      content: `Registramos tu renovación de ${product.name}. Sube tu comprobante para completarla.`,
    });
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "renewal_created",
      entity_type: "order",
      entity_id: order.id,
      metadata: { order_number: order.order_number, service: service.service_reference },
    });

    return { orderId: order.id, orderNumber: order.order_number, total };
  });

export const attachReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => attachReceiptSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (!data.receiptPath.startsWith(`${userId}/`))
      throw new Error("Ruta de comprobante inválida");

    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Orden no encontrada");

    const { data: payment, error } = await supabase
      .from("payments")
      .update({
        receipt_path: data.receiptPath,
        transaction_reference: data.transactionReference || null,
      })
      .eq("order_id", order.id)
      .eq("status", "pendiente")
      .select("id")
      .maybeSingle();

    if (error) throw new Error("No se pudo adjuntar el comprobante");
    if (!payment) throw new Error("Esta orden ya no tiene un pago pendiente");

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "pago",
      title: "Comprobante recibido",
      content: `Recibimos el comprobante de tu orden ${order.order_number}. Lo revisaremos pronto.`,
    });
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "receipt_attached",
      entity_type: "order",
      entity_id: order.id,
      metadata: { order_number: order.order_number },
    });

    return { ok: true as const };
  });

export const getOrderDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, order_number, kind, status, subtotal, discount, total, coupon_code, created_at, order_items(id, service_name, unit_price, quantity, duration_days, customer_service_id), payments(id, provider, status, amount, currency, transaction_reference, receipt_path, rejection_reason, created_at)",
      )
      .eq("id", data.orderId)
      .maybeSingle();

    return { order: order ?? null };
  });
