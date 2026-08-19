# Pago automático con Binance Pay — Implementation Plan

> **For agentic workers:** implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Que el checkout y las renovaciones puedan pagarse automáticamente con Binance Pay (Merchant API, USDT), activando/renovando el servicio sin comprobante manual; el método manual sigue disponible.

**Architecture:** Cliente firmado a la Binance Pay Merchant API (`binance-pay.server.ts`, HMAC-SHA512, sin dependencias nuevas). Server fns `createBinancePayOrder` / `verifyBinancePayOrder`. Confirmación por verificación-al-volver + sondeo (idempotente); webhook documentado como futuro. Se extrae de `reviewPayment` un helper compartido `activateOrderServices` para que aprobación manual y auto-confirmación usen el mismo código.

**Tech Stack:** TanStack Start v1 (createServerFn), Supabase (service role vía `client.server`), `node:crypto`, React 19, Tailwind v4, zod, vitest (nuevo, solo para lógica pura).

**Spec:** `docs/superpowers/specs/2026-08-18-binancepay-y-agentes-design.md`

## Global Constraints

- No editar `src/integrations/**` ni `src/routeTree.gen.ts`.
- Secretos SOLO en env de servidor **sin** prefijo `VITE_` (`BINANCE_PAY_API_KEY`, `BINANCE_PAY_API_SECRET`, `BINANCE_PAY_BASE_URL`). Nunca en el bundle cliente.
- `supabaseAdmin` / módulos `*.server.ts` solo se importan dentro de handlers de server fn (`await import(...)`), nunca a nivel de módulo en `*.functions.ts` o rutas.
- La confirmación de pago debe ser **idempotente**: no reactivar ni duplicar eventos/notificaciones si ya está `aprobado`/`pagada`.
- Moneda: la orden está en USD; Binance Pay cobra en USDT con `orderAmount = total` (1 USDT ≈ 1 USD para el demo; documentar en runbook).
- Provider nuevo: `'binance_pay'`; el manual sigue `'binance_manual'`.

---

### Task 1: Setup de vitest (solo lógica pura)

**Files:**
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: comando `npm test` ejecutable.

- [ ] **Step 1:** `npm i -D vitest`.
- [ ] **Step 2:** Crear `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["src/**/*.test.ts"] } });
```
- [ ] **Step 3:** Añadir a `package.json` scripts: `"test": "vitest run"`.
- [ ] **Step 4:** `npm test` — corre sin tests (0 passed) sin error de config.

---

### Task 2: Cálculo de expiración (función pura + test)

**Files:**
- Create: `src/lib/order-activation.server.ts` (solo la función pura por ahora)
- Test: `src/lib/order-activation.test.ts`

**Interfaces:**
- Produces: `computeExpiration(kind: "compra"|"renovacion", currentExpiration: string|null, durationDays: number, now: Date): Date`

- [ ] **Step 1: Test que falla** (`order-activation.test.ts`):
```ts
import { describe, it, expect } from "vitest";
import { computeExpiration } from "./order-activation.server";

describe("computeExpiration", () => {
  const now = new Date("2026-08-18T00:00:00Z");
  it("compra: suma duración desde ahora", () => {
    expect(computeExpiration("compra", null, 30, now).toISOString())
      .toBe(new Date("2026-09-17T00:00:00Z").toISOString());
  });
  it("renovación con servicio vigente: extiende desde el vencimiento futuro", () => {
    const exp = "2026-09-01T00:00:00Z";
    expect(computeExpiration("renovacion", exp, 30, now).toISOString())
      .toBe(new Date("2026-10-01T00:00:00Z").toISOString());
  });
  it("renovación con servicio ya vencido: extiende desde ahora", () => {
    const exp = "2026-08-01T00:00:00Z";
    expect(computeExpiration("renovacion", exp, 30, now).toISOString())
      .toBe(new Date("2026-09-17T00:00:00Z").toISOString());
  });
});
```
- [ ] **Step 2:** `npm test` — FALLA (función no existe).
- [ ] **Step 3: Implementar** en `order-activation.server.ts`:
```ts
export function computeExpiration(
  kind: "compra" | "renovacion",
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
```
- [ ] **Step 4:** `npm test` — PASA.

---

### Task 3: Helper `activateOrderServices` + refactor de `reviewPayment`

**Files:**
- Modify: `src/lib/order-activation.server.ts` (añadir el helper con efectos DB)
- Modify: `src/lib/admin.functions.ts` (`reviewPayment` usa el helper para la rama de aprobación)

**Interfaces:**
- Consumes: `computeExpiration`.
- Produces: `activateOrderServices(admin, order): Promise<void>` — activa/renueva los servicios de una orden `pagada`, inserta `service_events` y notificación, **idempotente**. `admin` = cliente supabase con service role; `order` = `{ id, order_number, kind, user_id }`.

- [ ] **Step 1: Implementar `activateOrderServices`** (extraído de la rama `data.approve` de `reviewPayment`, usando `computeExpiration` y `now`), operando sobre `order_items` + `customer_services` como hoy. Debe ser seguro si se llama dos veces (chequear que el servicio no esté ya `activo` con la misma expiración o guardar por `paid_at`; como mínimo no duplicar la notificación "Pago aprobado" si la orden ya estaba `pagada`).
- [ ] **Step 2: Refactor `reviewPayment`:** en la rama de aprobación, tras marcar el pago `aprobado` y la orden `pagada`, llamar a `activateOrderServices(context.supabase, order)` en vez del bloque inline. (Mantener la rama de rechazo igual.) Nota: `reviewPayment` corre con el supabase del usuario (staff, que tiene policy `staff update services`), así que el helper debe aceptar el cliente que reciba; para el flujo Binance se le pasará `supabaseAdmin`.
- [ ] **Step 3:** `npx tsc --noEmit` — sin errores. Verificar manualmente que la aprobación manual de un pago sigue activando el servicio (regresión).

---

### Task 4: Cliente Binance Pay firmado + test de firma

**Files:**
- Create: `src/lib/binance-pay.server.ts`
- Test: `src/lib/binance-pay.test.ts`

**Interfaces:**
- Produces:
  - `buildSignature(timestamp: string, nonce: string, body: string, secret: string): string` (HMAC-SHA512 hex mayúsculas del payload `timestamp\n nonce\n body\n`).
  - `binancePayConfigured(): boolean`
  - `createBinanceOrder(input): Promise<{ prepayId, checkoutUrl, qrContent, deeplink, universalUrl, merchantTradeNo }>`
  - `queryBinanceOrder(merchantTradeNo: string): Promise<{ status: string }>` (status: INITIAL|PENDING|PAID|CANCELED|EXPIRED|ERROR)

- [ ] **Step 1: Test de firma que falla** (`binance-pay.test.ts`):
```ts
import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { buildSignature } from "./binance-pay.server";

describe("buildSignature", () => {
  it("firma HMAC-SHA512 en hex mayúsculas del payload canónico", () => {
    const ts = "1700000000000", nonce = "abc123", body = '{"a":1}', secret = "s3cr3t";
    const expected = createHmac("sha512", secret)
      .update(`${ts}\n${nonce}\n${body}\n`).digest("hex").toUpperCase();
    expect(buildSignature(ts, nonce, body, secret)).toBe(expected);
  });
});
```
- [ ] **Step 2:** `npm test` — FALLA.
- [ ] **Step 3: Implementar `binance-pay.server.ts`:**
```ts
import { createHmac, randomBytes } from "node:crypto";

const BASE = () => process.env["BINANCE_PAY_BASE_URL"] || "https://bpay.binanceapi.com";
const KEY = () => process.env["BINANCE_PAY_API_KEY"];
const SECRET = () => process.env["BINANCE_PAY_API_SECRET"];

export function binancePayConfigured(): boolean {
  return Boolean(KEY() && SECRET());
}
export function buildSignature(timestamp: string, nonce: string, body: string, secret: string): string {
  return createHmac("sha512", secret).update(`${timestamp}\n${nonce}\n${body}\n`).digest("hex").toUpperCase();
}
async function signedPost(path: string, payload: unknown): Promise<any> {
  const key = KEY(), secret = SECRET();
  if (!key || !secret) throw new Error("Binance Pay no está configurado");
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("hex"); // 32 chars
  const signature = buildSignature(timestamp, nonce, body, secret);
  const res = await fetch(`${BASE()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "BinancePay-Timestamp": timestamp,
      "BinancePay-Nonce": nonce,
      "BinancePay-Certificate-SN": key,
      "BinancePay-Signature": signature,
    },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status !== "SUCCESS") {
    throw new Error(`Binance Pay: ${json.errorMessage || json.code || res.status}`);
  }
  return json.data;
}
export async function createBinanceOrder(input: {
  merchantTradeNo: string; amount: number; goodsName: string; referenceGoodsId: string;
}) {
  const data = await signedPost("/binancepay/openapi/v3/order", {
    env: { terminalType: "WEB" },
    merchantTradeNo: input.merchantTradeNo,
    orderAmount: Number(input.amount.toFixed(2)),
    currency: "USDT",
    goods: {
      goodsType: "02", goodsCategory: "Z000",
      referenceGoodsId: input.referenceGoodsId, goodsName: input.goodsName,
    },
  });
  return {
    prepayId: data.prepayId as string,
    checkoutUrl: data.checkoutUrl as string,
    qrContent: data.qrContent as string,
    deeplink: data.deeplink as string,
    universalUrl: data.universalUrl as string,
    merchantTradeNo: input.merchantTradeNo,
  };
}
export async function queryBinanceOrder(merchantTradeNo: string): Promise<{ status: string }> {
  const data = await signedPost("/binancepay/openapi/v2/order/query", { merchantTradeNo });
  return { status: data.status as string };
}
```
- [ ] **Step 4:** `npm test` — PASA. `npx tsc --noEmit` — sin errores.

---

### Task 5: Migración de columnas Binance en `payments`

**Files:**
- Create: `supabase/migrations/<ts>_binance_pay.sql`

- [ ] **Step 1: Migración:**
```sql
alter table public.payments
  add column if not exists binance_prepay_id text,
  add column if not exists binance_merchant_trade_no text,
  add column if not exists binance_checkout_url text,
  add column if not exists paid_at timestamptz;
create unique index if not exists payments_binance_trade_no
  on public.payments (binance_merchant_trade_no) where binance_merchant_trade_no is not null;
```
- [ ] **Step 2:** Aplicar en Lovable Cloud / Supabase. Regenerar tipos si el flujo lo permite (no editar `types.ts` a mano).

---

### Task 6: Server functions Binance Pay

**Files:**
- Create: `src/lib/binancepay.functions.ts`
- Modify: `src/lib/schemas.ts` (`binancePayOrderSchema = z.object({ orderId: z.string().uuid() })`)

**Interfaces:**
- Consumes: `createBinanceOrder`, `queryBinanceOrder` (via `await import("@/lib/binance-pay.server")`), `activateOrderServices` (via `await import("@/lib/order-activation.server")`), `supabaseAdmin`.
- Produces:
  - `createBinancePayOrder({ orderId })` → `{ checkoutUrl, qrContent, deeplink, universalUrl }`
  - `verifyBinancePayOrder({ orderId })` → `{ status: "PAID"|"PENDING"|"CANCELED"|... , activated: boolean }`

- [ ] **Step 1: `createBinancePayOrder`** (middleware auth):
  - Cargar la orden del usuario (`context.supabase`, RLS asegura pertenencia) con su pago `pendiente`. Si no hay pago pendiente → error.
  - `merchantTradeNo = order_number.replace(/[^A-Za-z0-9]/g,"")` (único; ya lo es) — o `${order_number}-${Date.now()}` si se requiere reintentar. Guardar el usado.
  - Llamar `createBinanceOrder({ merchantTradeNo, amount: total, goodsName: "LoMaximoLeo "+kind, referenceGoodsId: order.id })`.
  - `update payments set provider='binance_pay', binance_prepay_id, binance_merchant_trade_no, binance_checkout_url where order_id=order.id and status='pendiente'` (usa `supabaseAdmin` o `context.supabase` con policy de cliente sobre su pago pendiente).
  - `audit_logs` action `binance_order_created`.
  - Devolver enlaces.
- [ ] **Step 2: `verifyBinancePayOrder`** (middleware auth; autoriza dueño **o** staff):
  - Cargar el pago por `orderId` con su `binance_merchant_trade_no`. Autorizar: `order.user_id === userId` o `is_staff`.
  - Si el pago ya está `aprobado` → devolver `{ status: "PAID", activated: false }` (idempotente).
  - `queryBinanceOrder(merchantTradeNo)`. Si `PAID`:
    - Cargar `supabaseAdmin`. `update payments set status='aprobado', paid_at=now(), reviewed_at=now() where id=payment.id and status='pendiente'` (guardo condicional). `update orders set status='pagada'`.
    - `await activateOrderServices(supabaseAdmin, order)`.
    - `audit_logs` action `binance_payment_confirmed`.
    - Devolver `{ status: "PAID", activated: true }`.
  - Si no, devolver `{ status, activated: false }`.
- [ ] **Step 3:** `npx tsc --noEmit` + `npx eslint .` — sin errores.

---

### Task 7: UI del método Binance Pay en `pago.$orderId.tsx`

**Files:**
- Modify: `src/routes/_authenticated/pago.$orderId.tsx`
- Modify: `src/lib/payment.ts` (metadata del método automático)
- Modify: `src/lib/status.ts` (`PAYMENT_PROVIDER_LABELS['binance_pay'] = "Binance Pay (automático)"`)

- [ ] **Step 1:** En el bloque `payment.status === "pendiente" && !payment.receipt_path`, envolver los dos métodos en un selector (tabs/segmented): **"Binance Pay (automático)"** y **"Comprobante manual"** (el actual).
- [ ] **Step 2: Método automático:** botón "Pagar con Binance Pay" → `useServerFn(createBinancePayOrder)`; al recibir `checkoutUrl`, `window.open(checkoutUrl, "_blank")` y mostrar el QR (`qrContent`) + estado "Esperando confirmación…" + botón "Ya pagué / Verificar". Un `useEffect` con `setInterval` (~4 s, con límite) llama `verifyBinancePayOrder`; si `status==="PAID"`, invalidar `["orden", orderId]` y `["portal"]`, toast de éxito, y la vista muestra el estado "aprobado" existente. Limpiar el intervalo al desmontar/confirmar.
- [ ] **Step 3:** Si `binancePayConfigured()` es falso en el servidor, `createBinancePayOrder` lanza "Binance Pay no está configurado"; la UI muestra ese error con toast y el usuario puede usar el método manual. (No exponer secretos; el chequeo real ocurre en servidor.)
- [ ] **Step 4:** `npx tsc --noEmit` + `npx eslint .` + `npx vite build` — sin errores.

---

### Task 8: `.env.example` + runbook de prueba

**Files:**
- Create/Modify: `.env.example` (añadir las 3 vars Binance, comentadas, SIN valores reales)
- Create: `docs/runbook-binance-pay.md`

- [ ] **Step 1:** Documentar en `.env.example`:
```
# Binance Pay Merchant (solo servidor — NO usar prefijo VITE_)
BINANCE_PAY_API_KEY=
BINANCE_PAY_API_SECRET=
BINANCE_PAY_BASE_URL=https://bpay.binanceapi.com
```
- [ ] **Step 2:** Runbook: cómo obtener credenciales de Binance Merchant, configurarlas como env de servidor en Lovable Cloud, probar una compra y una **renovación** hasta `PAID`, y verificar que el servicio queda activo/renovado. Incluir la sección "Webhook (futuro)" con el diseño pendiente de la API de rutas de servidor.

---

### Task 9: Verificación final

- [ ] `npm test` (firma + expiración) — PASA.
- [ ] `npx tsc --noEmit` — limpio.
- [ ] `npx eslint .` — limpio.
- [ ] `npx vite build` — build exitoso.

## Self-Review
- Cobertura spec: provider `binance_pay` ✓, columnas nuevas ✓, cliente firmado ✓, create/verify fns ✓, idempotencia ✓, refactor `activateOrderServices` compartido ✓, UI convivencia manual+auto ✓, renovación termina pagada ✓ (verify → activateOrderServices con `computeExpiration` de renovación), env server-only ✓, runbook + webhook documentado ✓.
- Placeholders: SQL, firma, fns y tests con código real; sin TODOs.
- Consistencia de tipos: `createBinancePayOrder`/`verifyBinancePayOrder`/`activateOrderServices`/`computeExpiration`/`buildSignature`/`queryBinanceOrder`/`createBinanceOrder` usados == definidos.
