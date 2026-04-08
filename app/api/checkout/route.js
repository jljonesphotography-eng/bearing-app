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

    const { priceId } = await req.json();
    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid priceId.' },
        { status: 400 }
      );
    }

    const origin =
      req.headers.get('origin') ||
      `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}`;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/dashboard?success=true`,
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