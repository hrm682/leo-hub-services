import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lógica de activación/renovación de servicios compartida por la aprobación
 * manual de pagos (admin) y la confirmación automática de Binance Pay. Mantener
 * una sola fuente de verdad evita divergencias en el cálculo de vencimientos.
 */

export type ActivatableOrder = {
  id: string;
  order_number: string;
  kind: string;
  user_id: string;
};

/**
 * Calcula el nuevo vencimiento de un servicio. En renovación, si el servicio
 * sigue vigente se acumula desde su vencimiento futuro; si ya venció (o es una
 * compra nueva) se cuenta desde ahora. Función pura para poder testearla.
 */
export function computeExpiration(
  kind: "compra" | "renovacion" | string,
  currentExpiration: string | null,
  durationDays: number,
  now: Date,
): Date {
  let start = now;
  if (kind === "renovacion" && currentExpiration) {
    const exp = new Date(currentExpiration);
    if (exp > now) start = exp;
  }
  return new Date(start.getTime() + durationDays * 86_400_000);
}

/**
 * Activa/renueva los servicios de una orden ya pagada, registra los eventos y
 * notifica al cliente. Se asume que el llamador ya transicionó el pago a
 * "aprobado" y la orden a "pagada" de forma condicional (una sola vez), por lo
 * que esta función no se ejecuta dos veces para el mismo pago.
 *
 * `db` puede ser el cliente del usuario staff (aprobación manual, con policy
 * "staff update services") o `supabaseAdmin` (confirmación Binance, service role).
 */
export async function activateOrderServices(
  db: SupabaseClient,
  order: ActivatableOrder,
): Promise<void> {
  const { data: items } = await db
    .from("order_items")
    .select("id, customer_service_id, duration_days, service_name, product_id, quantity")
    .eq("order_id", order.id);

  const { data: services } = await db
    .from("customer_services")
    .select("id, status, expiration_date, order_item_id")
    .eq("user_id", order.user_id);

  const byOrderItem = new Map(
    ((services ?? []) as { id: string; order_item_id: string | null }[]).map((s) => [
      s.order_item_id,
      s,
    ]),
  );

  // El descuento de stock corre SIEMPRE con service_role (la RPC solo la puede
  // ejecutar el servidor), sin importar con qué cliente se llamó este helper.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const adminDb = supabaseAdmin as unknown as SupabaseClient;

  const now = new Date();

  for (const item of (items ?? []) as {
    id: string;
    customer_service_id: string | null;
    duration_days: number;
    service_name: string;
    product_id: string | null;
    quantity: number;
  }[]) {
    // Inventario: una compra consume stock; una renovación no (es la misma cuenta).
    if (order.kind !== "renovacion" && item.product_id) {
      await adminDb.rpc("decrement_product_stock", {
        _product_id: item.product_id,
        _qty: item.quantity ?? 1,
      });
    }

    const targetId = item.customer_service_id ?? byOrderItem.get(item.id)?.id;
    if (!targetId) continue;
    const current = ((services ?? []) as { id: string; expiration_date: string | null }[]).find(
      (s) => s.id === targetId,
    );

    const expiration = computeExpiration(
      order.kind,
      current?.expiration_date ?? null,
      item.duration_days,
      now,
    );

    await db
      .from("customer_services")
      .update({
        status: "activo",
        start_date: now.toISOString(),
        expiration_date: expiration.toISOString(),
      })
      .eq("id", targetId);

    await db.from("service_events").insert({
      customer_service_id: targetId,
      event_type: order.kind === "renovacion" ? "renovacion" : "activacion",
      description:
        order.kind === "renovacion"
          ? `Renovación aprobada. Nuevo vencimiento: ${expiration.toLocaleDateString("es-EC")}.`
          : "Pago aprobado. Servicio activado.",
    });
  }

  await db.from("notifications").insert({
    user_id: order.user_id,
    type: "pago",
    title: "Pago aprobado",
    content: `Tu pago de la orden ${order.order_number} fue aprobado. Tu servicio ya está activo.`,
  });
}
