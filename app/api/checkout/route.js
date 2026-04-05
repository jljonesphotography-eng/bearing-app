import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
  
  try {
    const { priceId } = await req.json();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?canceled=true`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}