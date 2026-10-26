create or replace function public.issue_execution_notes(p_round_id uuid)
returns table (scenario_id text, user_id uuid, notes text)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select e.scenario_id, e.user_id, e.notes
  from public.scenario_issues i
  join public.scenario_executions e
    on e.round_id = i.round_id
    and e.scenario_id = i.scenario_id
    and e.user_id = i.reported_by
  where i.round_id = p_round_id
    and e.status = 'failed'
    and public.is_admin();
$$;

revoke all on function public.issue_execution_notes(uuid) from public, anon;
grant execute on function public.issue_execution_notes(uuid) to authenticated;
