create or replace function public.issue_reporters(p_round_id uuid)
returns table (id uuid, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select distinct p.id, p.display_name, p.avatar_url
  from public.profiles p
  join public.scenario_issues i on i.reported_by = p.id
  where i.round_id = p_round_id
    and public.is_active_user();
$$;

revoke all on function public.issue_reporters(uuid) from public, anon;
grant execute on function public.issue_reporters(uuid) to authenticated;
