# Leo Hub — Pago automático Binance Pay + Panel de Agentes

Fecha: 2026-08-18
Estado: aprobado (diseño) — pendiente de plan de implementación

## Contexto

Leo Hub (LoMaximoLeo) es una plataforma de venta/gestión de cuentas de streaming
sobre TanStack Start v1 (React 19 + SSR), Vite 7, Tailwind v4, Supabase (Lovable Cloud).

Hoy el checkout usa **pago manual Binance** (el cliente sube un comprobante y un
admin aprueba). Se quiere:

1. **Pago automático con Binance Pay (cripto/USDT)** vía su Merchant API, de modo que
   una compra o renovación quede `pagada` y el servicio se active/renueve **sin
   intervención manual**. El método manual sigue existiendo (convivencia).
2. Un panel **`/admin/agentes`** que asigne un **agente de soporte principal** por
   cliente, con **historial de interacción**.

Restricciones del repo: no editar `src/integrations/supabase/` ni `src/routeTree.gen.ts`.
Server functions en `src/lib/*.functions.ts`. Rutas en `src/routes/`.

## Branding Lovable

Verificado: favicon e íconos ya son el león de LoMaximoLeo; sin badge "Made with
Lovable". Las referencias a `lovable` restantes son infraestructura de backend
(auth SDK, error reporting, vite config) en `src/integrations/` — no son
logos/favicons y no se tocan (romperían el login). Nada que hacer aquí.

## Parte 1 — Pago automático con Binance Pay

### Mecanismo de confirmación
**Verificación-al-volver + sondeo** (decisión revisada tras verificar el stack):
- La versión instalada de TanStack Start (1.168) no expone una API estable de
  rutas de servidor/API para montar un webhook confiable (solo `createServerFn`).
  Construir un webhook sería frágil. Por eso:
- **`verifyBinancePayOrder`** consulta el estado real a Binance y activa si `PAID`.
  Es **idempotente**. La página de pago la sondea cada ~4 s mientras hay una
  orden Binance activa, y expone un botón **"Verificar pago"**.
- `verifyBinancePayOrder` es invocable por el **dueño de la orden y por staff**,
  de modo que un admin puede forzar la verificación si el cliente nunca vuelve.
- El **webhook** (`PAY_SUCCESS` como fuente de verdad) queda **documentado en el
  runbook como endurecimiento de producción**, a implementar cuando se fije la
  API de rutas de servidor del framework. No se implementa ahora.

### Cambios de datos (nueva migración)
Sobre `public.payments`:
- `binance_prepay_id text`
- `binance_merchant_trade_no text` (único)
- `binance_checkout_url text`
- `paid_at timestamptz`
- nuevo valor lógico de `provider`: `'binance_pay'` (el manual sigue `'binance_manual'`).

No se cambian políticas RLS de `payments`: el webhook y las funciones de
activación corren con privilegios de servidor (service role / server fn con
middleware de auth existente). El helper de activación se ejecuta desde una
server function autenticada del cliente (verificar) o desde el webhook (server).

### Refactor puntual
Extraer de `reviewPayment` (en `src/lib/admin.functions.ts`) la lógica
"aprobar → activar/renovar servicios + eventos + notificación" a un helper
reutilizable **`activateOrderServices(supabase, order, opts)`** en un módulo
server-only nuevo `src/lib/order-activation.server.ts`. Debe ser **idempotente**:
si el pago ya está `aprobado`/la orden ya `pagada`, no reactiva ni duplica
eventos/notificaciones. `reviewPayment` pasa a usar este helper.

### Cliente Binance Pay
`src/lib/binance-pay.server.ts` (solo servidor, sin dependencias nuevas, usa
`node:crypto`):
- Firma HMAC-SHA512 con headers `BinancePay-Timestamp`, `BinancePay-Nonce`,
  `BinancePay-Certificate-SN`, `BinancePay-Signature`.
- Lee env de servidor (sin prefijo `VITE_`): `BINANCE_PAY_API_KEY`,
  `BINANCE_PAY_API_SECRET`, `BINANCE_PAY_BASE_URL` (sandbox vs prod),
  `BINANCE_PAY_WEBHOOK_ENABLED` (opcional).
- Métodos: `createOrder(payload)`, `queryOrder(merchantTradeNo)`,
  `verifyWebhookSignature(headers, body)`.
- Si faltan credenciales, lanza un error claro ("Binance Pay no está
  configurado") — nunca expone secretos al cliente.

### Server functions (`src/lib/binancepay.functions.ts`)
- `createBinancePayOrder({ orderId })`: valida que la orden es del usuario y que
  su pago está `pendiente`; genera `merchantTradeNo`; llama a Binance `create
  order`; guarda `binance_prepay_id`, `binance_merchant_trade_no`,
  `binance_checkout_url` y fija `provider='binance_pay'`; devuelve
  `{ checkoutUrl, qrContent, deeplink, universalUrl }`.
- `verifyBinancePayOrder({ orderId })`: consulta a Binance; si `PAID`, llama a
  `activateOrderServices` (idempotente) y marca el pago `aprobado`+`paid_at`;
  devuelve `{ status }`. Autorizada para el dueño de la orden **o** staff.

### Webhook (futuro, no en este alcance)
Documentado en el runbook: cuando el framework fije su API de rutas de servidor,
añadir un endpoint que verifique firma con `verifyWebhookSignature`, ubique el
pago por `binance_merchant_trade_no` y, si es `PAY_SUCCESS`, llame a
`activateOrderServices` (mismo helper idempotente). Por ahora la confirmación es
por verificación/sondeo, que cubre el flujo completo.

### UI (`src/routes/_authenticated/pago.$orderId.tsx`)
Cuando el pago está `pendiente` y sin comprobante, mostrar **dos métodos**:
1. **Binance Pay (automático)**: botón "Pagar con Binance Pay" → llama a
   `createBinancePayOrder`, abre `checkoutUrl` (nueva pestaña) y muestra QR +
   botón "Ya pagué / Verificar" (que llama a `verifyBinancePayOrder`, con
   sondeo ligero). Al confirmarse, invalida queries y muestra el estado
   "aprobado" existente.
2. **Comprobante manual** (flujo actual, intacto).

`src/lib/payment.ts` conserva las constantes del método manual; se añade
metadata del método automático (etiquetas/pasos).

## Parte 2 — `/admin/agentes`

### Modelo
Un **agente principal por cliente** con historial de reasignaciones.

### Cambios de datos (misma o nueva migración)
- `public.client_agent_assignments`:
  `id`, `client_id` (→ profiles.id), `agent_id` (→ auth.users, staff),
  `assigned_by`, `assigned_at`, `unassigned_at`, `unassigned_by`, `note`.
  "Actual" = `unassigned_at IS NULL`. Índice **único parcial** sobre
  `(client_id) where unassigned_at is null` ⇒ un solo agente actual por cliente.
- `public.agent_interactions`:
  `id`, `client_id`, `agent_id`, `type` (`nota`|`llamada`|`seguimiento`|`reasignacion`),
  `summary`, `created_at`.
- RLS: `is_staff` puede leer ambas; solo `admin` puede insertar/cerrar
  asignaciones; staff puede insertar `agent_interactions`. GRANTs coherentes con
  el resto del esquema.

### Server functions (`src/lib/agents.functions.ts`)
- `listAgentsOverview` (staff): agentes (usuarios con rol admin/soporte) con
  conteo de clientes asignados; total de clientes sin agente.
- `listClientAssignments` (staff): clientes con su agente actual, nº de
  servicios activos y tickets abiertos.
- `assignAgentToClient({ clientId, agentId })` (admin): cierra la asignación
  actual (`unassigned_at=now`), inserta la nueva, registra interacción
  `reasignacion`, audita, notifica al cliente opcionalmente NO (interno).
- `unassignAgent({ clientId })` (admin).
- `getClientInteractionHistory({ clientId })` (staff): timeline unificado y
  ordenado por fecha desc que agrega: asignaciones/reasignaciones, tickets (con
  estado), últimos mensajes de ticket, interacciones manuales, eventos de
  servicio.
- `logAgentInteraction({ clientId, type, summary })` (staff): inserta en
  `agent_interactions`.

### UI
- `src/routes/_authenticated/admin.agentes.tsx`: tabla de clientes con agente
  actual + selector para asignar/reasignar (solo-admin habilitado); panel con el
  **timeline** del cliente seleccionado; formulario para añadir nota/interacción.
- Añadir ítem **"Agentes"** al `NAV_ITEMS` de `AdminShell` (visible a staff).

## Verificación
- `bun run lint` y build sin errores; typecheck limpio.
- Tests unitarios: utilidad de firma de Binance (determinismo de la firma con
  input conocido) y el helper de activación (idempotencia y cálculo de fechas de
  renovación).
- E2E de pago: **runbook** manual con credenciales sandbox del usuario (no
  ejecutable en este entorno).

## Requisitos / límites conocidos
- Requiere credenciales **Binance Pay Merchant** (API key/secret) como env de
  **servidor** en Lovable Cloud, y registrar la URL del webhook en el portal de
  Binance.
- No se puede ejecutar la transacción sandbox real desde el entorno de
  desarrollo del agente; se entrega código + runbook.
- No editar `src/integrations/**` ni `src/routeTree.gen.ts`.
