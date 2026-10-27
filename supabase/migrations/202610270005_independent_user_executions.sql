-- A tester's execution is independent of the shared scenario workflow.
-- Keep the round-level active check, but do not lock teammates out when
-- another tester reports an issue or an admin changes workflow status.
drop policy if exists "Users insert own execution while round is open"
  on public.scenario_executions;
drop policy if exists "Users update own execution while round is open"
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
  );
