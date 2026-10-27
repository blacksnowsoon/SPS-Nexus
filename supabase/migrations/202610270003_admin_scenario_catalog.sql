create or replace function public.admin_create_catalog_scenario(
  p_module text,
  p_section text,
  p_category text,
  p_source_number integer,
  p_title text,
  p_description text,
  p_steps text[],
  p_expected text[]
)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_scenario_id text;
  v_source_order integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_module, ''))) = 0
    or length(trim(coalesce(p_section, ''))) = 0
    or length(trim(coalesce(p_title, ''))) = 0
    or coalesce(p_source_number, 0) < 1 then
    raise exception 'Module, section, title, and a positive scenario number are required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('public.scenarios.source_order'));
  select coalesce(max(source_order), 0) + 1 into v_source_order from public.scenarios;
  v_scenario_id := 'custom-' || gen_random_uuid()::text;

  insert into public.scenarios (
    id, source_order, module, section, category, source_number, title, description, steps, expected, is_builtin
  ) values (
    v_scenario_id,
    v_source_order,
    trim(p_module),
    trim(p_section),
    coalesce(trim(p_category), ''),
    p_source_number,
    trim(p_title),
    coalesce(trim(p_description), ''),
    to_jsonb(coalesce(p_steps, array[]::text[])),
    to_jsonb(coalesce(p_expected, array[]::text[])),
    false
  );

  return v_scenario_id;
end;
$$;

create or replace function public.admin_update_catalog_scenario(
  p_scenario_id text,
  p_module text,
  p_section text,
  p_category text,
  p_source_number integer,
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
  if length(trim(coalesce(p_module, ''))) = 0
    or length(trim(coalesce(p_section, ''))) = 0
    or length(trim(coalesce(p_title, ''))) = 0
    or coalesce(p_source_number, 0) < 1 then
    raise exception 'Module, section, title, and a positive scenario number are required' using errcode = '22023';
  end if;

  update public.scenarios
  set module = trim(p_module),
      section = trim(p_section),
      category = coalesce(trim(p_category), ''),
      source_number = p_source_number,
      title = trim(p_title),
      description = coalesce(trim(p_description), ''),
      steps = to_jsonb(coalesce(p_steps, array[]::text[])),
      expected = to_jsonb(coalesce(p_expected, array[]::text[]))
  where id = p_scenario_id;

  if not found then
    raise exception 'Scenario not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_create_catalog_scenario(text, text, text, integer, text, text, text[], text[]) from public, anon;
revoke all on function public.admin_update_catalog_scenario(text, text, text, text, integer, text, text, text[], text[]) from public, anon;
grant execute on function public.admin_create_catalog_scenario(text, text, text, integer, text, text, text[], text[]) to authenticated;
grant execute on function public.admin_update_catalog_scenario(text, text, text, text, integer, text, text, text[], text[]) to authenticated;
