-- One-time follow-up email tracking per submission (see /api/emails/followup).
alter table public.assessment_submissions
  add column if not exists sent_followup_email boolean not null default false;
