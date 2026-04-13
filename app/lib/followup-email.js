import { Resend } from 'resend';
import { createSupabaseAdmin } from '@/app/lib/supabase-admin';

const REPORT_URL = 'https://bearing-app-j-2026.vercel.app/dashboard/report';
const NAVY = '#1B3A6B';
const TEAL = '#0A5F63';

function defaultFrom() {
  return process.env.RESEND_FROM?.trim() || 'Bearing <hello@bearing.app>';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHtml(primaryFinding) {
  const finding = escapeHtml(primaryFinding || '—');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'IBM Plex Sans',ui-sans-serif,system-ui,sans-serif;background-color:#faf9f6;color:#1a1916;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f6;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;">
          <tr>
            <td style="font-size:16px;line-height:1.55;color:#1a1916;padding-bottom:16px;">
              The assessment found something specific about what you bring:
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <blockquote style="margin:0;padding:16px 20px;font-size:18px;font-style:italic;line-height:1.5;color:#1a1916;border-left:4px solid ${NAVY};background-color:#ffffff;">
                ${finding}
              </blockquote>
            </td>
          </tr>
          <tr>
            <td style="font-size:14px;line-height:1.55;color:#1a1916;padding-bottom:24px;">
              Your full report — including your AI Collaboration Guide and 30-day action map — is waiting.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:28px;">
              <a href="${REPORT_URL}" style="display:inline-block;background-color:${TEAL};color:#ffffff;font-size:15px;font-weight:600;font-family:'IBM Plex Sans',ui-sans-serif,system-ui,sans-serif;text-decoration:none;padding:12px 28px;border-radius:8px;">
                View Your Report
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#6B6A66;line-height:1.5;">
              Bearing — Human Capability Intelligence
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * @returns {Promise<{ ok: boolean, sent?: number, skipped?: string, error?: string }>}
 */
export async function runFollowupEmails() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'Missing RESEND_API_KEY.' };
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' };
  }

  const now = Date.now();
  const ms48h = 48 * 60 * 60 * 1000;
  const ms72h = 72 * 60 * 60 * 1000;
  const createdAfter = new Date(now - ms72h).toISOString();
  const createdBefore = new Date(now - ms48h).toISOString();

  const { data: rows, error: qErr } = await admin
    .from('assessment_submissions')
    .select('id, user_id, primary_finding, verdict, created_at, sent_followup_email')
    .not('verdict', 'is', null)
    .eq('sent_followup_email', false)
    .gte('created_at', createdAfter)
    .lte('created_at', createdBefore);

  if (qErr) {
    return { ok: false, error: qErr.message };
  }

  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) {
    return { ok: true, sent: 0 };
  }

  const userCache = new Map();

  async function getUserCached(userId) {
    if (userCache.has(userId)) return userCache.get(userId);
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) {
      userCache.set(userId, null);
      return null;
    }
    userCache.set(userId, data.user);
    return data.user;
  }

  async function userAlreadyGotFollowup(userId) {
    const { count, error } = await admin
      .from('assessment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('sent_followup_email', true);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  // Latest submission per user in this result set (by created_at desc)
  const byUser = new Map();
  for (const row of list) {
    const uid = row.user_id;
    if (!uid) continue;
    const prev = byUser.get(uid);
    if (!prev || new Date(row.created_at) > new Date(prev.created_at)) {
      byUser.set(uid, row);
    }
  }

  const resend = new Resend(apiKey);
  let sent = 0;

  for (const row of byUser.values()) {
    const userId = row.user_id;
    if (!userId) continue;

    try {
      if (await userAlreadyGotFollowup(userId)) {
        continue;
      }

      const user = await getUserCached(userId);
      if (!user?.email) continue;

      if (user.user_metadata?.bearing_report_unlocked === true) {
        continue;
      }

      const primaryFinding = row.primary_finding ? String(row.primary_finding).trim() : '';
      const { error: sendErr } = await resend.emails.send({
        from: defaultFrom(),
        to: user.email,
        subject: 'Your capability assessment is ready.',
        html: buildEmailHtml(primaryFinding)
      });

      if (sendErr) {
        console.error('[followup-email] Resend error for user', userId, sendErr);
        continue;
      }

      const { error: updErr } = await admin
        .from('assessment_submissions')
        .update({ sent_followup_email: true })
        .eq('id', row.id);

      if (updErr) {
        console.error('[followup-email] Failed to mark sent for submission', row.id, updErr);
        continue;
      }

      sent += 1;
    } catch (e) {
      console.error('[followup-email] Row error', row.id, e);
    }
  }

  return { ok: true, sent };
}
