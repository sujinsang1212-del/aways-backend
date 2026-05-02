// ============================================================
// Lemon Squeezy Webhook Handler
// Path: api/lemon-webhook.js
// Deploy: Vercel Serverless Function
//
// Receives notifications from Lemon Squeezy when an order is created/refunded.
// Lemon Squeezy automatically delivers the PDF — we just log and (later) trigger
// analytics events (Meta Pixel, GA, etc).
// ============================================================

import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

// Disable body parsing — we need raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Read raw body from request
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!WEBHOOK_SECRET) {
    console.error('[Config error] LEMONSQUEEZY_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Server configuration incomplete' });
  }

  try {
    // 1. Read raw body
    const rawBody = await readRawBody(req);
    const bodyString = rawBody.toString('utf-8');

    // 2. Verify signature (HMAC SHA-256)
    const signature = req.headers['x-signature'];
    if (!signature) {
      console.warn('[Webhook] Missing X-Signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'utf-8'),
      Buffer.from(expectedSignature, 'utf-8')
    )) {
      console.warn('[Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 3. Parse payload
    const event = JSON.parse(bodyString);
    const eventName = event.meta?.event_name;
    const customData = event.meta?.custom_data || {};
    const orderData = event.data?.attributes || {};

    console.log(`[Webhook] Event: ${eventName}`);
    console.log(`[Webhook] Order ID: ${customData.order_id || 'N/A'}`);
    console.log(`[Webhook] Body type: ${customData.body_type || 'N/A'}`);
    console.log(`[Webhook] Customer email: ${orderData.user_email || 'N/A'}`);
    console.log(`[Webhook] Total: ${orderData.total_formatted || 'N/A'}`);

    // 4. Handle different event types
    switch (eventName) {

      case 'order_created': {
        // Order successfully placed — Lemon Squeezy will auto-deliver the PDF
        // Future hooks:
        //   - Send Meta Pixel CAPI conversion event (Purchase)
        //   - Log to analytics DB
        //   - Send custom email notification to admin

        console.log('[Order created] Successfully processed', {
          orderId: customData.order_id,
          bodyType: customData.body_type,
          email: orderData.user_email,
          amount: orderData.total / 100, // cents → dollars
          currency: orderData.currency,
        });

        // TODO: When Meta Pixel is added, fire CAPI here
        // await sendMetaConversion({...})

        break;
      }

      case 'order_refunded': {
        console.log('[Order refunded]', {
          orderId: customData.order_id,
          email: orderData.user_email,
        });
        // TODO: Fire refund event to analytics
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event: ${eventName}`);
    }

    // Always respond 200 to acknowledge receipt
    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('[Webhook error]', err);
    // Return 200 even on error to avoid Lemon Squeezy retrying indefinitely
    // (we'll see errors in Vercel logs)
    return res.status(200).json({ received: true, error: err.message });
  }
}
