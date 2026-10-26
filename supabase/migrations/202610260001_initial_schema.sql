create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  role text not null default 'tester' check (role in ('tester', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  name text not null check (length(trim(name)) > 0),
  description text,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index rounds_one_active_per_project
  on public.rounds(project_id)
  where status = 'active';

create table public.scenarios (
  id text primary key,
  source_order integer not null unique,
  module text not null,
  section text not null,
  category text not null default '',
  source_number integer not null,
  title text not null,
  description text not null default '',
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  expected jsonb not null default '[]'::jsonb check (jsonb_typeof(expected) = 'array'),
  is_builtin boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.round_scenarios (
  round_id uuid not null references public.rounds(id),
  scenario_id text not null references public.scenarios(id),
  sort_order integer not null,
  module text not null,
  section text not null,
  category text not null default '',
  source_number integer not null,
  title text not null,
  description text not null default '',
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  expected jsonb not null default '[]'::jsonb check (jsonb_typeof(expected) = 'array'),
  added_by uuid references public.profiles(id),
  added_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (round_id, scenario_id),
  unique (round_id, sort_order)
);

create table public.round_scenario_workflows (
  round_id uuid not null,
  scenario_id text not null,
  status text not null default 'open' check (status in ('open', 'has_issues', 'in_progress', 'closed')),
  assigned_to uuid references public.profiles(id),
  issue_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_by uuid references public.profiles(id),
  primary key (round_id, scenario_id),
  foreign key (round_id, scenario_id)
    references public.round_scenarios(round_id, scenario_id)
);

create table public.scenario_executions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null,
  scenario_id text not null,
  user_id uuid not null references public.profiles(id),
  status text not null default 'not_tested' check (status in ('not_tested', 'passed', 'failed', 'not_applicable')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, scenario_id, user_id),
  foreign key (round_id, scenario_id)
    references public.round_scenarios(round_id, scenario_id)
);

create table public.scenario_issues (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null,
  scenario_id text not null,
  reported_by uuid not null references public.profiles(id),
  report text not null check (length(trim(report)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (round_id, scenario_id)
    references public.round_scenarios(round_id, scenario_id)
);

create index rounds_project_status_idx on public.rounds(project_id, status);
create index round_scenarios_round_order_idx on public.round_scenarios(round_id, sort_order) where removed_at is null;
create index workflow_round_status_idx on public.round_scenario_workflows(round_id, status);
create index executions_round_user_idx on public.scenario_executions(round_id, user_id);
create index issues_round_created_idx on public.scenario_issues(round_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();
create trigger rounds_set_updated_at
before update on public.rounds
for each row execute function public.set_updated_at();
create trigger scenarios_set_updated_at
before update on public.scenarios
for each row execute function public.set_updated_at();
create trigger round_scenarios_set_updated_at
before update on public.round_scenarios
for each row execute function public.set_updated_at();
create trigger round_workflows_set_updated_at
before update on public.round_scenario_workflows
for each row execute function public.set_updated_at();
create trigger executions_set_updated_at
before update on public.scenario_executions
for each row execute function public.set_updated_at();
create trigger issues_set_updated_at
before update on public.scenario_issues
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active' and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.rounds enable row level security;
alter table public.scenarios enable row level security;
alter table public.round_scenarios enable row level security;
alter table public.round_scenario_workflows enable row level security;
alter table public.scenario_executions enable row level security;
alter table public.scenario_issues enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Active users can read projects"
  on public.projects for select to authenticated
  using ((select public.is_active_user()));
create policy "Active users can read rounds"
  on public.rounds for select to authenticated
  using ((select public.is_active_user()));
create policy "Active users can read scenario catalog"
  on public.scenarios for select to authenticated
  using ((select public.is_active_user()));
create policy "Active users can read round scenarios"
  on public.round_scenarios for select to authenticated
  using ((select public.is_active_user()));
create policy "Active users can read round workflows"
  on public.round_scenario_workflows for select to authenticated
  using ((select public.is_active_user()));

create policy "Users read own executions and admins read round executions"
  on public.scenario_executions for select to authenticated
  using ((select public.is_active_user()) and (user_id = (select auth.uid()) or (select public.is_admin())));
create policy "Users insert own execution while round is open"
  on public.scenario_executions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and exists (
      select 1
      from public.rounds r
      join public.round_scenario_workflows w on w.round_id = r.id
      where r.id = scenario_executions.round_id
        and r.status = 'active'
        and w.scenario_id = scenario_executions.scenario_id
        and w.status = 'open'
    )
  );
create policy "Users update own execution while round is open"
  on public.scenario_executions for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()))
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and exists (
      select 1
      from public.rounds r
      join public.round_scenario_workflows w on w.round_id = r.id
      where r.id = scenario_executions.round_id
        and r.status = 'active'
        and w.scenario_id = scenario_executions.scenario_id
        and w.status = 'open'
    )
  );

create policy "Active users can read issue reports"
  on public.scenario_issues for select to authenticated
  using ((select public.is_active_user()));

create or replace function public.admin_create_round(
  p_name text,
  p_description text default null,
  p_scenario_ids text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_project_id uuid;
  v_round_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Round name is required' using errcode = '22023';
  end if;
  if p_scenario_ids is not null and cardinality(p_scenario_ids) = 0 then
    raise exception 'Select at least one scenario' using errcode = '22023';
  end if;
  if p_scenario_ids is not null and exists (
    select 1 from unnest(p_scenario_ids) selected(id)
    where not exists (select 1 from public.scenarios s where s.id = selected.id)
  ) then
    raise exception 'Scenario selection contains unknown IDs' using errcode = '22023';
  end if;
  select id into v_project_id from public.projects order by created_at limit 1;
  if v_project_id is null then
    raise exception 'SPS Nexus project has not been seeded';
  end if;

  insert into public.rounds (project_id, name, description, status, created_by)
  values (v_project_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), 'planned', auth.uid())
  returning id into v_round_id;

  insert into public.round_scenarios (
    round_id, scenario_id, sort_order, module, section, category, source_number,
    title, description, steps, expected, added_by
  )
  select
    v_round_id, s.id, row_number() over (order by s.source_order)::integer,
    s.module, s.section, s.category, s.source_number, s.title, s.description, s.steps, s.expected, auth.uid()
  from public.scenarios s
  where p_scenario_ids is null or s.id = any(p_scenario_ids)
  order by s.source_order;

  insert into public.round_scenario_workflows (round_id, scenario_id)
  select v_round_id, rs.scenario_id
  from public.round_scenarios rs
  where rs.round_id = v_round_id;

  return v_round_id;
end;
$$;

create or replace function public.admin_set_round_status(p_round_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_current text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select status into v_current from public.rounds where id = p_round_id for update;
  if not found then raise exception 'Round not found' using errcode = 'P0002'; end if;
  if not (
    (v_current = 'planned' and p_status = 'active')
    or (v_current = 'active' and p_status = 'completed')
    or (v_current = 'completed' and p_status = 'archived')
  ) then
    raise exception 'Invalid round status transition: % to %', v_current, p_status using errcode = '22023';
  end if;
  update public.rounds
  set status = p_status,
      completed_at = case when p_status = 'completed' then now() else completed_at end
  where id = p_round_id;
end;
$$;

create or replace function public.admin_update_round_scenario(
  p_round_id uuid,
  p_scenario_id text,
  p_title text,
  p_description text,
  p_steps text[],
  p_expected text[]
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'Scenario title is required' using errcode = '22023';
  end if;
  update public.round_scenarios rs
  set title = trim(p_title),
      description = coalesce(p_description, ''),
      steps = to_jsonb(coalesce(p_steps, array[]::text[])),
      expected = to_jsonb(coalesce(p_expected, array[]::text[])),
      updated_by = auth.uid()
  from public.round_scenario_workflows w, public.rounds r
  where rs.round_id = p_round_id
    and rs.scenario_id = p_scenario_id
    and w.round_id = rs.round_id
    and w.scenario_id = rs.scenario_id
    and w.status = 'open'
    and r.id = rs.round_id
    and r.status = 'active';
  if not found then
    raise exception 'Scenario is not editable in this round' using errcode = '55000';
  end if;
end;
$$;

create or replace function public.report_scenario_issue(p_round_id uuid, p_scenario_id text, p_report text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_status text;
  v_issue_id uuid;
begin
  if not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_report, ''))) = 0 then
    raise exception 'Issue description is required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.scenario_executions e
    where e.round_id = p_round_id and e.scenario_id = p_scenario_id
      and e.user_id = auth.uid() and e.status = 'failed'
  ) then
    raise exception 'Record a failed execution before reporting an issue' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.rounds r
    where r.id = p_round_id and r.status = 'active'
  ) then
    raise exception 'The round is not active' using errcode = '55000';
  end if;

  select status into v_status
  from public.round_scenario_workflows
  where round_id = p_round_id and scenario_id = p_scenario_id
  for update;
  if not found or v_status <> 'open' then
    raise exception 'The scenario is no longer open' using errcode = '55000';
  end if;

  insert into public.scenario_issues (round_id, scenario_id, reported_by, report)
  values (p_round_id, p_scenario_id, auth.uid(), trim(p_report))
  returning id into v_issue_id;
  update public.round_scenario_workflows
  set status = 'has_issues',
      issue_summary = left(trim(p_report), 500),
      updated_by = auth.uid()
  where round_id = p_round_id and scenario_id = p_scenario_id;
  return v_issue_id;
end;
$$;

create or replace function public.admin_transition_round_workflow(
  p_round_id uuid,
  p_scenario_id text,
  p_status text,
  p_issue_summary text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_current text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select status into v_current
  from public.round_scenario_workflows
  where round_id = p_round_id and scenario_id = p_scenario_id
  for update;
  if not found then raise exception 'Scenario workflow not found' using errcode = 'P0002'; end if;
  if not ((v_current = 'has_issues' and p_status = 'in_progress') or (v_current = 'in_progress' and p_status = 'closed')) then
    raise exception 'Invalid workflow transition: % to %', v_current, p_status using errcode = '22023';
  end if;
  update public.round_scenario_workflows
  set status = p_status,
      assigned_to = case when p_status = 'in_progress' then coalesce(assigned_to, auth.uid()) else assigned_to end,
      issue_summary = coalesce(nullif(trim(p_issue_summary), ''), issue_summary),
      updated_by = auth.uid(),
      closed_at = case when p_status = 'closed' then now() else closed_at end
  where round_id = p_round_id and scenario_id = p_scenario_id;
end;
$$;

create or replace function public.active_member_count()
returns integer
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return (select count(*)::integer from public.profiles where status = 'active');
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_active_user() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.admin_create_round(text, text, text[]) from public, anon;
revoke all on function public.admin_set_round_status(uuid, text) from public, anon;
revoke all on function public.admin_update_round_scenario(uuid, text, text, text, text[], text[]) from public, anon;
revoke all on function public.report_scenario_issue(uuid, text, text) from public, anon;
revoke all on function public.admin_transition_round_workflow(uuid, text, text, text) from public, anon;
revoke all on function public.active_member_count() from public, anon;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_create_round(text, text, text[]) to authenticated;
grant execute on function public.admin_set_round_status(uuid, text) to authenticated;
grant execute on function public.admin_update_round_scenario(uuid, text, text, text, text[], text[]) to authenticated;
grant execute on function public.report_scenario_issue(uuid, text, text) to authenticated;
grant execute on function public.admin_transition_round_workflow(uuid, text, text, text) to authenticated;
grant execute on function public.active_member_count() to authenticated;
grant select on public.profiles to authenticated;
grant select on public.projects, public.rounds, public.scenarios, public.round_scenarios,
  public.round_scenario_workflows, public.scenario_issues to authenticated;
grant select, insert, update on public.scenario_executions to authenticated;
