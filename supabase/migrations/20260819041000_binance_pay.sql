-- Pago automático con Binance Pay: columnas para rastrear la orden de la
-- pasarela dentro de la tabla de pagos. El proveedor 'binance_pay' convive con
-- el 'binance_manual' (comprobante) existente.

alter table public.payments
  add column if not exists binance_prepay_id text,
  add column if not exists binance_merchant_trade_no text,
  add column if not exists binance_checkout_url text,
  add column if not exists paid_at timestamptz;

-- Evita duplicar la referencia de la orden de Binance.
create unique index if not exists payments_binance_trade_no
  on public.payments (binance_merchant_trade_no)
  where binance_merchant_trade_no is not null;
