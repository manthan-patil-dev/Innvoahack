-- ============================================================================
-- LifeOS AI — Supabase schema
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--
-- This file is IDEMPOTENT: running it twice does nothing the second time and
-- raises no error. Every statement is either `if not exists`, `or replace`, or
-- a `drop ... if exists` immediately followed by its `create`.
--
-- SECTIONS
--   1. Helper function        5. Row Level Security
--   2. Tables                 6. Grants
--   3. Indexes                7. Seed data
--   4. Triggers & views       8. Self-check
--
-- NOT USED BY THE APP YET. This is the storage layer; the FastAPI backend does
-- not write to it today. See the notes at the bottom of the file.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. Prerequisites — deliberately none
-- ---------------------------------------------------------------------------
-- `gen_random_uuid()` is built into PostgreSQL 13+, which every Supabase
-- project runs. `uuid_generate_v4()` is NOT used anywhere below, on purpose:
-- it needs the uuid-ossp extension, and "function uuid_generate_v4() does not
-- exist" is the most common error when pasting a schema into a fresh project.


-- ---------------------------------------------------------------------------
-- 1. Shared helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

-- 2.1 profiles — who owns everything else.
--
-- `id` is the auth.users id. The foreign key is added in section 2.10 rather
-- than inline, so this file still applies cleanly to a project that ran the
-- pre-Supabase-Auth version of the schema.
create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2.2 runs — one trip through the LifeCore pipeline.
--
-- Mirrors ChatResponse in backend/app/schemas/chat.py. The ResponseAgent's
-- output is flattened into headline / unified_report / priority_alerts /
-- dashboard_updates rather than stored as one blob, so the history list can be
-- rendered without parsing JSON in the client.
create table if not exists public.runs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,

  -- The orchestrator's own `sesn_xxx` id. Plain text with an index rather than
  -- a sessions table: grouping is a GROUP BY, and there is no insert ordering
  -- to get wrong.
  session_id        text not null,

  query             text not null,
  -- Verbatim from the API: "groq", "openai", "mock", or "groq+mock" for a
  -- partially degraded run. Never normalised — a mixed run must stay visible.
  backend           text not null default 'unknown',
  status            text not null default 'complete'
                      check (status in ('running', 'complete', 'error')),
  error_message     text,

  intent            jsonb not null default '{}'::jsonb,
  selected_agents   text[] not null default '{}',

  headline          text,
  unified_report    text,
  priority_alerts   jsonb not null default '[]'::jsonb,
  dashboard_updates jsonb not null default '{}'::jsonb,

  -- Summed per-agent time, not wall clock: specialists run concurrently.
  agent_time_ms     integer not null default 0,
  retry_count       integer not null default 0,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 2.3 plan_steps — what the Planner decided, before anything ran.
create table if not exists public.plan_steps (
  id        uuid primary key default gen_random_uuid(),
  run_id    uuid not null references public.runs(id) on delete cascade,
  step      integer not null,
  task      text not null,
  -- Only the four specialists are routable; the Critic is invoked by LifeCore.
  agent     text not null
              check (agent in ('FinanceAgent', 'TravelAgent',
                               'SecurityAgent', 'DocumentAgent')),
  input_key text not null default 'user_query',
  unique (run_id, step)
);

-- 2.4 run_nodes — the pipeline trace, including retries.
create table if not exists public.run_nodes (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references public.runs(id) on delete cascade,
  step       integer not null,
  agent      text not null
               check (agent in ('IntentAgent', 'PlannerAgent', 'RouterAgent',
                                'FinanceAgent', 'TravelAgent', 'SecurityAgent',
                                'DocumentAgent', 'CriticAgent', 'ResponseAgent')),
  label      text not null,
  status     text not null default 'success'
               check (status in ('pending', 'running', 'success', 'failed')),
  -- Nullable, and 0 is a real value: the Router is synchronous.
  elapsed_ms integer,
  attempts   integer not null default 1,
  retried    boolean not null default false,
  note       text,
  unique (run_id, step)
);

-- 2.5 agent_results — one specialist payload, validated then stored as-is.
create table if not exists public.agent_results (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references public.runs(id) on delete cascade,
  agent      text not null
               check (agent in ('FinanceAgent', 'TravelAgent',
                                'SecurityAgent', 'DocumentAgent')),
  output     jsonb not null,
  created_at timestamptz not null default now(),
  unique (run_id, agent)
);

-- 2.6 critic_verdicts — why a retry happened. The audit trail for
-- self-correction, which is the part of the demo worth being able to prove.
create table if not exists public.critic_verdicts (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references public.runs(id) on delete cascade,
  agent            text not null
                     check (agent in ('FinanceAgent', 'TravelAgent',
                                      'SecurityAgent', 'DocumentAgent')),
  valid            boolean not null default true,
  issues           text[] not null default '{}',
  retry_needed     boolean not null default false,
  corrected_output jsonb,
  unique (run_id, agent)
);

-- 2.7 action_items — backs the Action Center. Ticking is currently local to
-- the browser; this is where it goes to survive a refresh.
create table if not exists public.action_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  run_id       uuid references public.runs(id) on delete cascade,
  -- The id the browser already computed for this row (e.g. "FinanceAgent-alert-0").
  -- Ticking addresses rows by (run_id, client_key), so the checklist never has
  -- to wait for the run to finish saving before it becomes interactive.
  client_key   text,
  -- `body`, not `text`: a column literally named text is legal but reads as a
  -- type everywhere it appears in a query.
  body         text not null,
  source_agent text not null,
  kind         text not null default 'action'
                 check (kind in ('alert', 'reminder', 'recommendation',
                                 'action', 'expiry', 'warning')),
  priority     text not null default 'MEDIUM'
                 check (priority in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  -- Free text, not a date: agents emit "2026-08-02" and "before the 15th".
  due          text,
  done         boolean not null default false,
  done_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- 2.8 memories — backs Memory & Timeline. Today that screen renders seeded
-- constants and says so; this table is what makes the claim true.
create table if not exists public.memories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null
                  check (kind in ('preference', 'constraint', 'entity', 'pattern')),
  value         text not null,
  -- Which run taught us this. Kept as set-null so pruning runs never deletes
  -- the memory they produced.
  source_run_id uuid references public.runs(id) on delete set null,
  last_used_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, kind, value)
);

-- 2.9 email_deliveries — audit for the Resend flow. Records failures too:
-- an unverified sending domain is the failure that actually happens, and it is
-- worth being able to show it happened rather than guessing.
create table if not exists public.email_deliveries (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  run_id              uuid references public.runs(id) on delete set null,
  to_email            text not null,
  subject             text not null,
  provider            text not null default 'resend',
  provider_message_id text,
  status              text not null check (status in ('sent', 'failed')),
  error_code          text,
  error_message       text,
  created_at          timestamptz not null default now()
);


-- 2.10 Supabase Auth compatibility
--
-- This block is what makes the schema safe to re-run over the earlier,
-- pre-Supabase-Auth version of itself. It is all conditional: on a fresh
-- project every statement is a no-op past the first.

-- (a) action_items.client_key, for a project created before it existed.
alter table public.action_items add column if not exists client_key text;

-- (b) Drop any profile that has no matching auth user. The earlier schema
--     seeded a fixed uuid (0000…0001) that no real account will ever own, and
--     the foreign key below cannot be added while it is still there.
--     `cascade` on the FK means its runs and memories go with it — they were
--     demo seed rows, not anybody's data.
delete from public.profiles p
where not exists (select 1 from auth.users u where u.id = p.id);

-- (c) profiles.id must be an auth.users id. Wrapped because `add constraint`
--     has no IF NOT EXISTS form and re-running would otherwise fail with
--     "constraint profiles_id_fkey ... already exists".
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end;
$$;

-- (d) Create the profile automatically when an account is created, and give it
--     the starter memories so Memory & Timeline is not empty on first sign-in.
--
--     security definer is required: this runs as part of Supabase's own signup
--     transaction, where the caller has no rights on public.profiles. The
--     search_path is pinned for the same reason — a security definer function
--     with a mutable search_path is a privilege-escalation hole.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.memories (user_id, kind, value)
  values
    (new.id, 'preference', 'Prefers train over flights for trips under 800km.'),
    (new.id, 'constraint', 'Monthly dining cap set at Rs 8,000.'),
    (new.id, 'entity',     'Primary bank is HDFC - flag lookalike domains aggressively.'),
    (new.id, 'pattern',    'Salary credits on the 1st; discretionary spending peaks days 2-6.')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- (e) Backfill: if an account was created in the dashboard before this trigger
--     existed, give it its profile and starter memories now.
insert into public.profiles (id, email, display_name)
select u.id, coalesce(u.email, ''), split_part(coalesce(u.email, ''), '@', 1)
from auth.users u
on conflict (id) do nothing;

insert into public.memories (user_id, kind, value)
select p.id, seed.kind, seed.value
from public.profiles p
cross join (values
  ('preference', 'Prefers train over flights for trips under 800km.'),
  ('constraint', 'Monthly dining cap set at Rs 8,000.'),
  ('entity',     'Primary bank is HDFC - flag lookalike domains aggressively.'),
  ('pattern',    'Salary credits on the 1st; discretionary spending peaks days 2-6.')
) as seed(kind, value)
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
-- Every foreign key gets one: Postgres indexes the primary key side
-- automatically but never the referencing side, and an unindexed FK turns
-- `delete from runs` into a sequential scan of every child table.

create index if not exists runs_user_created_idx
  on public.runs (user_id, created_at desc);
create index if not exists runs_session_idx
  on public.runs (session_id);

create index if not exists plan_steps_run_idx       on public.plan_steps (run_id);
create index if not exists run_nodes_run_idx        on public.run_nodes (run_id);
create index if not exists agent_results_run_idx    on public.agent_results (run_id);
create index if not exists critic_verdicts_run_idx  on public.critic_verdicts (run_id);

create index if not exists action_items_user_idx
  on public.action_items (user_id, done, created_at desc);
create index if not exists action_items_run_idx     on public.action_items (run_id);
-- Ticking updates by (run_id, client_key); unique so a retried save cannot
-- create a second row for the same checklist entry.
create unique index if not exists action_items_run_client_key_idx
  on public.action_items (run_id, client_key)
  where client_key is not null;

create index if not exists memories_user_idx        on public.memories (user_id, kind);

create index if not exists email_deliveries_user_idx
  on public.email_deliveries (user_id, created_at desc);
create index if not exists email_deliveries_run_idx on public.email_deliveries (run_id);


-- ---------------------------------------------------------------------------
-- 4. Triggers and views
-- ---------------------------------------------------------------------------
-- `create trigger if not exists` does not exist in PostgreSQL, so each one is
-- dropped first. That is the whole reason this section looks repetitive.

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists runs_set_updated_at on public.runs;
create trigger runs_set_updated_at
  before update on public.runs
  for each row execute function public.set_updated_at();

drop trigger if exists memories_set_updated_at on public.memories;
create trigger memories_set_updated_at
  before update on public.memories
  for each row execute function public.set_updated_at();

-- One row per run with the counts the history screen needs, so listing runs is
-- a single select instead of five.
--
-- `drop` then `create`, not `create or replace`: replacing a view whose column
-- list changed fails with "cannot change name of view column".
--
-- security_invoker makes the view respect the caller's RLS. Without it a view
-- runs with its owner's rights and quietly hands every user everyone's runs.
-- It requires PostgreSQL 15+; if your project predates that, delete the
-- `with (...)` clause and keep this view out of client-facing queries.
drop view if exists public.run_overview;
create view public.run_overview
  with (security_invoker = true)
as
select
  r.id,
  r.user_id,
  r.session_id,
  r.query,
  r.backend,
  r.status,
  r.headline,
  r.created_at,
  (select count(*) from public.run_nodes n
     where n.run_id = r.id)                     as node_count,
  (select count(*) from public.agent_results a
     where a.run_id = r.id)                     as specialist_count,
  (select count(*) from public.run_nodes n
     where n.run_id = r.id and n.retried)       as retried_nodes,
  -- True when any part of the run came from fixtures, including "groq+mock".
  (r.backend like '%mock%')                     as served_from_fixtures
from public.runs r;


-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------
-- READ THIS BEFORE DEBUGGING AN EMPTY RESULT.
--
-- RLS is on for every table. That means:
--   * an AUTHENTICATED Supabase Auth user sees only rows whose owner is
--     auth.uid() — this is the path the app actually uses, for every read and
--     every write;
--   * the ANON/PUBLISHABLE key alone sees NOTHING, by design. It only carries
--     a signed-in user's session; without one it is not an identity;
--   * the SERVICE ROLE key would bypass all of this. The app does not use one
--     and does not need one — if you find yourself reaching for it to make a
--     query work, the policy is wrong, not the key.
--
-- If a select returns zero rows with no error, or an insert fails with "new row
-- violates row-level security policy", you are querying without a session.
-- Neither is a bug in this schema.

alter table public.profiles         enable row level security;
alter table public.runs             enable row level security;
alter table public.plan_steps       enable row level security;
alter table public.run_nodes        enable row level security;
alter table public.agent_results    enable row level security;
alter table public.critic_verdicts  enable row level security;
alter table public.action_items     enable row level security;
alter table public.memories         enable row level security;
alter table public.email_deliveries enable row level security;

-- `create policy if not exists` also does not exist, so these loops drop and
-- recreate. Two loops because ownership is expressed two different ways.

-- 5.1 Tables owned directly by a user.
do $$
declare
  t text;
  owner_column text;
begin
  foreach t in array array[
    'profiles', 'runs', 'action_items', 'memories', 'email_deliveries'
  ] loop
    -- profiles is its own owner; everything else points at it.
    owner_column := case when t = 'profiles' then 'id' else 'user_id' end;

    execute format('drop policy if exists %I on public.%I', t || '_owner_rw', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (auth.uid() = %I) with check (auth.uid() = %I)',
      t || '_owner_rw', t, owner_column, owner_column
    );
  end loop;
end;
$$;

-- 5.2 Tables owned through their run.
do $$
declare
  t text;
begin
  foreach t in array array[
    'plan_steps', 'run_nodes', 'agent_results', 'critic_verdicts'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_rw', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (exists (select 1 from public.runs r
                         where r.id = run_id and r.user_id = auth.uid()))
         with check (exists (select 1 from public.runs r
                              where r.id = run_id and r.user_id = auth.uid()))',
      t || '_owner_rw', t
    );
  end loop;
end;
$$;


-- ---------------------------------------------------------------------------
-- 6. Grants
-- ---------------------------------------------------------------------------
-- Supabase normally applies these by default privilege; setting them
-- explicitly means the schema behaves the same in a project whose defaults
-- have been changed. RLS above is the actual gate — these only decide who may
-- attempt a query at all.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- anon is granted nothing on purpose. Nothing in LifeOS is public data.


-- ---------------------------------------------------------------------------
-- 7. Seed
-- ---------------------------------------------------------------------------
-- There is deliberately nothing to seed here.
--
-- Profiles and starter memories are created by the on_auth_user_created trigger
-- in section 2.10, keyed to a real auth.users id. A hardcoded demo profile
-- would now violate profiles_id_fkey, and inventing a user row that no one can
-- sign in as was never useful anyway.
--
-- To get an account: Supabase Dashboard -> Authentication -> Users -> Add user
-- -> tick "Auto Confirm User". The trigger does the rest.


-- ---------------------------------------------------------------------------
-- 8. Self-check
-- ---------------------------------------------------------------------------
-- Run this on its own afterwards. Expect: 9 tables, 1 view, 9 policies,
-- 1 auth trigger, 1 FK to auth.users. profiles/memories are 0 until an account
-- exists — create one in the dashboard and they become 1 and 4.

-- select
--   (select count(*) from pg_tables
--      where schemaname = 'public'
--        and tablename in ('profiles','runs','plan_steps','run_nodes',
--                          'agent_results','critic_verdicts','action_items',
--                          'memories','email_deliveries'))            as tables,
--   (select count(*) from pg_views
--      where schemaname = 'public' and viewname = 'run_overview')     as views,
--   (select count(*) from pg_policies where schemaname = 'public')    as policies,
--   (select count(*) from pg_trigger
--      where tgname = 'on_auth_user_created')                         as auth_trigger,
--   (select count(*) from pg_constraint
--      where conname = 'profiles_id_fkey')                            as auth_fk,
--   (select count(*) from public.profiles)                            as profiles,
--   (select count(*) from public.memories)                            as memories;


-- ============================================================================
-- NOTES
--
-- 1. WHO WRITES TO THIS.
--    The Next.js app, in lib/supabase/queries.ts, using the signed-in user's
--    own session. The FastAPI backend still only orchestrates — it holds no
--    Supabase credentials, which is why there is no service-role key anywhere
--    in this project.
--
--    Insert order matters — runs first, then its children:
--      runs -> plan_steps -> run_nodes -> agent_results -> critic_verdicts
--    Any other order fails with "violates foreign key constraint".
--
-- 2. CREATING THE DEMO ACCOUNT.
--    Dashboard -> Authentication -> Users -> Add user, with "Auto Confirm User"
--    ticked. Without that tick the account exists but cannot sign in, and the
--    login form will say "Email not confirmed" — which is Supabase telling the
--    truth, not a bug in the app.
--
-- 3. TO ALLOW A NEW AGENT NAME, relax the check rather than dropping it:
--      alter table public.run_nodes drop constraint run_nodes_agent_check;
--      alter table public.run_nodes add constraint run_nodes_agent_check
--        check (agent in (..., 'YourNewAgent'));
--
-- 4. TO START OVER (destroys all app data; leaves auth.users alone):
--      drop trigger if exists on_auth_user_created on auth.users;
--      drop function if exists public.handle_new_user();
--      drop view if exists public.run_overview;
--      drop table if exists public.email_deliveries, public.memories,
--        public.action_items, public.critic_verdicts, public.agent_results,
--        public.run_nodes, public.plan_steps, public.runs, public.profiles
--        cascade;
--    Then re-run this file. To also remove the accounts, delete them in
--    Dashboard -> Authentication -> Users.
-- ============================================================================
