# Runbook — Pago automático con Binance Pay

Cómo poner en marcha y probar el cobro automático con Binance Pay (USDT) que
activa/renueva servicios sin comprobante manual.

## 1. Credenciales (una sola vez)

1. Consigue una cuenta de **Binance Merchant** y habilita **Binance Pay**
   (requiere verificación de negocio / KYB).
2. En el portal de Merchant, crea una **API Key** y su **Secret**.
3. Configúralas como **variables de entorno de servidor** en Lovable Cloud
   (Project → Settings → Environment). **Sin** prefijo `VITE_`:
   - `BINANCE_PAY_API_KEY`
   - `BINANCE_PAY_API_SECRET`
   - `BINANCE_PAY_BASE_URL` → URL de **sandbox** para probar; en producción
     `https://bpay.binanceapi.com`.

> Si estas variables faltan, la app no se rompe: el checkout sigue ofreciendo el
> pago manual por comprobante y el botón automático muestra
> "Binance Pay no está configurado".

## 2. Aplicar migraciones

Aplica las migraciones nuevas (Lovable las corre al desplegar, o `supabase db push`):
- `supabase/migrations/20260819041000_binance_pay.sql` — columnas `binance_*` y `paid_at` en `payments`.
- `supabase/migrations/20260819040000_agentes.sql` — panel de agentes (independiente).

## 3. Probar una compra

1. Inicia sesión como cliente, añade un servicio al carrito y ve a **Checkout**.
2. Confirma la orden → te lleva a `/pago/$orderId`.
3. Pestaña **"Binance Pay (automático)"** → **"Pagar con Binance Pay"**.
   Se abre la pasarela de Binance en otra pestaña (o escanea el QR).
4. Completa el pago en el sandbox de Binance.
5. Vuelve a la pestaña de Leo Hub: el sondeo automático (cada ~4 s) o el botón
   **"Ya pagué / Verificar"** confirma el pago; la orden pasa a **pagada** y el
   servicio a **activo** al instante.

## 4. Probar una RENOVACIÓN (que termine pagada)

1. Con un servicio **activo**, en el portal usa **Renovar** → crea una orden
   `renovacion` y te lleva a `/pago/$orderId`.
2. Paga con Binance Pay igual que arriba.
3. Al confirmarse: la orden queda **pagada**, el servicio vuelve a **activo** y su
   **vencimiento se extiende** desde la fecha de vencimiento vigente
   (lógica compartida `computeExpiration`/`activateOrderServices`, la misma que
   usa la aprobación manual del admin).

## 5. Notas de diseño

- **Moneda:** las órdenes están en USD; Binance Pay cobra en USDT con
  `orderAmount = total` (1 USDT ≈ 1 USD). Ajusta si necesitas conversión real.
- **Idempotencia:** la activación solo corre en la transición
  `pendiente → aprobado` (update condicional que devuelve fila), así que verificar
  dos veces no duplica activaciones ni notificaciones.
- **Staff:** `verifyBinancePayOrder` también puede ejecutarla el equipo, útil si
  un cliente pagó pero no volvió al navegador (verificación forzada).

## 6. Webhook (endurecimiento futuro, fuera del alcance actual)

Hoy la confirmación es por **verificación/sondeo**, que cubre el flujo completo.
Para producción de alto volumen conviene además un **webhook** de Binance
(`PAY_SUCCESS`) como fuente de verdad:

- Verificar la firma con `verifyWebhookSignature` (RSA/HMAC según config Binance).
- Ubicar el pago por `binance_merchant_trade_no`.
- Si es `PAY_SUCCESS`, llamar al mismo helper `activateOrderServices`
  (idempotente) con `supabaseAdmin`.
- Responder el ACK `{ "returnCode": "SUCCESS", "returnMessage": null }`.

No se implementó ahora porque la versión instalada de TanStack Start (1.168) no
expone una API estable de rutas de servidor/API para montar el endpoint de forma
confiable. Al fijar esa API (o mover el webhook a una función Edge de Supabase),
añadir el endpoint es directo reutilizando el helper compartido.
