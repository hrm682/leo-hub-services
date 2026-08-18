# Leo Hub — Fase 1: Portal Premium del Cliente

## Resumen

Construir **Leo Hub**, un portal web premium (mobile-first, modo oscuro) para vender y gestionar servicios digitales: catálogo, compra, renovaciones, comprobantes, tickets de soporte y notificaciones. Todo en español, con datos de demostración realistas y sin manejar jamás credenciales de terceros.

**Decisiones confirmadas:**
- **Alcance:** por fases — primero la experiencia del cliente (con un admin operativo mínimo para aprobar pagos y responder tickets). El panel administrativo completo llega en Fase 2.
- **Pagos:** pago manual vía **Binance ID** — el cliente paga al Binance ID del negocio, sube su comprobante en el checkout y un admin aprueba. Arquitectura de proveedores modular, **lista para Payphone** después.
- **Hosting:** web hosting gestionado — se publica en Lovable (HTTPS, backups y despliegue automático incluidos) y se apunta tu dominio propio (ej. `hub.tudominio.com`). Banahosting compartido (cPanel) no puede correr esta tecnología; un VPS sería una adaptación posterior.

## Lo que se construye en Fase 1

### 1. Base y seguridad (Lovable Cloud)
- Base de datos PostgreSQL con todas las entidades: perfiles, roles (cliente, soporte, admin) en tabla separada, categorías, productos, órdenes, ítems, servicios del cliente, pagos, cupones, tickets, mensajes, notificaciones y bitácora de auditoría.
- Seguridad por filas (RLS) en todas las tablas: cada cliente solo ve lo suyo.
- Almacenamiento seguro para comprobantes de pago.
- Registro con verificación de correo, inicio/cierre de sesión y **recuperación de contraseña exclusiva de Leo Hub** (enlace de un solo uso, sin revelar si el correo existe).
- Validación de formularios en cliente y servidor (zod), bitácora de eventos críticos (pagos, cambios de estado, accesos admin).
- Regla visible en toda la app: Leo Hub nunca solicita contraseñas ni códigos de servicios externos.

### 2. Marca y diseño
- Logo de **león geométrico minimalista** con la “L” integrada (versión principal, monocromática e isotipo/favicon), generado como recurso del proyecto.
- Sistema de diseño: fondo azul noche/grafito, **dorado eléctrico** como color premium, glassmorphism ligero, tarjetas con bordes suaves, tipografía moderna, animaciones cortas y funcionales.
- Estados de servicio: verde (activo), ámbar (1–7 días), rojo (vencido), azul (en proceso).
- PWA básica: instalable con ícono y nombre propios.

### 3. Sitio público
- **Landing** de alto impacto: hero con el león, “Gestiona tus servicios digitales sin complicaciones”, botones “Ver servicios” e “Ingresar”, beneficios, categorías, FAQ y footer elegante.
- **Catálogo** con filtros por categoría/precio, tarjetas de producto (imagen, precio, periodicidad, beneficios) y **detalle de producto**.
- **Carrito** con cupones y **checkout** simple: crea la orden con número único (ej. LH-2026-000123), muestra las instrucciones de pago con el Binance ID del negocio y permite **subir el comprobante**; la orden queda “pago pendiente” hasta la aprobación.
- Pantalla de confirmación con número de orden y estado.

### 4. Portal del cliente (área privada)
- **Dashboard** con resumen: servicios activos, próximos vencimientos, tickets abiertos.
- **Mis servicios:** tarjetas con estado, fechas de compra/inicio/vencimiento, días restantes calculados automáticamente, plan, botones Renovar / Soporte / Ver detalle.
- **Detalle de servicio:** línea de tiempo (compra, activación, pagos, renovaciones, soporte), comprobantes, tickets asociados, FAQ del servicio y enlaces a soporte oficial del proveedor. Nunca credenciales ni correos maestros.
- **Renovación:** genera una nueva orden de renovación con el mismo flujo de pago por comprobante.
- **Historial de pagos** con estados (pendiente, aprobado, rechazado) y comprobantes descargables.
- **Soporte:** lista de tickets, crear ticket (solo sobre servicios activos propios, con categoría, prioridad, descripción y adjuntos validados), conversación tipo chat, estados (abierto → en revisión → en espera → en proceso → resuelto/cerrado), mensajes automáticos de seguridad y calificación al cerrar.
- **Centro de notificaciones** dentro de la app (pago aprobado, servicio activado, ticket respondido, etc.).
- **Perfil y seguridad:** datos personales, preferencias de notificación, cambio de contraseña.
- Empty states premium, skeletons de carga y mensajes de éxito/error claros.

### 5. Admin operativo mínimo (para que el negocio funcione)
- Dashboard con métricas clave (clientes, ingresos, pagos pendientes, renovaciones próximas, tickets abiertos).
- Aprobación/rechazo de comprobantes → al aprobar, el servicio se **activa o renueva automáticamente** con sus fechas.
- Gestión de productos, órdenes y clientes.
- Bandeja de tickets: asignar, responder, notas internas invisibles para el cliente, cambiar estados.

## Fase 2 (después de validar la Fase 1)
Panel admin completo (reportes CSV/PDF, SLA, plantillas de mensajes, cupones avanzados, bitácora visual, configuración global), recordatorios automáticos de vencimiento (7/3/1/0 días), emails transaccionales, WhatsApp Business API, notificaciones push PWA, 2FA para admins e integración Payphone en vivo.

## Detalles técnicos
- **Stack:** TanStack Start (React 19 + TypeScript) + Tailwind CSS v4 + Lovable Cloud (PostgreSQL, auth, storage). Se publica en Lovable con dominio propio.
- **Tablas principales:** `profiles`, `user_roles` (+ función `has_role`), `categories`, `products`, `coupons`, `orders`, `order_items`, `customer_services`, `payments`, `support_tickets`, `ticket_messages`, `notifications`, `audit_logs`. Cada una con GRANTs, RLS e índices.
- **Rutas públicas:** `/` (landing), `/catalogo`, `/producto/$slug`, `/carrito`, `/checkout`, `/auth`, `/recuperar`, `/restablecer`. **Rutas privadas** bajo `_authenticated/`: `/panel`, `/mis-servicios`, `/servicio/$id`, `/pagos`, `/soporte`, `/ticket/$id`, `/notificaciones`, `/perfil`, y `/admin/*` protegido por rol.
- **Pagos:** tabla `payments` con proveedor (`binance_manual` ahora), referencia de transacción, comprobante en storage y aprobación admin vía función de servidor privilegiada que activa/renueva el servicio y registra en auditoría.
- **Datos demo:** migración con categorías, productos de servicios digitales, un cupón de ejemplo y FAQs — sin credenciales reales.
- **SEO:** metadata única por ruta pública, un H1 por página, og tags.
