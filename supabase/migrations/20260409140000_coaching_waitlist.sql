-- Waitlist signups from /coaching (public insert via anon key + RLS).
create table if not exists public.coaching_waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  program text not null,
  created_at timestamptz not null default now()
);

create index if not exists coaching_waitlist_created_at_idx on public.coaching_waitlist (created_at desc);

alter table public.coaching_waitlist enable row level security;

-- Allow signups from the marketing page without login; no public reads.
drop policy if exists "coaching_waitlist_insert_anon_authenticated" on public.coaching_waitlist;
create policy "coaching_waitlist_insert_anon_authenticated"
  on public.coaching_waitlist
  for insert
  to anon, authenticated
  with check (true);
