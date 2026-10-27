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
  if not (
    (v_current = 'has_issues' and p_status in ('in_progress', 'open'))
    or (v_current = 'in_progress' and p_status = 'closed')
  ) then
    raise exception 'Invalid workflow transition: % to %', v_current, p_status using errcode = '22023';
  end if;
  if p_status = 'open' and not exists (
    select 1 from public.rounds where id = p_round_id and status = 'active'
  ) then
    raise exception 'Only active rounds can be returned to testers' using errcode = '55000';
  end if;

  update public.round_scenario_workflows
  set status = p_status,
      assigned_to = case
        when p_status = 'in_progress' then coalesce(assigned_to, auth.uid())
        when p_status = 'open' then null
        else assigned_to
      end,
      issue_summary = case
        when p_status = 'open' then null
        else coalesce(nullif(trim(p_issue_summary), ''), issue_summary)
      end,
      updated_by = auth.uid(),
      closed_at = case
        when p_status = 'closed' then now()
        when p_status = 'open' then null
        else closed_at
      end
  where round_id = p_round_id and scenario_id = p_scenario_id;
end;
$$;