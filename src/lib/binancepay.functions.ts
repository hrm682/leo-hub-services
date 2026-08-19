import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { binancePayOrderSchema } from "@/lib/schemas";

/**
 * Pago automático con Binance Pay. `createBinancePayOrder` genera la orden de
 * cobro; `verifyBinancePayOrder` consulta el estado real y, si está pagada,
 * activa/renueva el servicio con el mismo helper que la aprobación manual.
 * La confirmación es idempotente: la activación solo corre en la transición
 * pendiente→aprobado (update condicional que devuelve fila).
 */

type OrderRow = {
  id: string;
  order_number: string;
  kind: string;
  user_id: string;
  total: number;
};

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

function unwrapOrder(raw: unknown): OrderRow | null {
  const o = Array.isArray(raw) ? raw[0] : raw;
  return (o as OrderRow) ?? null;
}

export const createBinancePayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => binancePayOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const db = await loadAdmin();

    const { data: payment } = await db
      .from("payments")
      .select("id, status, order_id, orders(id, order_number, kind, user_id, total)")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (!payment) throw new Error("Pago no encontrado para esta orden");

    const order = unwrapOrder(payment.orders);
    if (!order) throw new Error("Orden asociada no encontrada");
    if (order.user_id !== userId) throw new Error("Esta orden no te pertenece");
    if (payment.status !== "pendiente") throw new Error("Esta orden ya no tiene un pago pendiente");

    const { binancePayConfigured, createBinanceOrder } = await import("@/lib/binance-pay.server");
    if (!binancePayConfigured()) throw new Error("Binance Pay no está configurado");

    const merchantTradeNo = (
      order.order_number.replace(/[^A-Za-z0-9]/g, "") + Date.now().toString().slice(-6)
    ).slice(0, 32);

    const created = await createBinanceOrder({
      merchantTradeNo,
      amount: Number(order.total),
      goodsName: `LoMaximoLeo ${order.kind === "renovacion" ? "renovación" : "compra"} ${order.order_number}`,
      referenceGoodsId: order.id,
    });

    const { error: updateError } = await db
      .from("payments")
      .update({
        provider: "binance_pay",
        binance_prepay_id: created.prepayId,
        binance_merchant_trade_no: created.merchantTradeNo,
        binance_checkout_url: created.checkoutUrl,
      })
      .eq("id", payment.id)
      .eq("status", "pendiente");
    if (updateError) throw new Error("No se pudo registrar la orden de Binance Pay");

    await db.from("audit_logs").insert({
      user_id: userId,
      action: "binance_order_created",
      entity_type: "payment",
      entity_id: payment.id,
      metadata: { order_number: order.order_number, merchant_trade_no: created.merchantTradeNo },
    });

    return {
      checkoutUrl: created.checkoutUrl,
      qrContent: created.qrContent,
      deeplink: created.deeplink,
      universalUrl: created.universalUrl,
    };
  });

export const verifyBinancePayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => binancePayOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await loadAdmin();

    const { data: payment } = await db
      .from("payments")
      .select(
        "id, status, binance_merchant_trade_no, order_id, orders(id, order_number, kind, user_id, total)",
      )
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (!payment) throw new Error("Pago no encontrado para esta orden");

    const order = unwrapOrder(payment.orders);
    if (!order) throw new Error("Orden asociada no encontrada");

    // Autoriza al dueño de la orden o al staff.
    if (order.user_id !== userId) {
      const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
      if (!staff) throw new Error("Sin acceso a esta orden");
    }

    if (payment.status === "aprobado") {
      return { status: "PAID" as const, activated: false };
    }
    if (!payment.binance_merchant_trade_no) {
      throw new Error("Esta orden no tiene un pago de Binance Pay iniciado");
    }

    const { queryBinanceOrder } = await import("@/lib/binance-pay.server");
    const { status } = await queryBinanceOrder(payment.binance_merchant_trade_no);

    if (status !== "PAID") {
      return { status, activated: false };
    }

    // Transición condicional pendiente→aprobado (garantiza activación única).
    const { data: transitioned } = await db
      .from("payments")
      .update({
        status: "aprobado",
        paid_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("status", "pendiente")
      .select("id")
      .maybeSingle();

    if (!transitioned) {
      // Otro proceso ya la confirmó.
      return { status: "PAID" as const, activated: false };
    }

    await db.from("orders").update({ status: "pagada" }).eq("id", order.id);

    const { activateOrderServices } = await import("@/lib/order-activation.server");
    await activateOrderServices(db, {
      id: order.id,
      order_number: order.order_number,
      kind: order.kind,
      user_id: order.user_id,
    });

    await db.from("audit_logs").insert({
      user_id: order.user_id,
      action: "binance_payment_confirmed",
      entity_type: "payment",
      entity_id: payment.id,
      metadata: { order_number: order.order_number, amount: order.total },
    });

    return { status: "PAID" as const, activated: true };
  });
