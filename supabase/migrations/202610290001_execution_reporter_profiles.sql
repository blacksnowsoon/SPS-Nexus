create or replace function public.execution_reporters(p_round_id uuid)
returns table (id uuid, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select distinct p.id, p.display_name, p.avatar_url
  from public.profiles p
  join public.scenario_executions e on e.user_id = p.id
  where e.round_id = p_round_id
    and e.status = 'passed'
    and public.is_active_user()
    and (public.is_admin() or e.user_id = (select auth.uid()));
$$;

revoke all on function public.execution_reporters(uuid) from public, anon;
grant execute on function public.execution_reporters(uuid) to authenticated;
