-- Plain-language dimension findings (Part 2 after ||PLAIN|| split in app layer).
alter table public.assessment_submissions
  add column if not exists dim_judgment_plain text,
  add column if not exists dim_relational_plain text,
  add column if not exists dim_synthesis_plain text,
  add column if not exists dim_creative_plain text,
  add column if not exists dim_adaptive_plain text;
