// ============================================================
// Stripe Payment Confirmation + PDF Generation + Email Send
// Path: api/confirm-payment-en.js
// Deploy: Vercel Serverless Function
// ============================================================

import Stripe from 'stripe';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});
const resend = new Resend(process.env.RESEND_API_KEY);

// English report file mapping
const REPORT_MAP_EN = {
  'soft-wave':     'report-soft-wave-en.html',
  'soft-natural':  'report-soft-natural-en.html',
  'hard-wave':     'report-hard-wave-en.html',
  'hard-natural':  'report-hard-natural-en.html',
  'soft-straight': 'report-soft-straight-en.html',
  'hard-straight': 'report-hard-straight-en.html',
};

const BODY_TYPE_EN = {
  'soft-wave':     'Soft Wave',
  'soft-natural':  'Soft Natural',
  'hard-wave':     'Hard Wave',
  'hard-natural':  'Hard Natural',
  'soft-straight': 'Soft Straight',
  'hard-straight': 'Hard Straight',
};

const TYPE_KEY_MAP = {
  'S-Soft': 'soft-straight',
  'S-H':    'hard-straight',
  'W-Soft': 'soft-wave',
  'W-H':    'hard-wave',
  'N-Soft': 'soft-natural',
  'N-H':    'hard-natural',
};

// ============================================================
// HTML → PDF
// ============================================================
async function generatePDF(bodyType) {
  const reportFile = REPORT_MAP_EN[bodyType];
  if (!reportFile) throw new Error(`Unknown body type: ${bodyType}`);

  const htmlPath = path.join(process.cwd(), 'reports', reportFile);
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Report file not found: ${reportFile}`);
  }
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  await page.setContent(htmlContent, {
    waitUntil: 'networkidle0',
    timeout: 15000,
  });

  await page.evaluateHandle('document.fonts.ready');

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
  });

  await browser.close();

  return pdfBuffer;
}

// ============================================================
// Send English email with PDF attached
// ============================================================
async function sendEmail(email, bodyType, pdfBuffer) {
  const typeName = BODY_TYPE_EN[bodyType] || bodyType;

  const { data, error } = await resend.emails.send({
    from: `AWAYS <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
    to: email,
    subject: `Your ${typeName} Style Guide is ready ✨`,
    html: `
      <div style="font-family: -apple-system, 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FFFFFF;">

        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 24px; color: #1A1714; margin-bottom: 8px; font-weight: 300; letter-spacing: 0.08em;">AWAYS</h1>
          <p style="color: #8C6840; font-size: 11px; letter-spacing: 0.2em; margin: 0;">BODY TYPE STYLE GUIDE</p>
        </div>

        <div style="background: #F7F3EE; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
          <h2 style="font-size: 20px; color: #1A1714; margin: 0 0 16px 0; font-weight: 600;">
            Your ${typeName} report is ready ✨
          </h2>
          <p style="color: #6B6560; line-height: 1.8; font-size: 15px; margin: 0;">
            Your AWAYS premium style guide is here.<br>
            Open the attached PDF — your personal styling playbook awaits.
          </p>
        </div>

        <div style="background: #FFFFFF; border: 1px solid #E8DFCC; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 15px; color: #8C6840; margin: 0 0 16px 0;">📄 22-Page Style Guide</h3>
          <table style="width: 100%; font-size: 13px; color: #6B6560; line-height: 2;">
            <tr><td>✅ Ch.1</td><td>Body type analysis · Your 3 signatures</td></tr>
            <tr><td>✅ Ch.2</td><td>Fit formulas · Do's and Don'ts</td></tr>
            <tr><td>✅ Ch.3</td><td>7 recommended fabrics · Color guide</td></tr>
            <tr><td>✅ Ch.4</td><td>5 outfit formulas · Accessories</td></tr>
            <tr><td>✅ Ch.5</td><td>Shopping checklist (12 items)</td></tr>
            <tr><td>✅ Ch.6</td><td>Year-round guide · Q&A</td></tr>
          </table>
        </div>

        <div style="background: #FFF8F0; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
          <p style="font-size: 13px; color: #B8956A; margin: 0; line-height: 1.8;">
            💡 <strong>Tip:</strong> Save the PDF to your phone so you can reference it whenever you shop!
          </p>
        </div>

        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #E8DFCC;">
          <p style="color: #A09A94; font-size: 11px; line-height: 1.8; margin: 0;">
            This email was sent automatically by AWAYS.<br>
            Questions? <a href="mailto:awaysbiz@gmail.com" style="color: #8C6840;">awaysbiz@gmail.com</a>
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `AWAYS-${typeName.replace(/\s+/g, '-')}-Style-Guide.pdf`,
        content: pdfBuffer.toString('base64'),
        contentType: 'application/pdf',
      },
    ],
  });

  if (error) throw new Error(`Email send failed: ${JSON.stringify(error)}`);
  return data;
}

// ============================================================
// API Handler
// ============================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, bodyType: clientBodyType, typeName: clientTypeName } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // 1. Verify Stripe Checkout Session
    console.log(`[Verifying session] ${sessionId}`);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        error: 'Payment not completed',
        status: session.payment_status,
      });
    }

    console.log(`[Payment verified] ${session.id}, status: ${session.payment_status}`);

    // 2. Extract order info — prefer Stripe metadata (more secure)
    let bodyType = session.metadata?.bodyType || clientBodyType || '';
    const orderId = session.metadata?.orderId || session.id;
    const email = session.customer_email || session.customer_details?.email;

    // Normalize frontend key to backend key if needed
    if (TYPE_KEY_MAP[bodyType]) {
      bodyType = TYPE_KEY_MAP[bodyType];
    }

    if (!bodyType || !REPORT_MAP_EN[bodyType]) {
      return res.status(400).json({
        error: `Invalid or missing body type: ${bodyType}`,
      });
    }

    if (!email) {
      return res.status(400).json({ error: 'Customer email is missing' });
    }

    const typeName = BODY_TYPE_EN[bodyType] || clientTypeName || bodyType;
    const paymentMethodType = session.payment_method_types?.[0] || 'card';
    const paymentMethodDisplay = paymentMethodType === 'paypal' ? 'PayPal' : 'Card';

    // 3. Generate PDF
    console.log(`[Generating PDF] bodyType: ${bodyType}`);
    const startTime = Date.now();
    const pdfBuffer = await generatePDF(bodyType);
    const pdfTime = Date.now() - startTime;
    console.log(`[PDF generated] ${(pdfBuffer.length / 1024 / 1024).toFixed(1)}MB, ${pdfTime}ms`);

    // 4. Send email
    console.log(`[Sending email] to: ${email}`);
    const emailResult = await sendEmail(email, bodyType, pdfBuffer);
    console.log(`[Email sent] id: ${emailResult?.id}`);

    // 5. Success response
    return res.status(200).json({
      success: true,
      message: 'Payment confirmed and report sent',
      orderId,
      bodyType,
      typeName,
      email,
      amount: session.amount_total ? (session.amount_total / 100) : 29,
      currency: session.currency?.toUpperCase() || 'USD',
      paymentMethod: paymentMethodDisplay,
      emailId: emailResult?.id,
    });

  } catch (err) {
    console.error('[Server error]', err);

    if (err.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'Invalid Stripe session',
        message: err.message,
      });
    }

    return res.status(500).json({
      error: 'Server processing error',
      message: err.message,
    });
  }
}
