# Despliegue en Banahosting (hosting compartido con Node.js)

Esta app es **TanStack Start SSR** y corre como una **aplicación Node.js**. En
Banahosting compartido eso funciona **solo si tu plan tiene "Setup Node.js App"
/ Node.js Selector** en cPanel (CloudLinux + Passenger). Si no lo ves, pídelo a
soporte de Banahosting o usa un plan que lo incluya.

> El backend (base de datos, auth, storage) sigue en **Supabase (Lovable Cloud)**:
> solo movemos el front-end/SSR a Banahosting. Así no hay que reescribir nada. Si
> más adelante quieres independizarte también de Supabase/Lovable, es otro paso.

## Requisitos previos

- Plan de Banahosting con **Node.js Selector** (Node 18 o 20).
- Acceso a cPanel (y opcionalmente SSH).
- Las variables de entorno del proyecto (ver `.env.example`).
- Las migraciones de `supabase/migrations/` aplicadas en tu Supabase.

## 1. Compilar la app (en tu PC)

Las variables `VITE_*` se **incrustan en el build**, así que deben estar
presentes al compilar. Ten tu `.env` completo y ejecuta:

```bash
npm install
npm run build:node
```

Esto genera la carpeta **`.output/`** (servidor Node autocontenido). El punto de
entrada es `.output/server/index.mjs`.

## 2. Subir los archivos

Sube al servidor (por File Manager de cPanel o SSH/rsync) la carpeta **`.output/`**
completa a la carpeta de tu app, por ejemplo `~/leo-hub/`. Debe quedar:

```
~/leo-hub/.output/server/index.mjs
~/leo-hub/.output/public/...
```

(No subas `node_modules` de la raíz ni `src/`. El `.output/` ya trae lo que el
servidor necesita.)

## 3. Crear la app Node en cPanel

cPanel → **Setup Node.js App** → **Create Application**:

- **Node.js version:** 20.x (o 18.x).
- **Application mode:** Production.
- **Application root:** `leo-hub` (la carpeta donde subiste `.output`).
- **Application URL:** tu dominio o subdominio (ej. `hub.tudominio.com`).
- **Application startup file:** `.output/server/index.mjs`.

Guarda. Passenger asigna el `PORT`; el servidor Nitro lo respeta automáticamente.

## 4. Variables de entorno (en la misma pantalla de la app Node)

Añade en "Environment variables" (sin comillas):

```
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # secreto de servidor (Supabase → API)
BINANCE_PAY_API_KEY=...                # opcional (pago automático)
BINANCE_PAY_API_SECRET=...
BINANCE_PAY_BASE_URL=https://bpay.binanceapi.com
```

Nota: las `VITE_*` NO se ponen aquí (ya quedaron incrustadas en el build del
paso 1). Si cambias una `VITE_*`, hay que **recompilar y volver a subir**.

## 5. Arrancar y probar

En la pantalla de la app Node: **Run NPM Install** no es necesario (el `.output`
es autocontenido) → pulsa **Restart**. Abre tu dominio: debe cargar la landing.

Prueba: catálogo (los servicios de streaming), registro/login, checkout, y el
pago (ver `docs/runbook-binance-pay.md`).

## Notas y problemas comunes

- **La app no arranca / 503:** revisa que el *startup file* sea exactamente
  `.output/server/index.mjs` y que la versión de Node sea 18+. Mira los logs de
  Passenger en cPanel.
- **Estáticos/imagenes 404:** confirma que subiste `.output/public/` completo.
- **Login con Google:** usa el backend de Supabase/Lovable existente (mismas
  credenciales). Si migras a un Supabase propio, reconfigura el proveedor de
  Google (OAuth) en ese Supabase.
- **Rendimiento:** para pocos usuarios el plan compartido con Node basta. Si
  crece, un VPS da más control.
- **Actualizaciones:** cada cambio de código = `npm run build:node` local →
  subir `.output/` → **Restart** de la app en cPanel.

## Alternativas si tu plan NO tiene Node.js Selector

- **Host de Node externo** (Render/Railway, con capa gratuita) apuntando tu
  dominio de Banahosting por DNS: despliegas el mismo `.output` sin depender del
  cPanel compartido.
- **Reescribir a SPA estática + Supabase Edge Functions** para caber en hosting
  100% estático: es un rework mayor (mover las server functions a Edge Functions).
