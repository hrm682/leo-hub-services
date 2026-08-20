# Seguridad y operación — guía de configuración

Lo que **ya está en el código** (aplicado): RLS en todas las tablas, autorización
por rol en cada server function, secretos solo en el servidor, validación con
zod, enlaces de archivos temporales, **cabeceras de seguridad + CSP**, e
inventario protegido (RPC solo para `service_role`).

Lo de abajo es **configuración** que hace el administrador del hosting/Supabase.

## 1. Cloudflare delante del dominio (muy recomendado)
Pon el dominio detrás de **Cloudflare (plan gratis)**:
- **SSL/TLS**: modo "Full (strict)".
- **WAF + Bot Fight Mode**: bloquea ataques y bots automáticos.
- **Rate limiting**: limita peticiones por IP (protege login, cupones, creación
  de órdenes). Regla sugerida: máx. ~20 req/10s por IP a `/_serverFn/*`.
- **Always Use HTTPS** y **Automatic HTTPS Rewrites**: activados.
Esto cubre el rate limiting y el anti-DDoS que la app por sí sola no trae.

## 2. Supabase Auth — endurecer
En el panel de Supabase → Authentication:
- **Confirmación de email** activada (evita registros falsos).
- **CAPTCHA (hCaptcha/Turnstile)** en Sign up / Sign in: Authentication →
  Settings → Enable Captcha protection.
- **Contraseñas**: longitud mínima 8+ (ya validado en la app) y, si está
  disponible, "leaked password protection".
- **URLs de redirección** (OAuth Google): registra solo tu dominio real en
  "Redirect URLs" para que nadie secuestre el flujo.
- **2FA (MFA)** para las cuentas de **admin/soporte**: actívalo para el equipo.

## 3. Rol de administrador (bootstrap seguro)
El primer admin se asigna **manualmente en la base** (no hay ruta pública para
volverse admin, por diseño). En el SQL editor de Supabase:

```sql
insert into public.user_roles (user_id, role)
values ('<UUID-del-usuario>', 'admin')
on conflict do nothing;
```

Desde ahí, el admin puede dar rol `soporte` a otros desde el panel. La API nunca
permite auto-asignarse `admin`.

## 4. Correos transaccionales (SMTP propio)
Para que los correos salgan a tu nombre (verificación, reset de contraseña):
Supabase → Authentication → SMTP Settings → configura tu servidor SMTP
(por ejemplo, el correo de tu dominio o un proveedor como Resend/SendGrid).

## 5. Respaldos y monitoreo
- **Respaldos**: Supabase respalda la base; verifica la frecuencia de tu plan y,
  si manejas datos críticos, exporta respaldos periódicos.
- **Monitoreo de uptime**: usa un servicio gratuito (UptimeRobot, etc.) que
  vigile tu dominio y te avise si se cae.

## 6. Variables de entorno (nunca en el repo)
- `.env` ya no se versiona (está en `.gitignore`). Usa `.env.example` como
  plantilla.
- Los **secretos de servidor** (`SUPABASE_SERVICE_ROLE_KEY`, `BINANCE_PAY_*`)
  van SOLO en las variables del hosting (cPanel Node.js App), nunca en `.env`
  versionado ni en variables `VITE_`.

## 7. Sobre "encriptar el código" / bloquear DevTools
No es posible ni recomendable: el navegador siempre descarga y ejecuta el
front-end, así que no se puede "encriptar" ni ocultar de forma efectiva, y
bloquear DevTools se evade en segundos y daña la experiencia. La protección real
—y ya implementada— es mantener **secretos y lógica sensible en el servidor**.
El código de producción ya va **minificado** y **sin sourcemaps públicos**.

## 8. Pendiente de producto (opcional / Fase 2)
- Webhook de Binance con verificación de firma (hoy: verificación/sondeo).
- Notificaciones por WhatsApp / push.
- SLA y plantillas avanzadas de tickets.
- Más pruebas automáticas.
