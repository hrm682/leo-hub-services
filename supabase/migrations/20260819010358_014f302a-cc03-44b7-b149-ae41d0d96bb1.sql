alter table public.customer_services
  add column if not exists profile_name text,
  add column if not exists profile_pin text,
  add column if not exists account_email text;

comment on column public.customer_services.profile_name is 'Nombre del perfil privado asignado dentro de la cuenta de streaming';
comment on column public.customer_services.profile_pin is 'PIN del perfil privado (visible solo para el dueño y el staff)';
comment on column public.customer_services.account_email is 'Correo identificador de la cuenta de streaming donde vive el perfil';

-- Datos iniciales: asignar perfil y PIN a los servicios existentes
with numbered as (
  select cs.id, p.slug,
         row_number() over (partition by cs.product_id order by cs.created_at) as rn
  from public.customer_services cs
  left join public.products p on p.id = cs.product_id
)
update public.customer_services cs
set profile_name = 'Perfil ' || (((n.rn - 1) % 5) + 1),
    profile_pin = lpad(floor(random() * 9000 + 1000)::text, 4, '0'),
    account_email = 'lml.' || coalesce(split_part(n.slug, '-', 1), 'cuenta') || lpad((((n.rn - 1) / 5) + 1)::text, 2, '0') || '@lomaximoleo.ec'
from numbered n
where cs.id = n.id and cs.profile_name is null;