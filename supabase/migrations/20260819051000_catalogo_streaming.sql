-- Catálogo real de cuentas de streaming. Reemplaza los productos genéricos de
-- streaming/música por las marcas reales que vende el negocio. Los productos se
-- insertan con stock = null (ilimitado); el admin fija el inventario por servicio.

-- Desactiva los genéricos de streaming/música reemplazados (no se borran para no
-- afectar órdenes históricas que los referencien).
update public.products set is_active = false
where slug in ('streammax-premium-4k', 'musicwave-premium');

insert into public.products
  (category_id, name, slug, short_description, description, benefits, image_url, price, duration_days, billing_label, is_active, is_featured)
values
  ((select id from public.categories where slug = 'streaming'),
   'Netflix Premium', 'netflix',
   'Series y películas en 4K Ultra HD, perfil individual.',
   'Cuenta Netflix con perfil individual protegido con PIN. Disfruta todo el catálogo en 4K Ultra HD con soporte y garantía durante tu suscripción.',
   array['Calidad 4K Ultra HD','Perfil individual con PIN','Sin anuncios','Descargas offline','Soporte y garantía'],
   '/images/products/netflix.jpg', 5.50, 30, 'mensual', true, true),

  ((select id from public.categories where slug = 'streaming'),
   'Disney+ Premium', 'disney-plus',
   'Disney, Pixar, Marvel, Star Wars y National Geographic.',
   'Cuenta Disney+ con perfil individual. Todo el universo Disney, Pixar, Marvel, Star Wars y más, en 4K y sin anuncios.',
   array['4K UHD + HDR','Perfil individual','Disney, Pixar, Marvel, Star Wars','Descargas offline','Soporte y garantía'],
   '/images/products/disney.jpg', 4.00, 30, 'mensual', true, true),

  ((select id from public.categories where slug = 'streaming'),
   'HBO Max Premium', 'hbo-max',
   'Estrenos de cine, HBO Originals y Warner en un solo lugar.',
   'Cuenta HBO Max (Max) con perfil individual. Estrenos, series HBO y todo el catálogo Warner en alta calidad.',
   array['Full HD / 4K','Perfil individual','HBO Originals y Warner','Descargas offline','Soporte y garantía'],
   '/images/products/hbomax.jpg', 4.50, 30, 'mensual', true, false),

  ((select id from public.categories where slug = 'streaming'),
   'Prime Video', 'prime-video',
   'Amazon Originals, cine y series exclusivas.',
   'Cuenta Prime Video con perfil individual. Amazon Originals, estrenos y un enorme catálogo de películas y series.',
   array['Full HD / 4K','Perfil individual','Amazon Originals','Descargas offline','Soporte y garantía'],
   '/images/products/primevideo.jpg', 3.50, 30, 'mensual', true, false),

  ((select id from public.categories where slug = 'streaming'),
   'Paramount+', 'paramount-plus',
   'Paramount, Nickelodeon, MTV y deportes en vivo.',
   'Cuenta Paramount+ con perfil individual. Cine de Paramount, series, Nickelodeon y eventos en vivo.',
   array['Full HD','Perfil individual','Estrenos Paramount','Nickelodeon y MTV','Soporte y garantía'],
   '/images/products/paramount.jpg', 3.00, 30, 'mensual', true, false),

  ((select id from public.categories where slug = 'streaming'),
   'ViX Premium', 'vix-premium',
   'Cine, series y fútbol en español, sin anuncios.',
   'Cuenta ViX Premium con perfil individual. Contenido en español, telenovelas, deportes en vivo y estrenos.',
   array['Full HD','Perfil individual','Contenido en español','Deportes en vivo','Soporte y garantía'],
   '/images/products/vix.jpg', 3.00, 30, 'mensual', true, false),

  ((select id from public.categories where slug = 'streaming'),
   'DirecTV GO', 'directv-go',
   'TV en vivo, deportes y cine on demand.',
   'Cuenta DirecTV GO con perfil individual. Canales en vivo, deportes, y catálogo on demand desde cualquier dispositivo.',
   array['TV en vivo','Perfil individual','Deportes en vivo','Cine on demand','Soporte y garantía'],
   '/images/products/directvgo.jpg', 6.00, 30, 'mensual', true, true),

  ((select id from public.categories where slug = 'streaming'),
   'YouTube Premium', 'youtube-premium',
   'YouTube sin anuncios + YouTube Music incluido.',
   'Cuenta YouTube Premium: videos sin anuncios, reproducción en segundo plano, descargas y YouTube Music incluido.',
   array['Sin anuncios','Reproducción en segundo plano','Descargas offline','YouTube Music incluido','Soporte y garantía'],
   '/images/products/youtube.jpg', 3.50, 30, 'mensual', true, false),

  ((select id from public.categories where slug = 'musica'),
   'Spotify Premium', 'spotify-premium',
   'Música sin anuncios, offline y en alta calidad.',
   'Cuenta Spotify Premium con perfil individual. Millones de canciones sin anuncios, descargas y audio de alta calidad.',
   array['Sin anuncios','Audio de alta calidad','Descargas offline','Saltos ilimitados','Soporte y garantía'],
   '/images/products/spotify.jpg', 3.50, 30, 'mensual', true, false),

  ((select id from public.categories where slug = 'streaming'),
   'Pack Combo Streaming', 'pack-combo',
   'Varias plataformas en un solo pack, al mejor precio.',
   'Combo de varias plataformas de streaming (a elegir) en una sola compra, con el mejor precio y soporte unificado.',
   array['Varias plataformas','Mejor precio combinado','Perfiles individuales','Soporte prioritario','Garantía en todas'],
   '/images/products/combo.jpg', 12.00, 30, 'mensual', true, true)
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  benefits = excluded.benefits,
  image_url = excluded.image_url,
  price = excluded.price,
  duration_days = excluded.duration_days,
  billing_label = excluded.billing_label,
  is_active = excluded.is_active,
  is_featured = excluded.is_featured;
