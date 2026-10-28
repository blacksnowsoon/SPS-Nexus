drop policy if exists "Users insert own execution in active round"
  on public.scenario_executions;
drop policy if exists "Users update own execution in active round"
  on public.scenario_executions;

create policy "Users insert own execution in active round"
  on public.scenario_executions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and exists (
      select 1
      from public.rounds r
      where r.id = scenario_executions.round_id
        and r.status = 'active'
    )
    and not exists (
      select 1
      from public.scenario_issues i
      where i.round_id = scenario_executions.round_id
        and i.scenario_id = scenario_executions.scenario_id
        and i.reported_by = scenario_executions.user_id
        and i.status = 'open'
    )
  );

create policy "Users update own execution in active round"
  on public.scenario_executions for update to authenticated
  using (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and exists (
      select 1
      from public.rounds r
      where r.id = scenario_executions.round_id
        and r.status = 'active'
    )
    and not exists (
      select 1
      from public.scenario_issues i
      where i.round_id = scenario_executions.round_id
        and i.scenario_id = scenario_executions.scenario_id
        and i.reported_by = scenario_executions.user_id
        and i.status = 'open'
    )
  )
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_user())
    and exists (
      select 1
      from public.rounds r
      where r.id = scenario_executions.round_id
        and r.status = 'active'
    )
    and not exists (
      select 1
      from public.scenario_issues i
      where i.round_id = scenario_executions.round_id
        and i.scenario_id = scenario_executions.scenario_id
        and i.reported_by = scenario_executions.user_id
        and i.status = 'open'
    )
  );

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
  if exists (
    select 1 from public.scenario_issues i
    where i.round_id = p_round_id and i.scenario_id = p_scenario_id
      and i.reported_by = auth.uid() and i.status in ('open', 'returned')
  ) then
    raise exception 'An active issue report already exists for this execution' using errcode = '55000';
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
  if not exists (
    select 1 from public.rounds r
    where r.id = v_row.round_id and r.status = 'active'
  ) then
    raise exception 'The round is not active' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.scenario_executions e
    where e.round_id = v_row.round_id and e.scenario_id = v_row.scenario_id
      and e.user_id = auth.uid() and e.status = 'failed'
  ) then
    raise exception 'Execution must remain failed to resend the issue report' using errcode = '55000';
  end if;
  update public.scenario_issues
  set report = trim(p_report), status = 'open', updated_at = now()
  where id = p_issue_id;
end;
$$;

revoke all on function public.report_scenario_issue(uuid, text, text) from public, anon;
revoke all on function public.tester_update_issue(uuid, text) from public, anon;
grant execute on function public.report_scenario_issue(uuid, text, text) to authenticated;
grant execute on function public.tester_update_issue(uuid, text) to authenticated;
