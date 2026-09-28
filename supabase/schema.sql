-- =========================================================
--  Helen Regiani Nails — esquema do banco (Supabase / Postgres)
--  Rodar inteiro no SQL Editor do Supabase (pode rodar de novo; é idempotente).
-- =========================================================


-- ---------------------------------------------------------
-- Administradoras (quem acessa o painel)
-- Depois de rodar este arquivo:
--   insert into public.admins (email) values ('email-da-profissional@gmail.com');
-- ---------------------------------------------------------
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------
-- Perfis (criados automaticamente no primeiro login com Google)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "perfil: ver o próprio ou admin" on public.profiles;
create policy "perfil: ver o próprio ou admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "perfil: editar o próprio" on public.profiles;
create policy "perfil: editar o próprio" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- Estoque de esmaltes
-- ---------------------------------------------------------
create table if not exists public.polishes (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  code text,
  hex text not null check (hex ~ '^#[0-9a-fA-F]{6}$'),
  finish text,
  quantity int not null default 1 check (quantity >= 0),
  min_quantity int not null default 1 check (min_quantity >= 0),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.polishes enable row level security;

drop policy if exists "estoque: só admin" on public.polishes;
create policy "estoque: só admin" on public.polishes
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists polishes_touch on public.polishes;
create trigger polishes_touch before update on public.polishes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------
-- Paleta de cores do site (cada cor pode ser ligada a um esmalte do estoque)
-- ---------------------------------------------------------
create table if not exists public.palette_colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hex text not null check (hex ~ '^#[0-9a-fA-F]{6}$'),
  sort int not null default 0,
  active boolean not null default true,
  polish_id uuid references public.polishes on delete set null,
  created_at timestamptz not null default now()
);
alter table public.palette_colors enable row level security;

drop policy if exists "paleta: leitura pública das ativas" on public.palette_colors;
create policy "paleta: leitura pública das ativas" on public.palette_colors
  for select using (active or public.is_admin());
drop policy if exists "paleta: admin grava" on public.palette_colors;
create policy "paleta: admin grava" on public.palette_colors
  for insert with check (public.is_admin());
drop policy if exists "paleta: admin altera" on public.palette_colors;
create policy "paleta: admin altera" on public.palette_colors
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "paleta: admin apaga" on public.palette_colors;
create policy "paleta: admin apaga" on public.palette_colors
  for delete using (public.is_admin());

insert into public.palette_colors (name, hex, sort)
select * from (values
  ('Rosa Helen', '#E8588A', 1), ('Rosa bebé', '#F9C6D6', 2), ('Nude', '#E7B9A6', 3),
  ('Chocolate', '#5A2E1E', 4), ('Vermelho', '#C8102E', 5), ('Vinho', '#6D1A36', 6),
  ('Lilás', '#B79CE0', 7), ('Azul bebé', '#A9D3F0', 8), ('Menta', '#A8E0C8', 9),
  ('Branco', '#FAFAFA', 10), ('Preto', '#1E1A1C', 11), ('Dourado', '#D4AF37', 12)
) as v(name, hex, sort)
where not exists (select 1 from public.palette_colors);

-- Paleta pública (com o esmalte ligado, sem expor quantidades)
create or replace function public.get_palette()
returns table (id uuid, name text, hex text, sort int, polish_id uuid, polish_label text, polish_in_stock boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.hex, c.sort, c.polish_id,
         case when p.id is not null then concat_ws(' · ', p.brand, p.name, nullif(p.code, '')) end,
         coalesce(p.active and p.quantity > 0, false)
  from public.palette_colors c
  left join public.polishes p on p.id = c.polish_id
  where c.active
  order by c.sort, c.name;
$$;

-- Esmaltes disponíveis (para sugerir o mais parecido com uma cor personalizada)
create or replace function public.get_stock_colors()
returns table (id uuid, label text, hex text)
language sql stable security definer set search_path = public as $$
  select p.id, concat_ws(' · ', p.brand, p.name, nullif(p.code, '')), p.hex
  from public.polishes p
  where p.active and p.quantity > 0;
$$;

-- ---------------------------------------------------------
-- Unhas guardadas pelas clientes (máximo 5 por pessoa)
-- ---------------------------------------------------------
create table if not exists public.saved_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text check (char_length(name) <= 60),
  shape text not null check (char_length(shape) <= 20),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  finish text not null check (char_length(finish) <= 20),
  accent boolean not null default false,
  skin text check (skin ~ '^#[0-9a-fA-F]{6}$'),
  palette_color_id uuid references public.palette_colors on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists saved_designs_user_idx on public.saved_designs (user_id, created_at);
alter table public.saved_designs enable row level security;

drop policy if exists "unhas: ver as próprias ou admin" on public.saved_designs;
create policy "unhas: ver as próprias ou admin" on public.saved_designs
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "unhas: criar as próprias" on public.saved_designs;
create policy "unhas: criar as próprias" on public.saved_designs
  for insert with check (user_id = auth.uid());
drop policy if exists "unhas: editar as próprias" on public.saved_designs;
create policy "unhas: editar as próprias" on public.saved_designs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "unhas: apagar as próprias" on public.saved_designs;
create policy "unhas: apagar as próprias" on public.saved_designs
  for delete using (user_id = auth.uid());

create or replace function public.enforce_design_limit()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if (select count(*) from public.saved_designs where user_id = new.user_id) >= 5 then
    raise exception 'Limite de 5 unhas guardadas' using hint = 'LIMIT_5';
  end if;
  return new;
end $$;

drop trigger if exists saved_designs_limit on public.saved_designs;
create trigger saved_designs_limit before insert on public.saved_designs
  for each row execute function public.enforce_design_limit();

-- ---------------------------------------------------------
-- Rastreamento (eventos do site)
-- Qualquer visitante pode INSERIR; só admin pode LER.
-- ---------------------------------------------------------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id uuid not null,
  visitor_id uuid not null,
  user_id uuid,
  name text not null check (char_length(name) <= 40),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 4096)
);
create index if not exists events_created_idx on public.events (created_at);
create index if not exists events_session_idx on public.events (session_id, created_at);
create index if not exists events_visitor_idx on public.events (visitor_id);
alter table public.events enable row level security;

drop policy if exists "eventos: qualquer um registra" on public.events;
create policy "eventos: qualquer um registra" on public.events
  for insert to anon, authenticated with check (true);
drop policy if exists "eventos: só admin lê" on public.events;
create policy "eventos: só admin lê" on public.events
  for select using (public.is_admin());

-- data e usuária vêm do servidor, nunca do navegador
create or replace function public.events_stamp()
returns trigger language plpgsql as $$
begin
  new.created_at := now();
  new.user_id := auth.uid();
  return new;
end $$;

drop trigger if exists events_stamp on public.events;
create trigger events_stamp before insert on public.events
  for each row execute function public.events_stamp();

-- Etapas da jornada (onboarding). A ordem aqui é a ordem do funil.
create or replace function public.stage_of(ev text)
returns int language sql immutable as $$
  select case ev
    when 'page_view'        then 1  -- entrou no site
    when 'view_studio'      then 2  -- chegou ao estúdio
    when 'onboarding_start' then 2  -- ou começou o onboarding
    when 'design_customize' then 3  -- mexeu na unha
    when 'design_choose'    then 4  -- clicou "Quero esta"
    when 'booking_start'    then 5  -- começou a preencher a marcação
    when 'booking_submit'   then 6  -- enviou para o WhatsApp
    else 0 end;
$$;

-- ---------------------------------------------------------
-- Painel: tudo o que o dashboard precisa numa chamada
-- ---------------------------------------------------------
create or replace function public.admin_dashboard(
  p_from timestamptz,
  p_to timestamptz,
  p_tz text default 'America/Sao_Paulo'
)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  with ev as (
    select * from public.events where created_at >= p_from and created_at < p_to
  ),
  ses as (
    select
      session_id,
      (array_agg(visitor_id))[1] as visitor_id,
      min(created_at) as started_at,
      max(created_at) as ended_at,
      max(public.stage_of(name)) as max_stage,
      count(*) as n_events,
      (array_agg(user_id) filter (where user_id is not null))[1] as user_id,
      coalesce((array_agg(props order by created_at) filter (where name = 'page_view'))[1], '{}'::jsonb) as pv,
      bool_or(name = 'booking_submit') as booked
    from ev
    group by session_id
  ),
  ses2 as (
    select s.*,
      coalesce(nullif(pv ->> 'utm_source', ''), nullif(pv ->> 'ref', ''), 'Direto') as source,
      coalesce(nullif(pv ->> 'device', ''), 'desconhecido') as device
    from ses s
  ),
  dz as (
    select visitor_id, session_id, name, props, created_at
    from ev
    where name in ('design_choose', 'design_save', 'booking_submit') and props ? 'shape'
  ),
  onb as (
    -- passo mais alto do onboarding alcançado em cada visita
    select session_id,
           max(case when props ->> 'step' ~ '^[0-9]{1,2}$' then (props ->> 'step')::int end) as max_step
    from ev where name = 'onboarding_step'
    group by session_id
  )
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'visitors',        (select count(distinct visitor_id) from ev),
      'sessions',        (select count(*) from ses),
      'new_visitors',    (select count(*) from (
                            select visitor_id from public.events group by visitor_id
                            having min(created_at) >= p_from and min(created_at) < p_to) x),
      'pageviews',       (select count(*) from ev where name = 'page_view'),
      'bookings',        (select count(*) from ev where name = 'booking_submit'),
      'booked_sessions', (select count(*) from ses where booked),
      'avg_duration',    (select coalesce(avg(extract(epoch from ended_at - started_at)), 0)::int from ses where n_events > 1),
      'signups',         (select count(*) from public.profiles where created_at >= p_from and created_at < p_to),
      'saved_designs',   (select count(*) from ev where name = 'design_save'),
      'logged_visitors', (select count(distinct user_id) from ev where user_id is not null)
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'day', d::date,
               'visitors', coalesce(x.visitors, 0),
               'sessions', coalesce(x.sessions, 0),
               'bookings', coalesce(x.bookings, 0)) order by d), '[]'::jsonb)
      from generate_series(
             date_trunc('day', p_from at time zone p_tz),
             date_trunc('day', (p_to - interval '1 second') at time zone p_tz),
             interval '1 day') d
      left join (
        select date_trunc('day', created_at at time zone p_tz) as day,
               count(distinct visitor_id) as visitors,
               count(distinct session_id) as sessions,
               count(*) filter (where name = 'booking_submit') as bookings
        from ev group by 1
      ) x on x.day = d
    ),
    'funnel', (
      select jsonb_agg(jsonb_build_object('stage', s, 'sessions', (select count(*) from ses where max_stage >= s)) order by s)
      from generate_series(1, 6) s
    ),
    'stops', (
      select coalesce(jsonb_agg(jsonb_build_object('stage', max_stage, 'sessions', n) order by max_stage), '[]'::jsonb)
      from (select max_stage, count(*) as n from ses group by max_stage) x
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('key', source, 'sessions', n, 'booked', b) order by n desc), '[]'::jsonb)
      from (select source, count(*) as n, count(*) filter (where booked) as b from ses2 group by source order by n desc limit 12) x
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('key', device, 'sessions', n, 'booked', b) order by n desc), '[]'::jsonb)
      from (select device, count(*) as n, count(*) filter (where booked) as b from ses2 group by device) x
    ),
    'sections', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'sessions', n) order by n desc), '[]'::jsonb)
      from (select props ->> 'section' as k, count(distinct session_id) as n
            from ev where name = 'section_view' group by 1) x
    ),
    'interactions', (
      select coalesce(jsonb_agg(jsonb_build_object('key', name, 'count', n, 'sessions', s) order by n desc), '[]'::jsonb)
      from (select name, count(*) as n, count(distinct session_id) as s
            from ev where name in ('quiz_start', 'quiz_complete', 'gallery_open', 'service_click',
                                   'whatsapp_click', 'login', 'design_save', 'design_random', 'save_prompt')
            group by name) x
    ),
    'shapes', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'people', p, 'booked', b) order by p desc), '[]'::jsonb)
      from (select props ->> 'shape' as k, count(distinct visitor_id) as p,
                   count(distinct session_id) filter (where name = 'booking_submit') as b
            from dz group by 1) x
    ),
    'finishes', (
      select coalesce(jsonb_agg(jsonb_build_object('key', k, 'people', p, 'booked', b) order by p desc), '[]'::jsonb)
      from (select props ->> 'finish' as k, count(distinct visitor_id) as p,
                   count(distinct session_id) filter (where name = 'booking_submit') as b
            from dz group by 1) x
    ),
    'colors', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'hex', x.hex, 'name', x.cname, 'people', x.p, 'booked', x.b,
               'palette_id', pc.id, 'polish_id', pol.id,
               'polish_label', case when pol.id is not null then concat_ws(' · ', pol.brand, pol.name, nullif(pol.code, '')) end,
               'polish_qty', pol.quantity, 'polish_min', pol.min_quantity) order by x.p desc), '[]'::jsonb)
      from (select lower(props ->> 'color') as hex, max(props ->> 'color_name') as cname,
                   count(distinct visitor_id) as p,
                   count(distinct session_id) filter (where name = 'booking_submit') as b
            from dz group by 1 order by 3 desc limit 30) x
      left join lateral (
        select c.id, c.polish_id from public.palette_colors c where lower(c.hex) = x.hex order by c.active desc limit 1
      ) pc on true
      left join public.polishes pol on pol.id = pc.polish_id
    ),
    'combos', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'shape', shape, 'color', color, 'finish', finish, 'accent', accent,
               'color_name', cname, 'people', p, 'booked', b) order by p desc, b desc), '[]'::jsonb)
      from (select props ->> 'shape' as shape, lower(props ->> 'color') as color, props ->> 'finish' as finish,
                   coalesce(props ->> 'accent' = 'true', false) as accent, max(props ->> 'color_name') as cname,
                   count(distinct visitor_id) as p,
                   count(distinct session_id) filter (where name = 'booking_submit') as b
            from dz group by 1, 2, 3, 4 order by 6 desc, 7 desc limit 12) x
    ),
    'onboarding', jsonb_build_object(
      'invited',   (select count(distinct session_id) from ev where name = 'onboarding_invite'),
      'dismissed', (select count(distinct session_id) from ev where name = 'onboarding_invite_dismiss'),
      'started',   (select count(distinct session_id) from ev where name = 'onboarding_start'),
      'completed', (select count(distinct session_id) from ev where name = 'onboarding_complete'),
      'steps', (
        select jsonb_agg(jsonb_build_object('step', s, 'sessions', (select count(*) from onb where max_step >= s)) order by s)
        from generate_series(1, 6) s
      ),
      'exits', (
        select coalesce(jsonb_agg(jsonb_build_object('step', k, 'sessions', n) order by k), '[]'::jsonb)
        from (select case when props ->> 'step' ~ '^[0-9]{1,2}$' then (props ->> 'step')::int end as k,
                     count(distinct session_id) as n
              from ev where name = 'onboarding_close' group by 1) x
      ),
      'origins', (
        select coalesce(jsonb_agg(jsonb_build_object('key', k, 'sessions', n) order by n desc), '[]'::jsonb)
        from (select coalesce(props ->> 'from', 'outro') as k, count(distinct session_id) as n
              from ev where name = 'onboarding_start' group by 1) x
      ),
      'actions', (
        select coalesce(jsonb_agg(jsonb_build_object('key', k, 'sessions', n) order by n desc), '[]'::jsonb)
        from (select props ->> 'action' as k, count(distinct session_id) as n
              from ev where name = 'onboarding_action' group by 1) x
      ),
      'services', (
        select coalesce(jsonb_agg(jsonb_build_object('key', k, 'sessions', n) order by n desc), '[]'::jsonb)
        from (select coalesce(nullif(props ->> 'service', ''), 'Não escolheu') as k, count(distinct session_id) as n
              from ev where name = 'onboarding_complete' group by 1) x
      )
    ),
    'sessions', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.started_at desc), '[]'::jsonb)
      from (
        select s.session_id, s.visitor_id, s.started_at,
               extract(epoch from s.ended_at - s.started_at)::int as duration,
               s.max_stage, s.n_events, s.device, s.source,
               pr.full_name as user_name, pr.email as user_email, pr.avatar_url as user_avatar,
               (select count(distinct e3.session_id) from public.events e3 where e3.visitor_id = s.visitor_id) as visits,
               (select d.props from dz d where d.session_id = s.session_id order by d.created_at desc limit 1) as design,
               (select o.max_step from onb o where o.session_id = s.session_id) as onb_step,
               exists (select 1 from ev e5 where e5.session_id = s.session_id and e5.name = 'onboarding_complete') as onb_done
        from ses2 s
        left join public.profiles pr on pr.id = s.user_id
        order by s.started_at desc
        limit 150
      ) t
    )
  ) into result;

  return result;
end $$;

-- ---------------------------------------------------------
-- Permissões das funções
-- ---------------------------------------------------------
revoke execute on function public.admin_dashboard(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_dashboard(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_palette() to anon, authenticated;
grant execute on function public.get_stock_colors() to anon, authenticated;
