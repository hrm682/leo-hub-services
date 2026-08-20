# Lo Máximo Leo — Estado del proyecto

**Sitio en vivo:** https://lomaximo.net
**Repositorio:** github.com/hrm682/leo-hub-services
**Última actualización:** 2026-08-20

---

## Resumen
Plataforma para vender y gestionar cuentas de streaming, corriendo sobre el
**hosting compartido del cliente (cPanel: PHP + MySQL)**. El repo contiene dos
implementaciones:

- **PHP + MySQL (EN VIVO en lomaximo.net)** — la que se usa hoy en el hosting.
- **React (TanStack Start) + Supabase (histórica)** — construida primero; quedó
  como base pero **no se despliega** en el hosting compartido (requiere Node).

Todo lo de abajo se refiere a lo **EN VIVO (PHP/MySQL)** salvo que se indique.

---

## ✅ Hecho y funcionando

### Infraestructura / despliegue
- **Base de datos MySQL** completa: `mysql/schema.sql` (usuarios, roles, catálogo
  con stock, órdenes, servicios con vencimiento, pagos, tickets, agentes,
  solicitudes de recuperación).
- **Despliegue automático (CI/CD)** por **GitHub Actions → FTP** en cada push:
  - `php/` → carpeta `/api/` del dominio.
  - `web/` → raíz del dominio (página principal).
  - `config.php` se **genera desde Secrets** (credenciales fuera del repo).
- **Seguridad base:** contraseñas con **bcrypt**, **sentencias preparadas**
  (anti-inyección), **CSRF**, cookies de sesión HttpOnly/Secure, secretos fuera
  de git, `install.php` neutralizado tras usarse.

### Autenticación y cuentas (`/api/`)
- **Login** por correo/contraseña (sin Google).
- **Usuario admin** `lemagal1712@gmail.com` (rol admin).
- **Contraseña genérica + cambio obligatorio** al primer ingreso.
- **Reseteo por el admin** y **solicitud de recuperación** que llega al panel
  del admin (sin SMTP).
- **Importación de clientes** desde CSV con su **vigencia** (`php/import-clients.php`).

### Tienda / cliente (`https://lomaximo.net/`)
- **Página principal premium**: hero + **partículas doradas** + **banner de Leo**
  a todo el ancho + **franja de plataformas** por color.
- **Catálogo real** leído de MySQL (Netflix, Disney+, HBO Max, Prime Video,
  Paramount+, ViX, DirecTV GO, YouTube, Spotify, Win+, Pack) con imágenes.
- **Comprar** (`php/comprar.php`) → crea orden pendiente.
- **Portal del cliente** (`/api/portal/`): login, cambio de clave obligatorio,
  **"Mis servicios"** con días de vigencia, botón **Renovar**.
- **Renovaciones** (`php/renovar.php`) → extiende la vigencia al aprobar.
- **Soporte / tickets** (`php/soporte.php`): el cliente crea tickets y ve la
  conversación; incluye el botón **"Necesito código de verificación"** (lo
  atiende un agente desde el panel — humano en el bucle, sin extracción automática).
- **Responsive móvil** validado (header, banner, hero, catálogo).

### Panel admin (`/api/admin/`)
- **Resumen**: clientes con días + solicitudes de recuperación (reseteo 1 clic).
- **Productos**: crear, editar, **quitar**, **stock/inventario**, agotado,
  destacar, mostrar/ocultar (cambios salen solos en la tienda).
- **Pagos**: **Aprobar** activa el servicio con su vigencia y **descuenta stock**;
  aprobar **renovación** extiende la vigencia; **Rechazar** cancela/revierte.
- **Tickets**: bandeja del equipo, responder con **plantillas** y cambiar estado.
- **Reportes**: dashboard con ingresos totales/mes, pagos pendientes, servicios
  activos, clientes, vencimientos (7 días/vencidos), tickets abiertos, gráfico de
  ingresos por mes, top productos y últimas órdenes.
- Marca (logo de Leo + partículas) en portal y admin.

---

## 🔴 Pendiente — Prioridad 1 (antes de abrir al público)
1. **Cambiar las 3 contraseñas** (FTP, base de datos, admin): quedaron en el chat
   y son débiles/repetidas. Actualizar también los Secrets (`FTP_PASSWORD`,
   `DB_PASSWORD`).
2. **Método de pago real**: poner el **Binance ID / QR** en `comprar.php` y
   `renovar.php` (hoy dice "coordina con el equipo").
3. Confirmar **SSL/HTTPS** del dominio y borrar `install.php` del servidor.

## 🟡 Pendiente — Prioridad 2 (operación)
4. **Recordatorios de vencimiento** (7/3/1 días) para que renueven.
5. **Notificaciones al cliente** (campana en el portal y/o WhatsApp).

> Ya listos de esta prioridad: **Tickets de soporte** (cliente + admin, con el
> flujo "solicitar verificación" con humano en el bucle).

## 🟢 Pendiente — Prioridad 3 (crecimiento)
6. **Binance Pay automático** (hoy el pago es manual: el admin aprueba).
7. **Cupones / descuentos**.
8. **Categorías + buscador** en la tienda; pulir diseño de portal/admin.

> Ya listo de esta prioridad: **Reportes / dashboard de ventas**.

## ⚪ Pendiente — Prioridad 4 (extras)
10. Respaldos automáticos de la base, monitoreo de uptime, PWA instalable.

---

## Archivos clave
| Ruta | Qué es |
|------|--------|
| `mysql/schema.sql` | Estructura MySQL (pegar en phpMyAdmin) |
| `php/lib.php` | Núcleo backend (DB, sesión, auth) |
| `php/api/*.php` | Endpoints (login, logout, me, change-password, request-reset) |
| `php/admin/*.php` | Panel admin (reportes, resumen, productos, pagos, tickets) |
| `php/portal/index.php` | Portal del cliente |
| `php/soporte.php` | Soporte / tickets del cliente |
| `php/comprar.php`, `php/renovar.php` | Compra y renovación |
| `web/index.php` | Página principal (landing + catálogo) |
| `.github/workflows/deploy.yml` | Despliegue automático por FTP |
| `docs/README` y guías | Documentación de despliegue y operación |
