import express from 'express';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Supabase admin client (usa a service_role key — nunca exponha no frontend)
const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Servir arquivos estáticos ──
app.use(express.static('.'));

// ── Middleware de autenticação ──
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Não autenticado' });

  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Sessão inválida' });

  req.user = user;
  next();
}

// ── Rota: verificar créditos ──
app.get('/api/credits', requireAuth, async (req, res) => {
  const { data, error } = await sb
    .from('users')
    .select('credits, plan')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ credits: data?.credits ?? 0, plan: data?.plan ?? 'free' });
});

// ── Rota: análise (consome 1 crédito) ──
app.post('/api/analyze', requireAuth, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key não configurada' });

  // Verificar créditos
  const { data: userData, error: userErr } = await sb
    .from('users')
    .select('credits')
    .eq('id', req.user.id)
    .single();

  if (userErr || !userData) return res.status(500).json({ error: 'Usuário não encontrado' });
  if (userData.credits < 1) return res.status(402).json({ error: 'Sem créditos. Compre mais para continuar.', code: 'NO_CREDITS' });

  const body = JSON.stringify(req.body);
  const bodyBytes = Buffer.byteLength(body);
  if (bodyBytes > 30 * 1024 * 1024) {
    return res.status(413).json({ error: `Payload muito grande: ${Math.round(bodyBytes/1024/1024)}MB. Reduza o número de fotos.` });
  }

  // Chamar Anthropic
  let statusCode = 200;
  let responseData = null;

  await new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'Content-Length': bodyBytes,
      },
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        statusCode = apiRes.statusCode;
        try { responseData = JSON.parse(data); } catch { responseData = { error: 'Resposta inválida da API' }; }
        resolve();
      });
    });
    apiReq.on('error', (e) => { responseData = { error: e.message }; statusCode = 500; resolve(); });
    apiReq.write(body);
    apiReq.end();
  });

  // Descontar crédito só se análise foi bem-sucedida
  if (statusCode === 200) {
    await sb.from('users')
      .update({ credits: userData.credits - 1 })
      .eq('id', req.user.id);
  }

  res.status(statusCode).json(responseData);
});

// ── Redirecionar rotas do app para index.html (SPA) ──
app.get('/app', (req, res) => res.sendFile('index.html', { root: '.' }));
app.get('/login', (req, res) => res.sendFile('login.html', { root: '.' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
