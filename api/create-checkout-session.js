// ============================================================
// Create Stripe Checkout Session
// Path: api/create-checkout-session.js
// Deploy: Vercel Serverless Function
// ============================================================

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Body type → English name mapping
const BODY_TYPE_EN = {
  'soft-wave':     'Soft Wave',
  'soft-natural':  'Soft Natural',
  'hard-wave':     'Hard Wave',
  'hard-natural':  'Hard Natural',
  'soft-straight': 'Soft Straight',
  'hard-straight': 'Hard Straight',
  'S-Soft':        'Soft Straight',
  'S-H':           'Hard Straight',
  'W-Soft':        'Soft Wave',
  'W-H':           'Hard Wave',
  'N-Soft':        'Soft Natural',
  'N-H':           'Hard Natural',
};

// Convert frontend type key to backend file key
const TYPE_KEY_MAP = {
  'S-Soft': 'soft-straight',
  'S-H':    'hard-straight',
  'W-Soft': 'soft-wave',
  'W-H':    'hard-wave',
  'N-Soft': 'soft-natural',
  'N-H':    'hard-natural',
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, orderId, bodyType, typeName } = req.body;

  // Validation
  if (!email || !orderId) {
    return res.status(400).json({ error: 'Email and order ID are required' });
  }

  // Normalize body type to backend file key
  const normalizedBodyType = TYPE_KEY_MAP[bodyType] || bodyType;
  const displayName = typeName || BODY_TYPE_EN[bodyType] || 'Personalized Style';

  // Build the success/cancel URLs
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'paypal'],

      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 2900, // $29.00 in cents
            product_data: {
              name: `AWAYS ${displayName} Style Guide`,
              description: '22-page personalized PDF style guide based on your body type',
              // Optional: add image URL if you have a public product image
              // images: ['https://your-domain.com/product-thumb.jpg'],
            },
          },
          quantity: 1,
        },
      ],

      // Pre-fill email so user doesn't re-type it on Stripe page
      customer_email: email,

      // Pass order metadata so we can retrieve it after payment
      metadata: {
        orderId,
        bodyType: normalizedBodyType,
        typeName: displayName,
        email,
      },

      // Pass to PaymentIntent metadata as well (for reconciliation)
      payment_intent_data: {
        metadata: {
          orderId,
          bodyType: normalizedBodyType,
          typeName: displayName,
        },
      },

      // Where to send user after payment
      success_url: `${baseUrl}/en/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/en/payment-success.html?canceled=true`,

      // Auto tax can be enabled later in Stripe dashboard
      // automatic_tax: { enabled: true },

      // Allow promotion codes
      allow_promotion_codes: true,

      // Locale — let Stripe auto-detect from browser
      locale: 'auto',
    });

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });

  } catch (err) {
    console.error('[Stripe session creation failed]', err);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      message: err.message,
    });
  }
}
