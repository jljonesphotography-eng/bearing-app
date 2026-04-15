-- Evidence-quality score from AI (0–100); nullable for legacy rows.
alter table public.assessment_submissions
  add column if not exists capability_score integer;
