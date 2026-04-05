import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// This connects your app to your Stripe account using your Secret Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { priceId } = await request.json();

    // This creates a "Checkout Session" — a temporary unique URL for the customer to pay
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId, // This is your price_1TIudo... ID
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}