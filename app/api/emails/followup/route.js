import { NextResponse } from 'next/server';
import { runFollowupEmails } from '@/app/lib/followup-email';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
}

function authorize(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/**
 * Processes 48h follow-up emails (non-paying users in the 48–72h window).
 * Prefer calling via GET /api/emails/trigger (Vercel cron).
 */
export async function POST(req) {
  if (!authorize(req)) return unauthorized();

  const result = await runFollowupEmails();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sent: result.sent ?? 0 });
}
