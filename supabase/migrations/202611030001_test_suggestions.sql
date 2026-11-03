create table public.test_suggestions (
  id uuid primary key default gen_random_uuid(),
  module text not null check (length(trim(module)) > 0),
  title text not null check (length(trim(title)) > 0),
  description text not null check (length(trim(description)) > 0),
  shared_document_url text check (
    shared_document_url is null
    or shared_document_url ~* '^https?://'
  ),
  created_by uuid not null references public.profiles(id),
  status text not null default 'draft' check (status in ('draft', 'sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index test_suggestions_created_at_idx
  on public.test_suggestions(created_at desc);

alter table public.test_suggestions enable row level security;

create policy "Active users can read suggestions"
  on public.test_suggestions for select to authenticated
  using (
    (select public.is_active_user())
    and (status = 'sent' or created_by = (select auth.uid()))
  );

create policy "Active users can insert own drafts"
  on public.test_suggestions for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.is_active_user())
    and status = 'draft'
  );

create policy "Active users can update own suggestions"
  on public.test_suggestions for update to authenticated
  using (
    created_by = (select auth.uid())
    and (select public.is_active_user())
  )
  with check (
    created_by = (select auth.uid())
    and (select public.is_active_user())
  );

create trigger test_suggestions_set_updated_at
before update on public.test_suggestions
for each row execute function public.set_updated_at();

create or replace function public.list_test_suggestions()
returns table (
  id uuid,
  module text,
  title text,
  description text,
  shared_document_url text,
  created_by uuid,
  created_at timestamptz,
  author_name text,
  avatar_url text,
  status text
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    s.id,
    s.module,
    s.title,
    s.description,
    s.shared_document_url,
    s.created_by,
    s.created_at,
    p.display_name,
    p.avatar_url,
    s.status
  from public.test_suggestions s
  join public.profiles p on p.id = s.created_by
  where public.is_active_user()
    and s.status = 'sent'
  order by s.created_at desc;
$$;

revoke all on function public.list_test_suggestions() from public, anon;
grant execute on function public.list_test_suggestions() to authenticated;
