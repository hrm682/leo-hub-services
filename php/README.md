# Backend PHP + MySQL (fase 1 — autenticación)

Backend para hosting **compartido cPanel** (PHP + MySQL). Cubre lo esencial de
cuentas: **login**, **contraseña genérica + cambio obligatorio**, **reseteo por
el admin**, y **solicitud de recuperación que llega al panel del admin**
(sin necesidad de SMTP). Incluye el **importador de tus clientes** con su vigencia.

> Alcance: esto es el **backend de autenticación**. Conectar el frontend (React)
> a esta API y migrar el resto de pantallas es la siguiente fase.

## Requisitos
- PHP 8.0+ y MySQL 5.7+/8 (lo estándar en cPanel).
- Extensiones PDO + pdo_mysql (vienen por defecto).

## Instalación
1. En cPanel → **phpMyAdmin**: crea una base y ejecuta [`../mysql/schema.sql`](../mysql/schema.sql).
2. Sube la carpeta `php/` a tu hosting (dentro de `public_html`, ej. `public_html/api/`).
3. Copia `config.example.php` a **`config.php`** y pon tus datos de MySQL y el
   `app_origin` (tu dominio con https). El `generic_password` es la clave que
   reciben los clientes importados/reseteados.
4. Abre `install.php` en el navegador una vez (define la clave del admin
   `lemagal1712@gmail.com`) y **luego bórralo**.

## Endpoints (POST salvo `me`)
| Ruta | Qué hace |
|------|----------|
| `api/login.php` | Inicia sesión (email + password). Devuelve `mustChangePassword` y roles. |
| `api/logout.php` | Cierra sesión. |
| `api/me.php` | Usuario actual (o `null`). |
| `api/change-password.php` | Cambia la contraseña (requiere la actual). Quita el cambio obligatorio. |
| `api/request-reset.php` | El cliente pide recuperación → notifica a los admins en su panel. |
| `api/admin/reset-password.php` | (admin) Resetea a la clave genérica y fuerza el cambio. |

## Panel de administración (usable desde ya)
Abre **`admin/index.php`** en tu navegador (ej. `https://tudominio.com/api/admin/`).
Inicia sesión con el admin y podrás:
- Ver las **solicitudes de recuperación** pendientes y **resetear** con un clic.
- Ver la **lista de clientes** con su **fecha de vencimiento y días restantes**.
- Resetear la contraseña de cualquier cliente (queda la genérica + cambio obligatorio).

Es un panel PHP puro (server-rendered), independiente del frontend React.

## Importar tus clientes con vigencia
1. Copia `clients.example.csv` a `clients.csv` y llénalo:
   `email,full_name,phone,product_slug,remaining_days`
   (los `product_slug` deben existir en la tabla `products`; `remaining_days` = días que le quedan).
2. Ejecútalo por consola (Terminal de cPanel o SSH):
   ```
   php import-clients.php clients.csv
   ```
   Cada cliente se crea con la **contraseña genérica** y se le **obliga a cambiarla**
   al primer ingreso; su servicio queda **activo** con el **vencimiento** calculado.

## Seguridad
- Contraseñas con **bcrypt** (`password_hash`), nunca en texto plano.
- Consultas con **sentencias preparadas** (sin inyección SQL).
- Sesión en cookie **HttpOnly + Secure + SameSite**.
- `config.php` **no** se versiona (está en `.gitignore`).
- Borra `install.php` tras usarlo.
