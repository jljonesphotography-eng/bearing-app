import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseAdmin, unlockBearingReportForUser } from '@/app/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    );
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId =
        session.metadata?.supabase_user_id ||
        (typeof session.client_reference_id === 'string' ? session.client_reference_id : null);

      if (!userId || typeof userId !== 'string') {
        console.warn('Stripe checkout.session.completed: no supabase user id on session', session.id);
        return NextResponse.json({ received: true, skipped: true }, { status: 200 });
      }

      const paid =
        session.payment_status === 'paid' ||
        session.payment_status === 'no_payment_required';
      if (!paid) {
        return NextResponse.json({ received: true, skipped: true }, { status: 200 });
      }

      await unlockBearingReportForUser(admin, userId);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Webhook handler failed.';
    console.error('Stripe webhook error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
