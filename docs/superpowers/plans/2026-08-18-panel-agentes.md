# Panel de Agentes (/admin/agentes) — Implementation Plan

> **For agentic workers:** implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Añadir un panel `/admin/agentes` que asigne un agente de soporte principal por cliente y muestre su historial de interacción.

**Architecture:** Nueva tabla `client_agent_assignments` (una asignación "actual" por cliente vía índice único parcial + histórico de reasignaciones) y `agent_interactions` (toques manuales). Server functions en `src/lib/agents.functions.ts`. Ruta `admin.agentes.tsx` + ítem de nav en `AdminShell`. RLS: staff lee, admin gestiona.

**Tech Stack:** TanStack Start v1 (server functions), Supabase (Postgres + RLS), React 19, Tailwind v4, zod.

**Spec:** `docs/superpowers/specs/2026-08-18-binancepay-y-agentes-design.md`

## Global Constraints

- No editar `src/integrations/**` ni `src/routeTree.gen.ts`.
- Server functions viven en `src/lib/*.functions.ts` y usan el middleware `requireSupabaseAuth`; `supabaseAdmin` solo vía `await import("@/integrations/supabase/client.server")` dentro del handler.
- Roles: `has_role(_user_id, _role)` y `is_staff(_user_id)` (RPC). Asignar = solo admin; ver = staff.
- Idioma UI: español. Modo oscuro. Seguir patrones de `admin.clientes.tsx` y `AdminShell`.
- Migraciones: nuevo archivo en `supabase/migrations/` con timestamp; GRANTs + RLS coherentes con el esquema existente.

---

### Task 1: Migración de base de datos (tablas, RLS, GRANTs)

**Files:**
- Create: `supabase/migrations/<ts>_agentes.sql`

**Interfaces:**
- Produces: tablas `public.client_agent_assignments` y `public.agent_interactions`; helper de "agente actual".

- [ ] **Step 1: Escribir la migración**

```sql
-- Asignaciones cliente↔agente con histórico. "Actual" = unassigned_at IS NULL.
create table public.client_agent_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  agent_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  unassigned_by uuid references auth.users(id) on delete set null,
  note text
);
-- Un único agente ACTUAL por cliente:
create unique index client_agent_assignments_one_current
  on public.client_agent_assignments (client_id)
  where unassigned_at is null;
create index client_agent_assignments_agent on public.client_agent_assignments (agent_id);
grant select, insert, update on public.client_agent_assignments to authenticated;
grant all on public.client_agent_assignments to service_role;
alter table public.client_agent_assignments enable row level security;
create policy "staff read assignments" on public.client_agent_assignments
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "admin insert assignments" on public.client_agent_assignments
  for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update assignments" on public.client_agent_assignments
  for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.agent_interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  agent_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'nota',
  summary text not null,
  created_at timestamptz not null default now()
);
create index agent_interactions_client on public.agent_interactions (client_id, created_at desc);
grant select, insert on public.agent_interactions to authenticated;
grant all on public.agent_interactions to service_role;
alter table public.agent_interactions enable row level security;
create policy "staff read interactions" on public.agent_interactions
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff insert interactions" on public.agent_interactions
  for insert to authenticated with check (public.is_staff(auth.uid()) and agent_id = auth.uid());
```

- [ ] **Step 2: Aplicar la migración** en Lovable Cloud / Supabase (o `supabase db push` según flujo del proyecto). Verificar que las tablas existen y las policies quedan activas.

- [ ] **Step 3:** Regenerar tipos de Supabase si el flujo del proyecto lo hace (no editar `types.ts` a mano; es auto-generado). Si no se puede regenerar en este entorno, las server fns usan `supabaseAdmin` (sin tipos estrictos de estas tablas) o casteo local.

---

### Task 2: Schemas zod para agentes

**Files:**
- Modify: `src/lib/schemas.ts`

**Interfaces:**
- Produces: `assignAgentSchema`, `unassignAgentSchema`, `logInteractionSchema`, `clientIdSchema`.

- [ ] **Step 1: Añadir schemas**

```ts
export const assignAgentSchema = z.object({
  clientId: z.string().uuid(),
  agentId: z.string().uuid(),
  note: z.string().trim().max(300).optional(),
});
export const unassignAgentSchema = z.object({ clientId: z.string().uuid() });
export const clientIdSchema = z.object({ clientId: z.string().uuid() });
export const logInteractionSchema = z.object({
  clientId: z.string().uuid(),
  type: z.enum(["nota", "llamada", "seguimiento"]),
  summary: z.string().trim().min(3, "Describe la interacción").max(500),
});
```

- [ ] **Step 2:** `npx tsc --noEmit` — sin errores.

---

### Task 3: Server functions de agentes

**Files:**
- Create: `src/lib/agents.functions.ts`

**Interfaces:**
- Consumes: schemas de Task 2; `requireSupabaseAuth`; `supabaseAdmin`.
- Produces: `listClientAssignments()`, `listAgentsOverview()`, `assignAgentToClient({clientId,agentId,note?})`, `unassignAgent({clientId})`, `getClientInteractionHistory({clientId})`, `logAgentInteraction({clientId,type,summary})`.

Notas de implementación:
- Todas empiezan validando staff: `const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: userId }); if (!staff) throw new Error("Solo el equipo de LoMaximoLeo");`
- Mutaciones de asignación validan admin con `has_role`.
- `assignAgentToClient`: verifica que `agentId` es staff (rpc `is_staff`); en transacción lógica: `update client_agent_assignments set unassigned_at=now(), unassigned_by=userId where client_id=clientId and unassigned_at is null;` luego `insert` la nueva; `insert agent_interactions` tipo `reasignacion` con summary "Asignado a <nombre agente>"; `insert audit_logs` action `agent_assigned`. Usa `supabaseAdmin` para escribir de forma atómica y evitar problemas de RLS al escribir interacción con `agent_id` del nuevo agente.
- `getClientInteractionHistory`: arma un timeline unificado `{ at, kind, title, detail }[]` ordenado desc combinando: filas de `client_agent_assignments` (asignado/removido), `support_tickets` del cliente (con estado), últimos `ticket_messages` (opcional: solo conteo + último), `agent_interactions`, y `service_events` de sus `customer_services`. Resolver nombres de agente/cliente vía `profiles`.
- `listClientAssignments`: lista `profiles` (clientes) con su agente actual (join a la fila current), nº servicios activos y tickets abiertos.
- `listAgentsOverview`: usuarios con rol admin/soporte (`user_roles` + `profiles`) con conteo de clientes actualmente asignados.

- [ ] **Step 1:** Implementar el archivo siguiendo el patrón exacto de `admin.functions.ts` (createServerFn + middleware + inputValidator + handler). Resolver nombres con `profiles`.
- [ ] **Step 2:** `npx tsc --noEmit` — sin errores.
- [ ] **Step 3:** `bun run lint` (o `npx eslint .`) — sin errores.

---

### Task 4: Query options + ruta UI + nav

**Files:**
- Create: `src/routes/_authenticated/admin.agentes.tsx`
- Modify: `src/components/admin/AdminShell.tsx` (añadir nav "Agentes")

**Interfaces:**
- Consumes: server fns de Task 3.

- [ ] **Step 1:** Añadir al `NAV_ITEMS` de `AdminShell`:
```ts
{ to: "/admin/agentes", label: "Agentes", icon: Headset },
```
(importar `Headset` de `lucide-react`). Visible a staff.

- [ ] **Step 2:** Crear `admin.agentes.tsx`:
  - `head`: `{ title: "Agentes — LoMaximoLeo" }`, `robots noindex`.
  - Tabla de clientes (`listClientAssignments`) con columna "Agente actual" y un `<select>`/menú para asignar/reasignar (deshabilitado si no `isAdmin`), usando `assignAgentToClient`/`unassignAgent` con `useServerFn` + invalidación de queries + toast.
  - Selección de un cliente abre panel/`Sheet` con `getClientInteractionHistory` (timeline) y un formulario para `logAgentInteraction` (tipo + resumen).
  - Estados: skeletons de carga, empty states ("Aún no hay clientes/interacciones"), coherentes con el resto del admin.
  - Guardas: la ruta ya está bajo `AdminShell` (staff). Controles de asignación solo-admin.

- [ ] **Step 3:** `npx tsc --noEmit` + `bun run lint` — sin errores.
- [ ] **Step 4 (verificación manual):** `bun run dev`, entrar como admin a `/admin/agentes`, asignar un agente a un cliente, ver que aparece en "Agente actual", reasignar y confirmar que el histórico lo refleja, añadir una nota y verla en el timeline.

---

### Task 5: Build de verificación

- [ ] `npx tsc --noEmit` global.
- [ ] `bun run build` (o `npx vite build`) — build exitoso.

## Self-Review
- Cobertura spec: tabla asignaciones ✓, histórico ✓, interacciones manuales ✓, un agente por cliente (índice único parcial) ✓, RLS staff/admin ✓, server fns ✓, ruta+nav ✓, timeline agregado ✓.
- Sin placeholders: SQL y schemas completos; la UI describe componentes concretos con las fns nombradas.
- Consistencia de tipos: nombres de fns usados en Task 4 == definidos en Task 3.
