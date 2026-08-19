# Leo Hub Services

# Prompt maestro: Leo Hub — Portal Premium de Clientes y Servicios Digitales

Actúa como un equipo senior compuesto por: Product Manager, UX/UI Designer, especialista en branding, desarrollador full-stack, arquitecto de software, experto en ciberseguridad y diseñador de experiencia móvil.

Diseña y desarrolla una aplicación web moderna, responsive y tipo PWA llamada **Leo Hub**. La plataforma será un portal de venta, gestión de servicios digitales, pagos, renovaciones y soporte para clientes autorizados.

El resultado debe verse como un producto SaaS premium, rápido, confiable y visualmente impecable. No debe parecer una tienda genérica ni un panel administrativo antiguo.

---

## 1. Objetivo de negocio

Leo Hub permite que un cliente:

- Cree una cuenta personal al comprar un servicio.

- Inicie sesión y consulte únicamente sus compras.

- Visualice qué servicios tiene activos.

- Revise fecha de compra, fecha de inicio, fecha de vencimiento, valor pagado y estado.

- Renueve un servicio directamente desde el portal.

- Descargue o consulte comprobantes de pago.

- Abra tickets de soporte relacionados solamente con servicios que haya comprado.

- Consulte el historial de tickets y respuestas.

- Recupere la contraseña de su cuenta de Leo Hub mediante un enlace enviado a su correo personal.

- Reciba notificaciones por correo, WhatsApp o dentro de la aplicación.

El administrador debe poder gestionar clientes, productos, pedidos, pagos, renovaciones, tickets, agentes de soporte, promociones y métricas.

La aplicación NO debe almacenar, mostrar, extraer, interceptar, reenviar ni automatizar contraseñas, códigos OTP, códigos de verificación, tokens, enlaces de recuperación o credenciales de proveedores externos. Para cualquier problema de acceso de un servicio externo, el portal debe generar un ticket de soporte y dirigir al usuario al canal oficial correspondiente.

---

## 2. Marca e identidad visual

Nombre de la plataforma: **Leo Hub**

Concepto de marca:

- Seguridad, potencia, orden, atención premium y tecnología.

- El león representa liderazgo, protección y calidad.

- El logo debe ser un león geométrico, minimalista y elegante.

- Integrar una letra “L” de manera sutil en el rostro, melena o espacio negativo.

- Crear versión principal, versión monocromática e isotipo para favicon y app móvil.

Paleta visual:

- Fondo principal: negro grafito o azul noche profundo.

- Color premium principal: dorado eléctrico.

- Colores secundarios: azul intenso, blanco cálido y gris elegante.

- Estados: verde para activo, ámbar para próximo a vencer, rojo para suspendido o vencido, azul para solicitudes en proceso.

Estilo:

- SaaS premium de alta gama.

- Glassmorphism ligero, sin afectar legibilidad.

- Tarjetas con bordes suaves y sombras discretas.

- Tipografía moderna, fuerte y clara.

- Iconografía minimalista y coherente.

- Animaciones cortas, suaves y funcionales.

- Diseño mobile-first, completamente responsive.

- Modo oscuro como interfaz predeterminada.

Tono de comunicación:

- Cercano, profesional, confiable y claro.

- Usar textos como: “Todo tu servicio, en un solo lugar”, “Gestiona, renueva y recibe soporte”, “Tu tranquilidad también es parte del servicio”.

---

## 3. Tipos de usuario

Implementar control de acceso por roles.

### Cliente

Puede:

- Crear y activar su cuenta.

- Iniciar y cerrar sesión.

- Recuperar únicamente la contraseña de Leo Hub.

- Ver su perfil y editar datos permitidos.

- Ver sus compras y servicios asociados.

- Consultar pagos, facturas o comprobantes.

- Renovar sus servicios.

- Abrir tickets solo sobre servicios activos asociados a su cuenta.

- Ver el historial de soporte.

- Recibir notificaciones.

No puede:

- Ver información de otros clientes.

- Consultar servicios no comprados.

- Acceder a datos internos, proveedores, correos maestros o credenciales.

- Solicitar códigos, enlaces o contraseñas de cuentas externas desde la plataforma.

### Operador de soporte

Puede:

- Ver tickets asignados.

- Consultar datos mínimos del cliente y de su pedido.

- Responder tickets.

- Cambiar estados de atención.

- Adjuntar guías o instrucciones oficiales.

- Registrar notas internas que el cliente no visualiza.

No puede:

- Eliminar clientes.

- Modificar datos financieros críticos.

- Acceder a configuración global o roles.

### Administrador

Puede:

- Gestionar catálogo, productos, planes y precios.

- Crear, editar, suspender y renovar servicios.

- Gestionar clientes y operadores.

- Ver pedidos, pagos, comprobantes y reportes.

- Gestionar tickets, categorías, SLA y plantillas.

- Configurar automatizaciones y notificaciones.

- Ver bitácoras de auditoría.

- Configurar métodos de pago, incluyendo Payphone.

### Superadministrador

Puede realizar todas las acciones administrativas, configurar permisos, integraciones, seguridad, dominios, plantillas, respaldos y ajustes globales.

---

## 4. Módulos principales

### Landing page pública

Diseñar una portada de alto impacto con:

- Hero principal con el logo de Leo Hub.

- Mensaje: “Gestiona tus servicios digitales sin complicaciones”.

- Botones: “Ver servicios” y “Ingresar”.

- Sección de beneficios: compra fácil, renovación rápida, soporte organizado y acceso seguro.

- Sección de servicios o categorías.

- Preguntas frecuentes.

- Testimonios opcionales.

- Footer elegante con políticas, contacto y redes sociales.

### Catálogo y tienda

Crear una tienda clara y visual:

- Categorías de servicios.

- Tarjetas de producto con imagen, nombre, precio, periodicidad y beneficios.

- Filtros por categoría, precio y disponibilidad.

- Página de detalle de producto.

- Carrito de compra.

- Aplicación de cupones.

- Checkout simple y seguro.

- Integración preparada para Payphone.

- Confirmación de compra con número de orden.

- Email de bienvenida y confirmación de pedido.

### Área “Mis servicios”

Crear el núcleo del portal del cliente.

Cada servicio debe mostrarse en una tarjeta elegante que incluya:

- Nombre del servicio.

- Ícono o imagen representativa.

- Número interno de orden.

- Estado: Activo, Próximo a vencer, En renovación, Pago pendiente, Suspendido o Finalizado.

- Fecha de compra.

- Fecha de inicio.

- Fecha de vencimiento.

- Días restantes de vigencia.

- Plan contratado.

- Botón “Renovar”.

- Botón “Solicitar soporte”.

- Botón “Ver detalle”.

El cálculo de vigencia debe realizarse automáticamente:

Días restantes = fecha de vencimiento - fecha actual.

Usar alertas visuales:

- Verde: más de 7 días.

- Ámbar: entre 1 y 7 días.

- Rojo: vencido.

- Azul: renovación en proceso.

### Detalle de servicio

Cada servicio debe tener una página privada con:

- Resumen del pedido.

- Estado actual.

- Línea de tiempo: compra, activación, pagos, renovaciones, soporte y cambios de estado.

- Comprobantes relacionados.

- Historial de tickets asociados.

- Botón de renovación.

- Botón de ayuda.

- Preguntas frecuentes específicas del servicio.

- Enlaces a soporte oficial del proveedor cuando corresponda.

No mostrar correos maestros, credenciales, contraseñas, códigos de seguridad ni información sensible de cuentas de terceros.

### Soporte y tickets

Crear un sistema de soporte profesional.

Formulario de ticket:

- Servicio relacionado, seleccionado solo de los servicios activos del cliente.

- Categoría: acceso, facturación, renovación, cambio de dispositivo, consulta general u otro.

- Prioridad: baja, media o alta.

- Descripción.

- Adjuntos, con validación de tamaño y tipo de archivo.

Estados:

- Abierto.

- En revisión.

- En espera del cliente.

- En proceso.

- Resuelto.

- Cerrado.

Cada ticket debe tener:

- Número único.

- Fecha y hora.

- Conversación tipo chat.

- Adjuntos.

- Historial de acciones.

- Operador asignado.

- Notificaciones al cambiar de estado.

- Calificación de atención al cerrar el caso.

Agregar mensajes automáticos:

- “Tu solicitud fue recibida correctamente”.

- “Un agente revisará tu caso”.

- “Para proteger tu seguridad, Leo Hub nunca solicitará contraseñas ni códigos de verificación de servicios externos dentro del chat”.

### Pagos y renovaciones

Implementar:

- Pagos de compra inicial.

- Renovación manual.

- Renovación programada opcional.

- Cupones y promociones.

- Historial de transacciones.

- Estados: pendiente, aprobado, rechazado, reembolsado y vencido.

- Integración modular con Payphone.

- Webhooks firmados para confirmar pagos.

- Generación de comprobante o recibo.

- Recordatorios automáticos de vencimiento a 7, 3, 1 y 0 días.

### Perfil y recuperación de cuenta Leo Hub

Pantalla de perfil:

- Nombre.

- Correo personal validado.

- Teléfono.

- Documento opcional.

- Fecha de registro.

- Preferencias de notificación.

- Cambio de contraseña.

- Cierre de sesiones activas.

Pantalla “Olvidé mi contraseña”:

- Solicitar solo el correo con el que el cliente se registró en Leo Hub.

- Enviar un enlace de restablecimiento de uso único.

- El enlace debe expirar en 15 minutos.

- Invalidar enlaces anteriores cuando se genere uno nuevo.

- Registrar la solicitud en bitácora de seguridad.

- No revelar si el correo existe o no: mostrar siempre “Si el correo está registrado, recibirás instrucciones para continuar”.

### Centro de notificaciones

Crear un centro de notificaciones dentro de la app:

- Pago aprobado.

- Renovación próxima.

- Servicio activado.

- Servicio vencido.

- Ticket actualizado.

- Nueva respuesta de soporte.

- Cambio de contraseña.

- Inicio de sesión desde un nuevo dispositivo.

Canales configurables:

- Email.

- WhatsApp Business API, si está habilitada.

- Notificación dentro del portal.

- Push notification para PWA.

### Panel administrativo

Diseñar un panel de administración completo con:

- Dashboard con clientes activos, ingresos, pagos pendientes, renovaciones próximas, tickets abiertos y tasa de resolución.

- Gestión de clientes.

- Gestión de operadores y roles.

- Gestión de productos, planes, categorías y precios.

- Gestión de órdenes y servicios.

- Gestión de pagos y comprobantes.

- Gestión de renovaciones.

- Gestión de tickets y SLA.

- Plantillas de correo y WhatsApp.

- Cupones y promociones.

- Reportes exportables a CSV y PDF.

- Bitácora de auditoría.

- Configuración de la plataforma.

---

## 5. Seguridad y privacidad

Aplicar estas medidas obligatorias:

- Autenticación segura con contraseñas hasheadas mediante Argon2 o bcrypt.

- Verificación de correo para activar una cuenta nueva.

- Recuperación de contraseña limitada exclusivamente a la cuenta Leo Hub.

- Rate limiting en login, recuperación de contraseña, creación de tickets y checkout.

- Protección CSRF.

- Validación de formularios del lado cliente y servidor.

- Sanitización de entradas.

- Protección contra XSS, SQL injection y carga de archivos maliciosos.

- Sesiones seguras con cookies HttpOnly, Secure y SameSite.

- Opción de autenticación multifactor para administradores.

- Registro de IP, dispositivo, hora y acción para eventos críticos.

- Bitácora inmutable para cambios de estado, pagos, renovaciones, tickets y accesos administrativos.

- Permisos estrictos por rol.

- Cifrado de datos sensibles en reposo.

- Backups automáticos.

- No almacenar contraseñas, códigos OTP, códigos de verificación, tokens, enlaces de restablecimiento ni datos de acceso de proveedores externos.

- Mostrar siempre textos educativos que indiquen que el portal no solicita ni procesa códigos de seguridad de terceros.

---

## 6. Modelo de datos

Crear como mínimo las siguientes entidades:

### users

- id

- name

- email

- phone

- password_hash

- role_id

- email_verified_at

- status

- last_login_at

- created_at

- updated_at

### roles

- id

- name

- permissions

### customers

- id

- user_id

- document_number

- address

- notification_preferences

- created_at

- updated_at

### products

- id

- category_id

- name

- slug

- description

- image_url

- price

- billing_period

- is_active

- created_at

- updated_at

### orders

- id

- customer_id

- order_number

- subtotal

- discount

- total

- status

- payment_status

- created_at

- updated_at

### order_items

- id

- order_id

- product_id

- quantity

- unit_price

- metadata

### customer_services

- id

- customer_id

- order_item_id

- service_reference

- status

- start_date

- expiration_date

- renewal_date

- created_at

- updated_at

### payments

- id

- order_id

- provider

- transaction_reference

- amount

- currency

- status

- paid_at

- raw_response_encrypted

- created_at

- updated_at

### support_tickets

- id

- customer_id

- customer_service_id

- ticket_number

- category

- priority

- status

- assigned_to

- subject

- description

- created_at

- updated_at

- closed_at

### ticket_messages

- id

- ticket_id

- sender_user_id

- message

- is_internal_note

- created_at

### notifications

- id

- user_id

- channel

- title

- content

- status

- sent_at

- read_at

- created_at

### audit_logs

- id

- user_id

- action

- entity_type

- entity_id

- ip_address

- user_agent

- metadata

- created_at

---

## 7. Experiencia de usuario

Diseñar las siguientes pantallas:

1. Landing page.

2. Catálogo de servicios.

3. Detalle de producto.

4. Carrito.

5. Checkout.

6. Registro.

7. Inicio de sesión.

8. Recuperación de contraseña de Leo Hub.

9. Dashboard del cliente.

10. Mis servicios.

11. Detalle de un servicio.

12. Renovaciones.

13. Historial de pagos.

14. Centro de soporte.

15. Crear ticket.

16. Conversación de ticket.

17. Perfil y seguridad.

18. Centro de notificaciones.

19. Dashboard administrativo.

20. Gestión de clientes.

21. Gestión de productos.

22. Gestión de órdenes.

23. Gestión de pagos.

24. Gestión de tickets.

25. Reportes.

26. Configuración y roles.

Crear empty states premium:

- “Aún no tienes servicios activos”.

- “No tienes tickets abiertos”.

- “No encontramos resultados”.

- “Tu bandeja está al día”.

Crear estados de carga tipo skeleton, alertas de éxito y mensajes de error claros.

---

## 8. Arquitectura tecnológica

Usar una arquitectura mantenible y escalable.

Stack sugerido:

- Frontend: Next.js, TypeScript, Tailwind CSS y componentes UI modernos.

- Backend: Laravel API o NestJS.

- Base de datos: PostgreSQL.

- ORM: Prisma, Drizzle o Eloquent, según el backend seleccionado.

- Autenticación: JWT seguro con refresh tokens o sesiones protegidas.

- Archivos: almacenamiento S3 compatible.

- Pagos: integración modular con Payphone.

- Emails: Resend, Amazon SES o SMTP profesional.

- WhatsApp: WhatsApp Business API, opcional.

- Hosting: VPS con Docker, Nginx, HTTPS y backups.

- Observabilidad: logs de aplicación, alertas de error y monitorización de uptime.

Crear una API REST documentada o endpoints tipados, con validación de permisos en el servidor.

---

## 9. Entregables esperados

Genera:

1. Arquitectura funcional de la plataforma.

2. Sitemap completo.

3. Wireframes o especificación detallada de cada pantalla.

4. Sistema de diseño con colores, tipografías, espaciados, componentes y estados.

5. Esquema de base de datos.

6. Endpoints principales de API.

7. Flujos de autenticación, compra, pago, renovación y tickets.

8. Reglas de seguridad.

9. Textos UX en español.

10. Diseño responsive para móvil, tablet y escritorio.

11. Código limpio, modular, documentado y preparado para producción.

12. Datos de demostración realistas, sin utilizar credenciales reales ni información sensible.

Prioriza una experiencia premium, transparente, segura y fácil de usar. El cliente debe sentir que tiene control sobre sus compras, renovaciones y solicitudes de ayuda desde un portal elegante, confiable y profesional.

esto debe funcionar en un banahosting por favor ten presente esto

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bf0159a5-241c-4f33-913e-4af0ffa940da).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
