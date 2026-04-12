import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseAdmin, unlockBearingReportForUser } from '@/app/lib/supabase-admin';

export async function POST(req) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Missing STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const sessionId = body?.sessionId;
    const userId = body?.userId;
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid sessionId.' }, { status: 400 });
    }
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId.' }, { status: 400 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const metaUserId =
      session.metadata?.supabase_user_id ||
      (typeof session.client_reference_id === 'string' ? session.client_reference_id : null);
    if (metaUserId !== userId) {
      return NextResponse.json({ error: 'Session does not match this user.' }, { status: 403 });
    }

    const paid =
      session.payment_status === 'paid' ||
      session.payment_status === 'no_payment_required';
    if (!paid) {
      return NextResponse.json({ error: 'Checkout session is not paid yet.' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Server is not configured to update access (missing SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 500 }
      );
    }

    await unlockBearingReportForUser(admin, userId);
    return NextResponse.json({ verified: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Confirmation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
