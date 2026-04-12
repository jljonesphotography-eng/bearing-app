-- Run in Supabase SQL Editor or via `supabase db push` if linked.
-- Adds nullable text columns for per-dimension findings on assessment_submissions.

alter table public.assessment_submissions
  add column if not exists dim_judgment text,
  add column if not exists dim_relational text,
  add column if not exists dim_synthesis text,
  add column if not exists dim_creative text,
  add column if not exists dim_adaptive text;
