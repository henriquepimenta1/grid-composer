import express from 'express';
import https from 'https';

const app = express();

// Increase limits for image payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('.'));

app.post('/api/analyze', (req, res) => {
  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key nao configurada' });
  }

  const body = JSON.stringify(req.body);
  const bodyBytes = Buffer.byteLength(body);

  // Safety check — Anthropic has ~32MB limit
  if (bodyBytes > 30 * 1024 * 1024) {
    return res.status(413).json({ error: `Payload muito grande: ${Math.round(bodyBytes/1024/1024)}MB. Reduza o numero de fotos.` });
  }

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
      try {
        res.status(apiRes.statusCode).json(JSON.parse(data));
      } catch {
        res.status(500).json({ error: 'Erro ao processar resposta da API' });
      }
    });
  });

  apiReq.on('error', (e) => {
    res.status(500).json({ error: e.message });
  });

  apiReq.write(body);
  apiReq.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
