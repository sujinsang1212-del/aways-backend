// ============================================================
// Lemon Squeezy Checkout Creation
// Path: api/create-checkout-session.js
// Deploy: Vercel Serverless Function
// ============================================================

// Variant ID mapping (frontend type key → Lemon Squeezy variant_id)
const VARIANT_MAP = {
  // Frontend keys (from test.html)
  'W-Soft': 1602239,  // Soft Wave
  'W-H':    1602271,  // Hard Wave
  'N-Soft': 1602265,  // Soft Natural
  'N-H':    1602275,  // Hard Natural
  'S-Soft': 1602266,  // Soft Straight
  'S-H':    1602278,  // Hard Straight

  // Also support backend keys (in case bodyType comes pre-normalized)
  'soft-wave':     1602239,
  'hard-wave':     1602271,
  'soft-natural':  1602265,
  'hard-natural':  1602275,
  'soft-straight': 1602266,
  'hard-straight': 1602278,
};

const TYPE_NAME_MAP = {
  'W-Soft': 'Soft Wave',     'soft-wave':     'Soft Wave',
  'W-H':    'Hard Wave',     'hard-wave':     'Hard Wave',
  'N-Soft': 'Soft Natural',  'soft-natural':  'Soft Natural',
  'N-H':    'Hard Natural',  'hard-natural':  'Hard Natural',
  'S-Soft': 'Soft Straight', 'soft-straight': 'Soft Straight',
  'S-H':    'Hard Straight', 'hard-straight': 'Hard Straight',
};

const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const API_KEY = process.env.LEMONSQUEEZY_API_KEY;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!API_KEY || !STORE_ID) {
    console.error('[Config error] Missing LEMONSQUEEZY_API_KEY or LEMONSQUEEZY_STORE_ID');
    return res.status(500).json({ error: 'Server configuration incomplete' });
  }

  const { email, orderId, bodyType, typeName } = req.body;

  if (!email || !orderId) {
    return res.status(400).json({ error: 'Email and order ID are required' });
  }

  const variantId = VARIANT_MAP[bodyType];
  if (!variantId) {
    return res.status(400).json({ error: `Unknown body type: ${bodyType}` });
  }

  const displayName = typeName || TYPE_NAME_MAP[bodyType] || 'Personalized Style Guide';

  // Build success/cancel URLs
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  try {
    // Lemon Squeezy Checkout API
    // Docs: https://docs.lemonsqueezy.com/api/checkouts
    const lemonResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            // Pre-fill customer info
            checkout_data: {
              email,
              custom: {
                order_id: orderId,
                body_type: bodyType,
                type_name: displayName,
              },
            },

            // Customize checkout experience
            checkout_options: {
              embed: false,
              media: false,
              logo: true,
              desc: false,
              discount: true,
              dark: false,
              subscription_preview: false,
              button_color: '#1A1714',
            },

            // Product options (override per-checkout)
            product_options: {
              name: `AWAYS ${displayName} Style Guide`,
              description: '22-page personalized PDF style guide for your body type',
              redirect_url: `${baseUrl}/en/payment-success.html?order_id=${orderId}`,
              receipt_button_text: 'Download Your Report',
              receipt_link_url: `${baseUrl}/en/`,
              receipt_thank_you_note: 'Your style guide is on the way to your inbox! ✨',
              enabled_variants: [variantId],
            },

            expires_at: null,
          },
          relationships: {
            store:   { data: { type: 'stores',   id: String(STORE_ID) } },
            variant: { data: { type: 'variants', id: String(variantId) } },
          },
        },
      }),
    });

    const data = await lemonResponse.json();

    if (!lemonResponse.ok) {
      console.error('[Lemon Squeezy error]', data);
      return res.status(lemonResponse.status).json({
        error: 'Failed to create checkout',
        details: data.errors?.[0]?.detail || 'Unknown error',
      });
    }

    const checkoutUrl = data?.data?.attributes?.url;
    if (!checkoutUrl) {
      return res.status(500).json({ error: 'No checkout URL returned' });
    }

    return res.status(200).json({
      success: true,
      url: checkoutUrl,
      checkoutId: data.data.id,
    });

  } catch (err) {
    console.error('[Checkout creation failed]', err);
    return res.status(500).json({
      error: 'Server error',
      message: err.message,
    });
  }
}
