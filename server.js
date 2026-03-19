import express from 'express';
import https from 'https';
import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Raw body for Stripe webhook — must come BEFORE express.json()
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Supabase admin client (server-side only)
const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Inject env vars into HTML files ──────────────────
function injectKeys(html) {
  return html
    .replace('__SUPABASE_URL__',      process.env.SUPABASE_URL      || '')
    .replace('__SUPABASE_ANON_KEY__', process.env.SUPABASE_ANON_KEY || '')
    .replace('__STRIPE_PK__',         process.env.STRIPE_PUBLIC_KEY || '');
}

// ── HTML page routes ──────────────────────────────────
app.get('/',        (req, res) => res.redirect('/login'));
app.get('/login',   (req, res) => res.send(injectKeys(fs.readFileSync('./login.html',   'utf8'))));
app.get('/app',     (req, res) => res.send(injectKeys(fs.readFileSync('./index.html',   'utf8'))));
app.get('/comprar', (req, res) => res.send(injectKeys(fs.readFileSync('./pricing.html', 'utf8'))));
app.get('/pricing', (req, res) => res.send(injectKeys(fs.readFileSync('./pricing.html', 'utf8'))));

app.get('/playground', (req, res) => res.sendFile('playground.html', { root: '.' }));
app.get('/playground.html', (req, res) => res.sendFile('playground.html', { root: '.' }));
// ── Static JS files ───────────────────────────────────
app.get('/colors.js',  (req, res) => res.sendFile('colors.js',  { root: '.' }));
app.get('/state.js',   (req, res) => res.sendFile('state.js',   { root: '.' }));
app.get('/feed.js',    (req, res) => res.sendFile('feed.js',    { root: '.' }));
app.get('/compose.js', (req, res) => res.sendFile('compose.js', { root: '.' }));
app.get('/ui.js',      (req, res) => res.sendFile('ui.js',      { root: '.' }));
app.get('/i18n.js',  (req, res) => res.sendFile('i18n.js',  { root: '.' }));
app.get('/app.js',   (req, res) => res.sendFile('app.js',   { root: '.' }));
app.get('/howto.js', (req, res) => res.sendFile('howto.js', { root: '.' }));
app.get('/auth.js',  (req, res) => res.send(injectKeys(fs.readFileSync('./auth.js', 'utf8'))));

// Static files fallback
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
  try {
  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key não configurada' });

  const { data: userData } = await sb
    .from('users').select('credits, plan').eq('id', req.user.id).single();

  const plan        = userData?.plan || 'free'
  const isPro       = plan === 'pro'
  const isStudio    = plan === 'studio'
  const isPaid      = isPro || isStudio
  const isBasic     = req.body._creditCost === 1
  const isAdvanced  = req.body._creditCost === 5

  let creditCost = 0
  if (isBasic && isPaid) {
    creditCost = 0
  } else if (isAdvanced && isStudio) {
    creditCost = 3
  } else {
    creditCost = req.body._creditCost || 1
  }

  if (!userData) return res.status(402).json({ error: 'Usuário não encontrado.', code: 'NO_CREDITS' });
  if (creditCost > 0 && userData.credits < creditCost) {
    const names = { 1: '1 crédito', 3: '3 créditos', 5: '5 créditos' }
    return res.status(402).json({
      error: `Créditos insuficientes. Esta análise requer ${names[creditCost] || creditCost}.`,
      code: 'NO_CREDITS'
    });
  }

  const { _creditCost, _creditOverride, ...anthropicBody } = req.body;
  const body      = JSON.stringify(anthropicBody);
  const bodyBytes = Buffer.byteLength(body);
  if (bodyBytes > 30 * 1024 * 1024) {
    return res.status(413).json({
      error: `Payload muito grande: ${Math.round(bodyBytes / 1024 / 1024)}MB. Reduza o número de fotos.`
    });
  }

  let statusCode = 200, responseData = null;
  await new Promise(resolve => {
    const r = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'x-api-key': apiKey, 'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json', 'Content-Length': bodyBytes,
      },
    }, apiRes => {
      let d = '';
      apiRes.on('data', chunk => d += chunk);
      apiRes.on('end', () => {
        statusCode = apiRes.statusCode;
        try { responseData = JSON.parse(d); }
        catch { responseData = { error: 'Resposta inválida da API' }; }
        resolve();
      });
    });
    r.on('error', e => { responseData = { error: e.message }; statusCode = 500; resolve(); });
    r.write(body);
    r.end();
  });

  if (statusCode === 200 && creditCost > 0) {
    await sb.from('users')
      .update({ credits: userData.credits - creditCost })
      .eq('id', req.user.id);
  }

  res.status(statusCode).json(responseData);

  } catch (err) {
    console.error('/api/analyze error:', err);
    res.status(500).json({ error: err.message || 'Erro interno do servidor' });
  }
});

// ── POST /api/checkout (Stripe) ───────────────────────
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
    success_url:  `${origin}/app?payment=success`,
    cancel_url:   `${origin}/comprar?payment=cancelled`,
    customer_email: req.user.email,
    client_reference_id: req.user.id,
    'metadata[user_id]': req.user.id,
    'metadata[plan]': plan,
    'metadata[interval]': interval,
    'payment_method_types[0]': 'card',
  }).toString();

  const result = await stripePost('/v1/checkout/sessions', params);
  if (result.error) return res.status(400).json({ error: result.error.message });
  res.json({ url: result.url });
});

// ── POST /api/portal (manage subscription) ────────────
app.post('/api/portal', requireAuth, async (req, res) => {
  const origin = req.headers.origin || `https://${req.headers.host}`;
  const { data: userData } = await sb
    .from('users').select('stripe_customer_id').eq('id', req.user.id).single();

  if (!userData?.stripe_customer_id) {
    return res.status(400).json({ error: 'Sem assinatura ativa.' });
  }

  const params = new URLSearchParams({
    customer: userData.stripe_customer_id,
    return_url: `${origin}/app`,
  }).toString();

  const result = await stripePost('/v1/billing_portal/sessions', params);
  if (result.error) return res.status(400).json({ error: result.error.message });
  res.json({ url: result.url });
});

// ── POST /api/webhook/stripe ──────────────────────────
app.post('/api/webhook/stripe', async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try { event = constructStripeEvent(req.body, sig, secret); }
  catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const userId = s.client_reference_id;
      const plan   = s.metadata?.plan || 'pro';
      if (userId) {
        await sb.from('users').update({
          plan, credits: 9999, stripe_customer_id: s.customer,
        }).eq('id', userId);
        console.log(`✓ Payment: ${userId} → ${plan}`);
      }
    }
    if (event.type === 'customer.subscription.deleted') {
      const customerId = event.data.object.customer;
      const { data: users } = await sb
        .from('users').select('id').eq('stripe_customer_id', customerId);
      if (users?.length) {
        await sb.from('users')
          .update({ plan: 'free', credits: 0 })
          .eq('id', users[0].id);
        console.log(`✓ Cancelled: ${customerId} → free`);
      }
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      // One-time credit pack purchase
      if (session.mode === 'payment' && session.metadata?.credits) {
        const userId  = session.metadata.user_id;
        const credits = parseInt(session.metadata.credits);
        if (userId && credits > 0) {
          const { data: u } = await sb.from('users').select('credits').eq('id', userId).single();
          if (u) {
            await sb.from('users').update({ credits: (u.credits || 0) + credits }).eq('id', userId);
            console.log(`✓ Credits purchased: ${userId} +${credits}`);
          }
        }
      }
    }
    if (event.type === 'invoice.payment_succeeded') {
      // Monthly renewal — deposit credits
      const customerId = event.data.object.customer;
      const { data: users } = await sb
        .from('users').select('id, plan, credits').eq('stripe_customer_id', customerId);
      if (users?.length) {
        const u = users[0];
        const monthlyCredits = u.plan === 'studio' ? 150 : u.plan === 'pro' ? 50 : 0;
        if (monthlyCredits > 0) {
          const rolloverMax = u.plan === 'studio' ? 300 : 100;
          const newCredits  = Math.min(rolloverMax, (u.credits || 0) + monthlyCredits);
          await sb.from('users').update({ credits: newCredits }).eq('id', u.id);
          console.log(`✓ Credits renewed: ${u.id} → +${monthlyCredits} (total: ${newCredits})`);
        }
      }
    }
    if (event.type === 'invoice.payment_failed') {
      console.log(`⚠ Payment failed: ${event.data.object.customer}`);
    }
  } catch (err) { console.error('Webhook handler error:', err); }

  res.json({ received: true });
});

// ── Stripe helpers ────────────────────────────────────
function stripePost(path, formBody) {
  return new Promise(resolve => {
    const bodyBytes = Buffer.byteLength(formBody);
    const r = https.request({
      hostname: 'api.stripe.com', path, method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': bodyBytes,
      },
    }, apiRes => {
      let d = '';
      apiRes.on('data', chunk => d += chunk);
      apiRes.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve({ error: { message: 'Parse error' } }); }
      });
    });
    r.on('error', e => resolve({ error: { message: e.message } }));
    r.write(formBody);
    r.end();
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
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');
  const valid = (parts.v1 || []).some(s =>
    crypto.timingSafeEqual(Buffer.from(s, 'hex'), Buffer.from(expected, 'hex'))
  );
  if (!valid) throw new Error('Invalid Stripe signature');
  return JSON.parse(payload.toString());
}

// ── POST /api/buy-credits (one-time credit packs) ──────
app.post('/api/buy-credits', requireAuth, async (req, res) => {
  try {
    const { pack } = req.body;
    const CREDIT_PACKS = {
      pack10:  { price: process.env.STRIPE_PRICE_CREDITS_10,  credits: 10 },
      pack30:  { price: process.env.STRIPE_PRICE_CREDITS_30,  credits: 30 },
      pack100: { price: process.env.STRIPE_PRICE_CREDITS_100, credits: 100 },
    };
    const selected = CREDIT_PACKS[pack];
    if (!selected?.price) return res.status(400).json({ error: 'Pack inválido' });

    const { data: userData } = await sb.from('users').select('stripe_customer_id').eq('id', req.user.id).single();

    const params = new URLSearchParams({
      'line_items[0][price]':    selected.price,
      'line_items[0][quantity]': '1',
      'mode':                    'payment',
      'success_url':             `${process.env.APP_URL || 'https://grid-composer.onrender.com'}/app?credits_added=${selected.credits}`,
      'cancel_url':              `${process.env.APP_URL || 'https://grid-composer.onrender.com'}/app`,
      'metadata[user_id]':       req.user.id,
      'metadata[credits]':       String(selected.credits),
    });
    if (userData?.stripe_customer_id) params.append('customer', userData.stripe_customer_id);

    const session = await stripePost('/v1/checkout/sessions', params.toString());
    if (session.error) return res.status(500).json({ error: session.error.message });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/history', requireAuth, async (req, res) => {
  try {
    const { data: userData } = await sb
      .from('users').select('plan').eq('id', req.user.id).single();
    const plan = userData?.plan || 'free';

    // Enforce history limits per plan
    const limits = { free: 5, pro: 50, studio: null };
    const limit  = limits[plan];
    if (limit !== null) {
      const { count } = await sb
        .from('analyses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user.id);
      if (count >= limit) {
        // Delete oldest to stay within limit
        const { data: oldest } = await sb
          .from('analyses')
          .select('id')
          .eq('user_id', req.user.id)
          .order('created_at', { ascending: true })
          .limit(1);
        if (oldest?.length) {
          await sb.from('analyses').delete().eq('id', oldest[0].id);
        }
      }
    }

    const { plan_size, harmony, axis, pattern, overview,
            harmony_note, palette, slots } = req.body;

    const { data, error } = await sb.from('analyses').insert({
      user_id:      req.user.id,
      plan_size, harmony, axis, pattern,
      overview, harmony_note,
      palette:  palette  || [],
      slots:    slots    || [],
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/history — list analyses ─────────────────
app.get('/api/history', requireAuth, async (req, res) => {
  try {
    const { data, error } = await sb
      .from('analyses')
      .select('id, created_at, plan_size, harmony, axis, pattern, overview, palette, slots')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ analyses: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/history/:id ───────────────────────────
app.delete('/api/history/:id', requireAuth, async (req, res) => {
  try {
    await sb.from('analyses')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);  // RLS redundancy
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Grid Composer rodando na porta ${PORT}`));
