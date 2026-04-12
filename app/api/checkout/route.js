import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Missing STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia'
    });

    const body = await req.json();
    const { priceId, userId } = body;
    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid priceId.' },
        { status: 400 }
      );
    }
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId (signed-in user id required for checkout).' },
        { status: 400 }
      );
    }

    const origin =
      req.headers.get('origin') ||
      `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}`;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      client_reference_id: userId,
      metadata: { supabase_user_id: userId },
      success_url: `${origin}/dashboard?checkout_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?canceled=true`
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe did not return a checkout URL.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}