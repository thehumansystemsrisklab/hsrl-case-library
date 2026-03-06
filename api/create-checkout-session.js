// api/create-checkout-session.js
// Vercel serverless function — handles Stripe checkout session creation
// Deploy to: /api/create-checkout-session.js in your Vercel project root
//
// Required environment variables in Vercel dashboard:
//   STRIPE_SECRET_KEY   — your Stripe secret key (sk_live_... or sk_test_...)
//   STRIPE_DOC01_PRICE  — Stripe Price ID for DOC-01 ($45)
//   STRIPE_DOC02_PRICE  — Stripe Price ID for DOC-02 ($195)
//   STRIPE_DOC03_PRICE  — Stripe Price ID for DOC-03 ($145)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_MAP = {
  'DOC-01': process.env.STRIPE_DOC01_PRICE,
  'DOC-02': process.env.STRIPE_DOC02_PRICE,
  'DOC-03': process.env.STRIPE_DOC03_PRICE,
};

const DOC_NAMES = {
  'DOC-01': 'Governance Condition Snapshot',
  'DOC-02': 'Structural Governance Assessment Report',
  'DOC-03': 'Procurement Assessment Letter',
};

module.exports = async function handler(req, res) {
  // CORS headers — allow requests from your domains
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { docType, org, system, successUrl, cancelUrl } = req.body;

    if (!docType || !PRICE_MAP[docType]) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const priceId = PRICE_MAP[docType];
    if (!priceId) {
      return res.status(500).json({
        error: `Price ID not configured for ${docType}. Set STRIPE_${docType.replace('-','')}_PRICE in Vercel environment variables.`
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        docType,
        org: org || 'Anonymous',
        system: system || 'Unspecified',
      },
      success_url: successUrl || `${req.headers.origin}/diagnostic?payment=success&doc=${docType}`,
      cancel_url: cancelUrl || `${req.headers.origin}/diagnostic`,
      // Optional: collect customer email for receipt
      // customer_email: req.body.email,
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe session creation error:', err);
    return res.status(500).json({ error: err.message });
  }
};
