alter table public.scenario_issues
  add column if not exists status text not null default 'open'
    check (status in ('open', 'returned', 'resolved'));

create index if not exists issues_status_idx on public.scenario_issues(status);

create or replace function public.report_scenario_issue(p_round_id uuid, p_scenario_id text, p_report text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
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

  insert into public.scenario_issues (round_id, scenario_id, reported_by, report)
  values (p_round_id, p_scenario_id, auth.uid(), trim(p_report))
  returning id into v_issue_id;

  return v_issue_id;
end;
$$;

create or replace function public.admin_return_issue(p_issue_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select status into v_status
  from public.scenario_issues
  where id = p_issue_id
  for update;
  if not found then
    raise exception 'Issue not found' using errcode = 'P0002';
  end if;
  if v_status <> 'open' then
    raise exception 'Only open issues can be returned to reporter' using errcode = '22023';
  end if;
  update public.scenario_issues
  set status = 'returned', updated_at = now()
  where id = p_issue_id;
end;
$$;

create or replace function public.admin_resolve_issue(p_issue_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select status into v_status
  from public.scenario_issues
  where id = p_issue_id
  for update;
  if not found then
    raise exception 'Issue not found' using errcode = 'P0002';
  end if;
  if v_status not in ('open', 'returned') then
    raise exception 'Issue cannot be resolved from status: %', v_status using errcode = '22023';
  end if;
  update public.scenario_issues
  set status = 'resolved', updated_at = now()
  where id = p_issue_id;
end;
$$;

create or replace function public.tester_update_issue(p_issue_id uuid, p_report text)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_row public.scenario_issues%rowtype;
begin
  if not public.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_report, ''))) = 0 then
    raise exception 'Issue description is required' using errcode = '22023';
  end if;
  select * into v_row
  from public.scenario_issues
  where id = p_issue_id
  for update;
  if not found then
    raise exception 'Issue not found' using errcode = 'P0002';
  end if;
  if v_row.reported_by <> auth.uid() then
    raise exception 'You can only edit your own issue reports' using errcode = '42501';
  end if;
  if v_row.status <> 'returned' then
    raise exception 'Only returned issues can be edited' using errcode = '22023';
  end if;
  update public.scenario_issues
  set report = trim(p_report), status = 'open', updated_at = now()
  where id = p_issue_id;
end;
$$;

revoke all on function public.admin_return_issue(uuid) from public, anon;
revoke all on function public.admin_resolve_issue(uuid) from public, anon;
revoke all on function public.tester_update_issue(uuid, text) from public, anon;
grant execute on function public.admin_return_issue(uuid) to authenticated;
grant execute on function public.admin_resolve_issue(uuid) to authenticated;
grant execute on function public.tester_update_issue(uuid, text) to authenticated;
