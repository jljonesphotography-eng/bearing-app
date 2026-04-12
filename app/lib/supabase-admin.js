import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function unlockBearingReportForUser(admin, userId) {
  const { data, error: getErr } = await admin.auth.admin.getUserById(userId);
  if (getErr) throw getErr;
  const user = data?.user;
  if (!user) throw new Error('User not found');

  const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...user.user_metadata, bearing_report_unlocked: true }
  });
  if (updErr) throw updErr;
}
