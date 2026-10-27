create or replace function public.admin_update_round(
  p_round_id uuid,
  p_name text,
  p_description text
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
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Round name is required' using errcode = '22023';
  end if;

  update public.rounds
  set name = trim(p_name),
      description = nullif(trim(coalesce(p_description, '')), '')
  where id = p_round_id;

  if not found then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_delete_round(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.rounds where id = p_round_id for update) then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;

  delete from public.scenario_issues where round_id = p_round_id;
  delete from public.scenario_executions where round_id = p_round_id;
  delete from public.round_scenario_workflows where round_id = p_round_id;
  delete from public.round_scenarios where round_id = p_round_id;
  delete from public.rounds where id = p_round_id;
end;
$$;

revoke all on function public.admin_update_round(uuid, text, text) from public, anon;
revoke all on function public.admin_delete_round(uuid) from public, anon;
grant execute on function public.admin_update_round(uuid, text, text) to authenticated;
grant execute on function public.admin_delete_round(uuid) to authenticated;
