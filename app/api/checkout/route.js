import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// This safely checks for the key so the build doesn't crash
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export async function POST(req) {
  try {
    const { priceId } = await req.json();
    
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe Secret Key is missing in Environment Variables.");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}