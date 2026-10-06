-- Correr en el SQL Editor de Supabase. Devuelve UNA celda de texto:
-- copiala completa y guardala como supabase/01-esquema.sql
with
tablas as (
  select format(E'create table if not exists public.%I (\n%s\n);\n',
    c.relname,
    (select string_agg(format('  %I %s%s%s', a.attname,
        format_type(a.atttypid, a.atttypmod),
        case when a.attnotnull then ' not null' else '' end,
        coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '')), E',\n' order by a.attnum)
       from pg_attribute a
       left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped)) as t
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
cons as (
  select format('alter table public.%I add constraint %I %s;', c.conrelid::regclass::text, c.conname, pg_get_constraintdef(c.oid)) as t
  from pg_constraint c join pg_namespace n on n.oid = c.connamespace
  where n.nspname = 'public' and c.contype <> 'n' order by c.contype desc, c.conname
),
rls as (
  select format('alter table public.%I enable row level security;', c.relname) as t
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
),
pols as (
  select format('create policy %I on public.%I as %s for %s to %s%s%s;',
    policyname, tablename, lower(permissive), cmd, array_to_string(roles, ', '),
    coalesce(E'\n  using (' || qual || ')', ''), coalesce(E'\n  with check (' || with_check || ')', '')) as t
  from pg_policies where schemaname = 'public'
),
funcs as (
  select pg_get_functiondef(p.oid) || ';' as t
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
),
trigs as (
  select pg_get_triggerdef(t.oid) || ';' as t
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
)
select concat_ws(E'\n\n',
  '-- ESQUEMA BASE (exportado)',
  (select string_agg(t, E'\n') from tablas),
  (select string_agg(t, E'\n') from cons),
  (select string_agg(t, E'\n') from rls),
  (select string_agg(t, E'\n') from pols),
  (select string_agg(t, E'\n\n') from funcs),
  (select string_agg(t, E'\n') from trigs)
) as esquema;
