-- Inventario de productos: stock por servicio.
--   stock = null  -> ilimitado (no se controla inventario)
--   stock = 0     -> AGOTADO (no se puede comprar)
--   stock = N > 0 -> N unidades disponibles
-- El stock baja automáticamente al confirmarse el pago de una COMPRA (no en
-- renovaciones). El admin también puede fijarlo o poner 0 para "Agotado".

alter table public.products
  add column if not exists stock integer;

-- Descuento atómico de stock (evita condiciones de carrera). No baja de 0 ni
-- afecta productos con stock ilimitado (null).
create or replace function public.decrement_product_stock(_product_id uuid, _qty int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products
  set stock = greatest(stock - _qty, 0)
  where id = _product_id and stock is not null;
$$;

grant execute on function public.decrement_product_stock(uuid, int) to authenticated, service_role;
