-- =============================================================================
-- Leo Hub (LoMaximoLeo) — Esquema MySQL 8+
-- Para crear en tu hosting: phpMyAdmin -> tu base -> pestaña SQL -> pegar y ejecutar.
--
-- IMPORTANTE: esto es SOLO la base de datos (guarda los datos). El login, la
-- seguridad y la recuperación de contraseña los hace la APLICACIÓN (backend),
-- que se construye aparte. MySQL no autentica usuarios por sí mismo.
--
-- Convenciones:
--   * IDs: CHAR(36) (UUID) generados por la app.
--   * Contraseñas: se guarda SOLO el hash (bcrypt) en users.password_hash.
--     NUNCA se guarda la contraseña en texto plano.
--   * Booleanos: TINYINT(1) (0/1). Fechas: DATETIME/TIMESTAMP.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------ usuarios
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,            -- bcrypt; NULL hasta que se defina
  full_name VARCHAR(120) NOT NULL DEFAULT '',
  phone VARCHAR(30) NULL,
  document_number VARCHAR(30) NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,  -- fuerza cambio al entrar
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  role ENUM('admin','soporte','cliente') NOT NULL DEFAULT 'cliente',
  UNIQUE KEY uq_user_role (user_id, role),
  CONSTRAINT fk_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Recuperación de contraseña gestionada por el admin (sin SMTP):
-- el cliente solicita, aparece aquí y en las notificaciones del admin.
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  status ENUM('pendiente','resuelto','cancelado') NOT NULL DEFAULT 'pendiente',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_by CHAR(36) NULL,
  resolved_at DATETIME NULL,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------ catálogo
CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) NOT NULL PRIMARY KEY,
  category_id CHAR(36) NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  short_description VARCHAR(200) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  benefits JSON NULL,                          -- array de textos
  image_url VARCHAR(500) NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration_days INT NOT NULL DEFAULT 30,
  billing_label VARCHAR(30) NOT NULL DEFAULT 'mensual',
  stock INT NULL,                              -- NULL = ilimitado; 0 = agotado
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  support_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS coupons (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------ órdenes
CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  kind VARCHAR(20) NOT NULL DEFAULT 'compra',   -- compra | renovacion
  coupon_code VARCHAR(50) NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('pendiente','pagada','rechazada','cancelada') NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_services (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  product_id CHAR(36) NULL,
  order_item_id CHAR(36) NULL,
  service_reference VARCHAR(30) NOT NULL UNIQUE,
  status ENUM('pago_pendiente','activo','en_renovacion','suspendido','finalizado')
    NOT NULL DEFAULT 'pago_pendiente',
  start_date DATETIME NULL,
  expiration_date DATETIME NULL,               -- vencimiento (días que le quedan)
  profile_name VARCHAR(60) NULL,
  profile_pin VARCHAR(12) NULL,
  account_email VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cs_user (user_id),
  CONSTRAINT fk_cs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NULL,
  customer_service_id CHAR(36) NULL,
  service_name VARCHAR(120) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  duration_days INT NOT NULL DEFAULT 30,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  provider VARCHAR(30) NOT NULL DEFAULT 'binance_manual',
  transaction_reference VARCHAR(120) NULL,
  receipt_path VARCHAR(500) NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status ENUM('pendiente','aprobado','rechazado','reembolsado') NOT NULL DEFAULT 'pendiente',
  binance_prepay_id VARCHAR(120) NULL,
  binance_merchant_trade_no VARCHAR(64) NULL UNIQUE,
  binance_checkout_url VARCHAR(500) NULL,
  paid_at DATETIME NULL,
  reviewed_by CHAR(36) NULL,
  reviewed_at DATETIME NULL,
  rejection_reason VARCHAR(300) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------ soporte
CREATE TABLE IF NOT EXISTS support_tickets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  customer_service_id CHAR(36) NULL,
  ticket_number VARCHAR(30) NOT NULL UNIQUE,
  category ENUM('acceso','facturacion','renovacion','cambio_dispositivo','consulta','garantia','otro')
    NOT NULL DEFAULT 'consulta',
  priority ENUM('baja','media','alta') NOT NULL DEFAULT 'media',
  status ENUM('abierto','en_revision','en_espera','en_proceso','resuelto','cerrado')
    NOT NULL DEFAULT 'abierto',
  assigned_to CHAR(36) NULL,
  subject VARCHAR(140) NOT NULL,
  description TEXT NOT NULL,
  rating INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  CONSTRAINT fk_tk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ticket_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  ticket_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  message TEXT NOT NULL,
  is_internal_note TINYINT(1) NOT NULL DEFAULT 0,
  attachment_path VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tm_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS saved_replies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(80) NOT NULL,
  content TEXT NOT NULL,
  created_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------ varios
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'general',
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL,
  metadata JSON NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS service_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  customer_service_id CHAR(36) NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_se_cs FOREIGN KEY (customer_service_id) REFERENCES customer_services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NULL,
  action VARCHAR(60) NOT NULL,
  entity_type VARCHAR(60) NULL,
  entity_id VARCHAR(60) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------ agentes
CREATE TABLE IF NOT EXISTS client_agent_assignments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  client_id CHAR(36) NOT NULL,
  agent_id CHAR(36) NOT NULL,
  assigned_by CHAR(36) NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unassigned_at DATETIME NULL,
  unassigned_by CHAR(36) NULL,
  note VARCHAR(300) NULL,
  KEY idx_caa_client (client_id),
  CONSTRAINT fk_caa_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_caa_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Nota: "un solo agente ACTUAL por cliente" se controla en la aplicación
-- (MySQL no soporta índice único parcial como Postgres).

CREATE TABLE IF NOT EXISTS agent_interactions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  client_id CHAR(36) NOT NULL,
  agent_id CHAR(36) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'nota',
  summary VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ai_client (client_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- SEMILLA: categoría y catálogo real de streaming
-- =============================================================================
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
  (UUID(), 'Streaming', 'streaming', 'Películas, series y TV en la mejor calidad', 1);

-- Productos (usa el id de la categoría streaming)
SET @cat := (SELECT id FROM categories WHERE slug = 'streaming' LIMIT 1);
INSERT INTO products (id, category_id, name, slug, short_description, description, benefits, image_url, price, duration_days, billing_label, is_active, is_featured) VALUES
  (UUID(), @cat, 'Netflix Premium', 'netflix-premium', 'Series y películas en 4K, perfil con PIN.', 'Cuenta Netflix con perfil individual y PIN.', JSON_ARRAY('4K Ultra HD','Perfil con PIN','Sin anuncios'), '/images/products/netflix.jpg', 4.50, 30, 'mensual', 1, 1),
  (UUID(), @cat, 'Disney+ Premium', 'disney-plus-premium', 'Disney, Pixar, Marvel, Star Wars.', 'Cuenta Disney+ con perfil individual.', JSON_ARRAY('4K UHD','Perfil individual','Descargas offline'), '/images/products/disney.jpg', 3.75, 30, 'mensual', 1, 1),
  (UUID(), @cat, 'HBO Max', 'hbo-max', 'Estrenos, HBO Originals y Warner.', 'Cuenta HBO Max con perfil individual.', JSON_ARRAY('Full HD/4K','HBO Originals','Descargas'), '/images/products/hbomax.jpg', 3.50, 30, 'mensual', 1, 0),
  (UUID(), @cat, 'Prime Video', 'prime-video', 'Amazon Originals y cine.', 'Cuenta Prime Video con perfil individual.', JSON_ARRAY('Full HD/4K','Amazon Originals','Descargas'), '/images/products/primevideo.jpg', 3.25, 30, 'mensual', 1, 0),
  (UUID(), @cat, 'Paramount+', 'paramount-plus', 'Paramount, Nickelodeon y deportes.', 'Cuenta Paramount+ con perfil individual.', JSON_ARRAY('Full HD','Estrenos Paramount','Deportes'), '/images/products/paramount.jpg', 2.75, 30, 'mensual', 1, 0),
  (UUID(), @cat, 'ViX Premium', 'vix-premium', 'Cine y fútbol en español.', 'Cuenta ViX Premium con perfil individual.', JSON_ARRAY('Full HD','Contenido en español','Deportes'), '/images/products/vix.jpg', 2.50, 30, 'mensual', 1, 0),
  (UUID(), @cat, 'DirecTV GO', 'directv-go', 'TV en vivo, deportes y cine.', 'Cuenta DirecTV GO con perfil individual.', JSON_ARRAY('TV en vivo','Deportes','On demand'), '/images/products/directvgo.jpg', 6.00, 30, 'mensual', 1, 1),
  (UUID(), @cat, 'YouTube Premium', 'youtube-premium', 'Sin anuncios + YouTube Music.', 'Cuenta YouTube Premium.', JSON_ARRAY('Sin anuncios','Segundo plano','YouTube Music'), '/images/products/youtube.jpg', 3.50, 30, 'mensual', 1, 0),
  (UUID(), @cat, 'Spotify Premium', 'spotify-premium', 'Música sin anuncios y offline.', 'Cuenta Spotify Premium.', JSON_ARRAY('Sin anuncios','Alta calidad','Offline'), '/images/products/spotify.jpg', 3.50, 30, 'mensual', 1, 0),
  (UUID(), @cat, 'Win+', 'win-plus', 'Fútbol colombiano y deportes en vivo.', 'Cuenta Win+ (Win Sports+) con perfil individual.', JSON_ARRAY('Fútbol colombiano','Deportes en vivo','Multidispositivo'), '/images/products/winplus.jpg', 4.00, 30, 'mensual', 1, 1),
  (UUID(), @cat, 'Pack LoMaximoLeo', 'pack-lomaximoleo', 'Varias plataformas en un solo pack.', 'Combo de varias plataformas.', JSON_ARRAY('Varias plataformas','Mejor precio','Soporte'), '/images/products/combo.jpg', 15.99, 30, 'mensual', 1, 1);

-- =============================================================================
-- ADMIN: lemagal1712@gmail.com
-- El password_hash lo genera el backend (bcrypt) en el paso de instalación,
-- porque el hash debe coincidir con el algoritmo de la app. Aquí se crea el
-- usuario y su rol admin; la app pondrá la contraseña.
-- =============================================================================
SET @admin := UUID();
INSERT INTO users (id, email, full_name, must_change_password, email_verified)
  VALUES (@admin, 'lemagal1712@gmail.com', 'Leo (Admin)', 0, 1);
INSERT INTO user_roles (id, user_id, role) VALUES (UUID(), @admin, 'admin');
