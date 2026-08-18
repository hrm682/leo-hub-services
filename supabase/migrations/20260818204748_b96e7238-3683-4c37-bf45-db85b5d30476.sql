create type public.app_role as enum ('admin', 'soporte', 'cliente');
create type public.order_status as enum ('pendiente', 'pagada', 'rechazada', 'cancelada');
create type public.payment_status as enum ('pendiente', 'aprobado', 'rechazado', 'reembolsado');
create type public.service_status as enum ('pago_pendiente', 'activo', 'en_renovacion', 'suspendido', 'finalizado');
create type public.ticket_status as enum ('abierto', 'en_revision', 'en_espera', 'en_proceso', 'resuelto', 'cerrado');
create type public.ticket_priority as enum ('baja', 'media', 'alta');
create type public.ticket_category as enum ('acceso', 'facturacion', 'renovacion', 'cambio_dispositivo', 'consulta', 'otro');

create or replace function public.update_updated_at_column()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql set search_path = public;

create sequence public.order_number_seq start 1;
create sequence public.ticket_number_seq start 1;
create sequence public.service_number_seq start 1;
grant usage on all sequences in schema public to authenticated;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','soporte'))
$$;

create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  document_number text,
  notification_prefs jsonb not null default '{"email": true, "whatsapp": false, "push": false, "in_app": true}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "read own profile or staff" on public.profiles for select to authenticated using (auth.uid() = id or public.is_staff(auth.uid()));
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "update own profile or admin" on public.profiles for update to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin')) with check (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create trigger profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.raw_user_meta_data->>'phone');
  insert into public.user_roles (user_id, role) values (new.id, 'cliente');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public read active categories" on public.categories for select to anon, authenticated using (is_active);
create policy "admins manage categories" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text not null default '',
  description text not null default '',
  benefits text[] not null default '{}',
  image_url text,
  price numeric(10,2) not null default 0,
  duration_days int not null default 30,
  billing_label text not null default 'mensual',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  support_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read active products" on public.products for select to anon, authenticated using (is_active);
create policy "admins manage products" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger products_updated_at before update on public.products for each row execute function public.update_updated_at_column();

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_percent numeric(5,2) not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.coupons to authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "authenticated read active coupons" on public.coupons for select to authenticated using (is_active and (expires_at is null or expires_at > now()));
create policy "admins manage coupons" on public.coupons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  order_number text not null unique default ('LH-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  kind text not null default 'compra',
  coupon_code text,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status public.order_status not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "read own orders or staff" on public.orders for select to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "insert own orders" on public.orders for insert to authenticated with check (auth.uid() = user_id);
create policy "staff update orders" on public.orders for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger orders_updated_at before update on public.orders for each row execute function public.update_updated_at_column();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  customer_service_id uuid,
  service_name text not null,
  unit_price numeric(10,2) not null,
  quantity int not null default 1,
  duration_days int not null default 30,
  created_at timestamptz not null default now()
);
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "read own order items or staff" on public.order_items for select to authenticated using (public.is_staff(auth.uid()) or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "insert own order items" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create table public.customer_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid references public.products(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  service_reference text not null unique default ('SRV-' || lpad(nextval('public.service_number_seq')::text, 6, '0')),
  status public.service_status not null default 'pago_pendiente',
  start_date timestamptz,
  expiration_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.customer_services to authenticated;
grant all on public.customer_services to service_role;
alter table public.customer_services enable row level security;
create policy "read own services or staff" on public.customer_services for select to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "insert own services" on public.customer_services for insert to authenticated with check (auth.uid() = user_id);
create policy "staff update services" on public.customer_services for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger customer_services_updated_at before update on public.customer_services for each row execute function public.update_updated_at_column();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  provider text not null default 'binance_manual',
  transaction_reference text,
  receipt_path text,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  status public.payment_status not null default 'pendiente',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "read own payments or staff" on public.payments for select to authenticated using (public.is_staff(auth.uid()) or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "insert own payments" on public.payments for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "client attaches receipt to own pending payment" on public.payments for update to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()) and status = 'pendiente') with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "staff review payments" on public.payments for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger payments_updated_at before update on public.payments for each row execute function public.update_updated_at_column();

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  customer_service_id uuid references public.customer_services(id) on delete set null,
  ticket_number text not null unique default ('TK-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0')),
  category public.ticket_category not null default 'consulta',
  priority public.ticket_priority not null default 'media',
  status public.ticket_status not null default 'abierto',
  assigned_to uuid,
  subject text not null,
  description text not null,
  rating int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
grant select, insert, update on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;
alter table public.support_tickets enable row level security;
create policy "read own tickets or staff" on public.support_tickets for select to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "insert tickets for own active services" on public.support_tickets for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.customer_services cs where cs.id = customer_service_id and cs.user_id = auth.uid() and cs.status in ('activo','en_renovacion')));
create policy "update own ticket or staff" on public.support_tickets for update to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid())) with check (auth.uid() = user_id or public.is_staff(auth.uid()));
create trigger support_tickets_updated_at before update on public.support_tickets for each row execute function public.update_updated_at_column();

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.support_tickets(id) on delete cascade not null,
  sender_id uuid not null,
  message text not null,
  is_internal_note boolean not null default false,
  attachment_path text,
  created_at timestamptz not null default now()
);
grant select, insert on public.ticket_messages to authenticated;
grant all on public.ticket_messages to service_role;
alter table public.ticket_messages enable row level security;
create policy "read ticket messages" on public.ticket_messages for select to authenticated using (public.is_staff(auth.uid()) or (not is_internal_note and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())));
create policy "insert ticket messages" on public.ticket_messages for insert to authenticated with check (public.is_staff(auth.uid()) or (sender_id = auth.uid() and not is_internal_note and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null default 'general',
  title text not null,
  content text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "read own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "insert own or staff notifications" on public.notifications for insert to authenticated with check (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "update own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "admins read audit logs" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "insert own audit events" on public.audit_logs for insert to authenticated with check (user_id = auth.uid());

create table public.service_events (
  id uuid primary key default gen_random_uuid(),
  customer_service_id uuid references public.customer_services(id) on delete cascade not null,
  event_type text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert on public.service_events to authenticated;
grant all on public.service_events to service_role;
alter table public.service_events enable row level security;
create policy "read own service events or staff" on public.service_events for select to authenticated using (public.is_staff(auth.uid()) or exists (select 1 from public.customer_services cs where cs.id = customer_service_id and cs.user_id = auth.uid()));
create policy "insert own service events or staff" on public.service_events for insert to authenticated with check (public.is_staff(auth.uid()) or exists (select 1 from public.customer_services cs where cs.id = customer_service_id and cs.user_id = auth.uid()));

create policy "users upload own receipts" on storage.objects for insert to authenticated with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own receipts or staff" on storage.objects for select to authenticated using (bucket_id = 'comprobantes' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff(auth.uid())));
create policy "users upload own attachments" on storage.objects for insert to authenticated with check (bucket_id = 'adjuntos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own attachments or staff" on storage.objects for select to authenticated using (bucket_id = 'adjuntos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff(auth.uid())));

insert into public.categories (name, slug, description, sort_order) values
  ('Streaming', 'streaming', 'Películas, series y TV en la mejor calidad', 1),
  ('Música', 'musica', 'Millones de canciones sin anuncios', 2),
  ('Seguridad y VPN', 'seguridad', 'Protege tu navegación y tus dispositivos', 3),
  ('Productividad', 'productividad', 'Herramientas de oficina y diseño profesional', 4),
  ('Nube', 'nube', 'Almacenamiento seguro para tus archivos', 5),
  ('Gaming', 'gaming', 'Suscripciones y pases para gamers', 6);

insert into public.products (category_id, name, slug, short_description, description, benefits, image_url, price, duration_days, billing_label, is_featured) values
  ((select id from public.categories where slug='streaming'), 'StreamMax Premium 4K', 'streammax-premium-4k', 'Películas y series en 4K Ultra HD, hasta 4 pantallas.', 'Disfruta del catálogo completo de películas, series y documentales en calidad 4K Ultra HD. Ideal para toda la familia, con perfiles individuales y control parental.', array['Calidad 4K Ultra HD + HDR','4 pantallas simultáneas','Sin anuncios','Descargas para ver offline','Perfiles individuales'], '/images/products/streaming.jpg', 8.99, 30, 'mensual', true),
  ((select id from public.categories where slug='musica'), 'MusicWave Premium', 'musicwave-premium', 'Música ilimitada sin anuncios, en todos tus dispositivos.', 'Escucha más de 100 millones de canciones sin interrupciones, con audio de alta fidelidad y listas personalizadas.', array['Sin anuncios','Audio de alta fidelidad','Descargas offline','Letras sincronizadas','Hasta 6 dispositivos'], '/images/products/musica.jpg', 5.99, 30, 'mensual', false),
  ((select id from public.categories where slug='seguridad'), 'VPN Shield Pro', 'vpn-shield-pro', 'Navega protegido y sin límites geográficos.', 'Conexión cifrada de grado militar en más de 90 países. Protege tu identidad en redes públicas y accede a contenido global.', array['Cifrado AES-256','90+ países disponibles','Sin registro de actividad','10 dispositivos simultáneos','Interruptor de seguridad'], '/images/products/vpn.jpg', 4.99, 30, 'mensual', true),
  ((select id from public.categories where slug='seguridad'), 'TotalGuard Antivirus', 'totalguard-antivirus', 'Protección total contra virus, ransomware y phishing.', 'Suite de seguridad completa con protección en tiempo real, firewall inteligente y gestor de contraseñas para hasta 5 dispositivos.', array['Protección en tiempo real','Anti-ransomware','Firewall inteligente','Gestor de contraseñas','5 dispositivos'], '/images/products/antivirus.jpg', 29.99, 365, 'anual', false),
  ((select id from public.categories where slug='productividad'), 'OfficeSuite Pro', 'officesuite-pro', 'Documentos, hojas de cálculo y presentaciones profesionales.', 'Suite ofimática completa con edición colaborativa en tiempo real, 1 TB de almacenamiento y versiones para todos tus dispositivos.', array['Word, Excel y PowerPoint compatible','1 TB en la nube incluido','Colaboración en tiempo real','5 dispositivos','Actualizaciones incluidas'], '/images/products/ofimatica.jpg', 49.99, 365, 'anual', false),
  ((select id from public.categories where slug='productividad'), 'DesignPro Creative', 'designpro-creative', 'Diseño gráfico y edición profesional sin límites.', 'Herramientas profesionales de diseño, ilustración y edición de imágenes con miles de plantillas premium incluidas.', array['Editor vectorial y de fotos','10,000+ plantillas premium','Fuentes y recursos ilimitados','Exportación en alta resolución','2 dispositivos'], '/images/products/diseno.jpg', 19.99, 30, 'mensual', false),
  ((select id from public.categories where slug='nube'), 'CloudBox 2TB', 'cloudbox-2tb', '2 TB de almacenamiento seguro con respaldo automático.', 'Guarda, sincroniza y comparte tus archivos con cifrado de extremo a extremo y respaldo automático de todos tus dispositivos.', array['2 TB de almacenamiento','Cifrado extremo a extremo','Respaldo automático','Historial de versiones 180 días','Compartir con enlaces protegidos'], '/images/products/nube.jpg', 9.99, 30, 'mensual', false),
  ((select id from public.categories where slug='gaming'), 'GamePass Ultimate', 'gamepass-ultimate', 'Más de 400 juegos en consola, PC y nube.', 'Biblioteca rotativa de más de 400 títulos, estrenos el día de lanzamiento, modo nube incluido y recompensas mensuales.', array['400+ juegos incluidos','Estrenos día uno','Juego en la nube','Recompensas mensuales','Multijugador online'], '/images/products/gaming.jpg', 10.99, 30, 'mensual', true);

insert into public.coupons (code, description, discount_percent, is_active) values
  ('BIENVENIDO10', 'Descuento de bienvenida: 10% en tu primera compra', 10, true);