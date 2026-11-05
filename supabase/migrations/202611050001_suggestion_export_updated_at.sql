drop function public.list_test_suggestions();

create function public.list_test_suggestions()
returns table (
  id uuid,
  module text,
  title text,
  description text,
  shared_document_url text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
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
    s.updated_at,
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
