-- Completa el catálogo con los servicios de streaming que faltaban
-- (DirecTV GO, YouTube Premium, Spotify), SIN tocar ni duplicar los productos
-- que ya existen en la base. `on conflict (slug) do nothing` lo hace idempotente.
-- Categoría: 'streaming' (la única activa). El admin puede recategorizar/editar.

insert into public.products
  (category_id, name, slug, short_description, description, benefits, image_url, price, duration_days, billing_label, is_active, is_featured)
values
  ((select id from public.categories where slug = 'streaming'),
   'DirecTV GO', 'directv-go',
   'TV en vivo, deportes y cine on demand.',
   'Cuenta DirecTV GO con perfil individual. Canales en vivo, deportes y catálogo on demand desde cualquier dispositivo.',
   array['TV en vivo','Perfil individual','Deportes en vivo','Cine on demand','Garantía durante toda la suscripción'],
   '/images/products/directvgo.jpg', 6.00, 30, 'mensual', true, true),

  ((select id from public.categories where slug = 'streaming'),
   'YouTube Premium', 'youtube-premium',
   'YouTube sin anuncios + YouTube Music incluido.',
   'Cuenta YouTube Premium: videos sin anuncios, reproducción en segundo plano, descargas y YouTube Music incluido.',
   array['Sin anuncios','Reproducción en segundo plano','Descargas offline','YouTube Music incluido','Garantía durante toda la suscripción'],
   '/images/products/youtube.jpg', 3.50, 30, 'mensual', true, false),

  ((select id from public.categories where slug = 'streaming'),
   'Spotify Premium', 'spotify-premium',
   'Música sin anuncios, offline y en alta calidad.',
   'Cuenta Spotify Premium con perfil individual. Millones de canciones sin anuncios, descargas y audio de alta calidad.',
   array['Sin anuncios','Audio de alta calidad','Descargas offline','Saltos ilimitados','Garantía durante toda la suscripción'],
   '/images/products/spotify.jpg', 3.50, 30, 'mensual', true, false),

  ((select id from public.categories where slug = 'streaming'),
   'Win+', 'win-plus',
   'Fútbol colombiano y deportes en vivo, sin caídas.',
   'Cuenta Win+ (Win Sports+) con perfil individual. Todo el fútbol profesional colombiano y deportes en vivo desde cualquier dispositivo.',
   array['Fútbol colombiano en vivo','Perfil individual','Deportes en directo','Multidispositivo','Garantía durante toda la suscripción'],
   '/images/products/winplus.jpg', 4.00, 30, 'mensual', true, true)
on conflict (slug) do nothing;
