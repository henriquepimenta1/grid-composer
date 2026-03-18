import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Raw body for Stripe webhook — must come before express.json()
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Supabase
const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Inject env vars into HTML ─────────────────────────
function injectKeys(html) {
  return html
    .replace('__SUPABASE_URL__',      process.env.SUPABASE_URL || '')
    .replace('__SUPABASE_ANON_KEY__', process.env.SUPABASE_ANON_KEY || '')
    .replace('__STRIPE_PK__',         process.env.STRIPE_PUBLIC_KEY || '');
}

// ── HTML Routes ───────────────────────────────────────
app.get('/',        (req, res) => res.redirect('/login'));
app.get('/login',   (req, res) => res.send(injectKeys(fs.readFileSync('./login.html',   'utf8'))));
app.get('/app',     (req, res) => res.send(injectKeys(fs.readFileSync('./index.html',   'utf8'))));
app.get('/comprar', (req, res) => res.send(injectKeys(fs.readFileSync('./pricing.html', 'utf8'))));
app.get('/pricing', (req, res) => res.send(injectKeys(fs.readFileSync('./pricing.html', 'utf8'))));
app.get('/i18n.js',  (req, res) => res.sendFile('i18n.js',  { root: '.' }));
app.get('/auth.js',  (req, res) => res.send(injectKeys(fs.readFileSync('./auth.js', 'utf8'))));
app.get('/app.js',   (req, res) => res.sendFile('app.js',   { root: '.' }));
app.use(express.static('.'));

// ── Auth middleware ───────────────────────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Sessão inválida' });
  req.user = user;
  next();
}

// ── GET /api/credits ──────────────────────────────────
app.get('/api/credits', requireAuth, async (req, res) => {
  const { data, error } = await sb
    .from('users').select('credits, plan').eq('id', req.user.id).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ credits: data?.credits ?? 0, plan: data?.plan ?? 'free' });
});

// ── POST /api/analyze ─────────────────────────────────
app.post('/api/analyze', requireAuth, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key não configurada' });

  const { data: userData } = await sb
    .from('users').select('credits, plan').eq('id', req.user.id).single();

  if (!userData || userData.credits < 1) {
    return res.status(402).json({ error: 'Sem créditos.', code: 'NO_CREDITS' });
  }

  const body = JSON.stringify(req.body);
  const bodyBytes = Buffer.byteLength(body);
  if (bodyBytes > 30 * 1024 * 1024) {
    return res.status(413).json({ error: `Payload muito grande: ${Math.round(bodyBytes/1024/1024)}MB.` });
  }

  let statusCode = 200, responseData = null;
  await new Promise(resolve => {
    const options = {
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'x-api-key': apiKey, 'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json', 'Content-Length': bodyBytes,
      },
    };
    const r = https.request(options, apiRes => {
      let d = '';
      apiRes.on('data', chunk => d += chunk);
      apiRes.on('end', () => {
        statusCode = apiRes.statusCode;
        try { responseData = JSON.parse(d); } catch { responseData = { error: 'Resposta inválida' }; }
        resolve();
      });
    });
    r.on('error', e => { responseData = { error: e.message }; statusCode = 500; resolve(); });
    r.write(body); r.end();
  });

  // Only deduct credit on success, skip for unlimited plans
  if (statusCode === 200 && userData.plan === 'free') {
    await sb.from('users').update({ credits: userData.credits - 1 }).eq('id', req.user.id);
  }

  res.status(statusCode).json(responseData);
});

// ══════════════════════════════════════════════════════
//  STRIPE — Create checkout session
// ══════════════════════════════════════════════════════
app.post('/api/checkout', requireAuth, async (req, res) => {
  const { plan, interval } = req.body;

  const PRICES = {
    pro_monthly:    process.env.STRIPE_PRICE_PRO_MONTHLY,
    pro_annual:     process.env.STRIPE_PRICE_PRO_ANNUAL,
    studio_monthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY,
    studio_annual:  process.env.STRIPE_PRICE_STUDIO_ANNUAL,
  };

  const priceId = PRICES[`${plan}_${interval}`];
  if (!priceId) return res.status(400).json({ error: 'Plano inválido' });

  const origin = req.headers.origin || `https://${req.headers.host}`;

  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/app?payment=success`,
    cancel_url:  `${origin}/comprar?payment=cancelled`,
    customer_email: req.user.email,
    client_reference_id: req.user.id,
    'metadata[user_id]': req.user.id,
    'metadata[plan]': plan,
    'metadata[interval]': interval,
    'payment_method_types[0]': 'card',
  }).toString();

  const stripeRes = await stripePost('/v1/checkout/sessions', params);
  if (stripeRes.error) return res.status(400).json({ error: stripeRes.error.message });
  res.json({ url: stripeRes.url });
});

// ══════════════════════════════════════════════════════
//  STRIPE — Portal (manage subscription)
// ══════════════════════════════════════════════════════
app.post('/api/portal', requireAuth, async (req, res) => {
  const origin = req.headers.origin || `https://${req.headers.host}`;

  // Find Stripe customer ID
  const { data: userData } = await sb
    .from('users').select('stripe_customer_id').eq('id', req.user.id).single();

  if (!userData?.stripe_customer_id) {
    return res.status(400).json({ error: 'Sem assinatura ativa.' });
  }

  const params = new URLSearchParams({
    customer: userData.stripe_customer_id,
    return_url: `${origin}/app`,
  }).toString();

  const portalRes = await stripePost('/v1/billing_portal/sessions', params);
  if (portalRes.error) return res.status(400).json({ error: portalRes.error.message });
  res.json({ url: portalRes.url });
});

// ══════════════════════════════════════════════════════
//  STRIPE — Webhook
// ══════════════════════════════════════════════════════
app.post('/api/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = constructStripeEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const plan = session.metadata?.plan || 'pro';
      const customerId = session.customer;

      if (userId) {
        await sb.from('users').update({
          plan,
          credits: 9999,  // unlimited
          stripe_customer_id: customerId,
        }).eq('id', userId);
        console.log(`✓ Checkout complete: ${userId} → ${plan}`);
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      // Notify user — could send email here
      console.log(`⚠ Payment failed for customer: ${customerId}`);
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const customerId = sub.customer;
      // Find user by customer ID and downgrade
      const { data: users } = await sb
        .from('users').select('id').eq('stripe_customer_id', customerId);
      if (users?.length) {
        await sb.from('users')
          .update({ plan: 'free', credits: 0 })
          .eq('id', users[0].id);
        console.log(`✓ Subscription cancelled: customer ${customerId} → free`);
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
});

// ── Stripe helpers ────────────────────────────────────
function stripePost(path, formBody) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return new Promise(resolve => {
    const bodyBytes = Buffer.byteLength(formBody);
    const options = {
      hostname: 'api.stripe.com', path, method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': bodyBytes,
      },
    };
    const r = https.request(options, apiRes => {
      let d = '';
      apiRes.on('data', chunk => d += chunk);
      apiRes.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve({ error: { message: 'Parse error' } }); }
      });
    });
    r.on('error', e => resolve({ error: { message: e.message } }));
    r.write(formBody); r.end();
  });
}

function constructStripeEvent(payload, sig, secret) {
  if (!secret) return JSON.parse(payload.toString());

  const parts = {};
  sig.split(',').forEach(part => {
    const [k, v] = part.split('=');
    if (!parts[k]) parts[k] = [];
    parts[k].push(v);
  });

  const timestamp = parts.t?.[0];
  if (!timestamp) throw new Error('No timestamp in signature');

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const valid = (parts.v1 || []).some(sig => {
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expected, 'hex')
    );
  });

  if (!valid) throw new Error('Invalid Stripe signature');
  return JSON.parse(payload.toString());
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
// Note: Add stripe_customer_id column to Supabase users table:
// ALTER TABLE public.users ADD COLUMN stripe_customer_id text;
