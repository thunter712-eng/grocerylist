// DWHF proxy worker
//   POST /claude          → forwards a Messages API request, adding the API key
//   GET  /fetch?url=...   → server-side fetch of a recipe page / oEmbed / image
//                           (replaces corsproxy.io)

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
// Only the models the app actually uses — prevents someone who finds the
// worker URL from running expensive models on your key
const ALLOWED_MODELS = ['claude-haiku-4-5-20251001'];
const MAX_TOKENS_CAP = 4096;

function corsHeaders(env, origin) {
  const list = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const allow = list.length === 0 ? '*' : (list.includes(origin) ? origin : 'null');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin',
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request.headers.get('Origin') || '');

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    if (url.pathname === '/claude' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, cors); }
      if (!ALLOWED_MODELS.includes(body.model)) body.model = ALLOWED_MODELS[0];
      body.max_tokens = Math.min(body.max_tokens || 2048, MAX_TOKENS_CAP);

      const resp = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return new Response(resp.body, {
        status: resp.status,
        headers: { ...cors, 'content-type': 'application/json' },
      });
    }

    if (url.pathname === '/fetch' && request.method === 'GET') {
      const target = url.searchParams.get('url') || '';
      let t;
      try { t = new URL(target); } catch { return json({ error: 'Bad url' }, 400, cors); }
      if (t.protocol !== 'https:' && t.protocol !== 'http:') return json({ error: 'Bad scheme' }, 400, cors);

      let resp;
      try {
        resp = await fetch(t.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DWHF-RecipeBot/1.0)',
            'Accept': '*/*',
          },
          redirect: 'follow',
        });
      } catch (e) {
        return json({ error: 'Fetch failed: ' + e.message }, 502, cors);
      }
      return new Response(resp.body, {
        status: resp.status,
        headers: { ...cors, 'content-type': resp.headers.get('content-type') || 'text/plain' },
      });
    }

    return json({ error: 'Not found' }, 404, cors);
  },
};
