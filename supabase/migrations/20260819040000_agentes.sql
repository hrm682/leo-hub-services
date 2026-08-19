-- Panel de Agentes: asignación de un agente de soporte principal por cliente
-- con histórico de reasignaciones, e interacciones manuales para el timeline.

-- Asignaciones cliente<->agente. "Actual" = unassigned_at IS NULL.
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

-- Garantiza un único agente ACTUAL por cliente (permite histórico cerrado).
create unique index client_agent_assignments_one_current
  on public.client_agent_assignments (client_id)
  where unassigned_at is null;
create index client_agent_assignments_agent
  on public.client_agent_assignments (agent_id);
create index client_agent_assignments_client
  on public.client_agent_assignments (client_id, assigned_at desc);

grant select, insert, update on public.client_agent_assignments to authenticated;
grant all on public.client_agent_assignments to service_role;
alter table public.client_agent_assignments enable row level security;

create policy "staff read assignments" on public.client_agent_assignments
  for select to authenticated using (public.is_staff(auth.uid()));
create policy "admin insert assignments" on public.client_agent_assignments
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admin update assignments" on public.client_agent_assignments
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Interacciones manuales registradas por el equipo (notas, llamadas, seguimientos,
-- y eventos automáticos de reasignación).
create table public.agent_interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  agent_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'nota',
  summary text not null,
  created_at timestamptz not null default now()
);
create index agent_interactions_client
  on public.agent_interactions (client_id, created_at desc);

grant select, insert on public.agent_interactions to authenticated;
grant all on public.agent_interactions to service_role;
alter table public.agent_interactions enable row level security;

create policy "staff read interactions" on public.agent_interactions
  for select to authenticated using (public.is_staff(auth.uid()));
-- Un agente registra interacciones a su propio nombre; los eventos automáticos
-- de reasignación se insertan con el service role (bypass RLS) desde el servidor.
create policy "staff insert interactions" on public.agent_interactions
  for insert to authenticated
  with check (public.is_staff(auth.uid()) and agent_id = auth.uid());
