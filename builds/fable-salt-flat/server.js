// First Contact — local server.
// Serves the experience from ./public and, if an ANTHROPIC_API_KEY is present,
// exposes /api/note so the field notes can be written by a runtime model.
// Without a key the endpoint answers 503 and the client uses its own templated notes.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 4173;

// Optional .env (KEY=value lines). Never committed; see README.
try {
  const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env, fine */ }

const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.FIRST_CONTACT_MODEL || 'claude-opus-5';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 200_000) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const SYSTEM = `You write the private field notebook of a lone hydrological surveyor who stayed behind on a flooded salt flat at night and is encountering an unknown intelligence living in the salt crust. It expresses itself through light moving under the water, tones, and translucent salt spires it raises. It perceives rhythm, stillness, distance and light.
Write ONE notebook entry of one to three short sentences, first person, present tense, plain and observational, a little shaken, never florid. Do not name the thing, do not explain it with certainty, do not use the words "alien", "AI" or "simulation". No headings, no quotes, no emoji. Interpret the latest event in light of what came before; you may be wrong, and you may say so.`;

async function writeNote(payload) {
  const user = `Elapsed: ${payload.elapsed}.
Recent entries:
${(payload.recent || []).map((n) => '- ' + n).join('\n') || '- (none yet)'}
What the surveyor can see of its state (private impressions, do not quote numbers): ${payload.reading}.
Latest event: ${payload.event}
Write the next entry.`;

  const body = {
    model: MODEL,
    max_tokens: 300,
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
  };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      body: JSON.stringify(body),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json?.error?.message || `HTTP ${r.status}`);
    if (json.stop_reason === 'refusal') throw new Error('refusal');
    const text = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
    if (!text) throw new Error('empty');
    return text;
  } finally {
    clearTimeout(t);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/status') {
    return send(res, 200, JSON.stringify({ ai: Boolean(API_KEY), model: API_KEY ? MODEL : null }));
  }

  if (url.pathname === '/api/note' && req.method === 'POST') {
    if (!API_KEY) return send(res, 503, JSON.stringify({ error: 'no-key' }));
    try {
      const payload = JSON.parse(await readBody(req) || '{}');
      const text = await writeNote(payload);
      return send(res, 200, JSON.stringify({ text }));
    } catch (e) {
      return send(res, 502, JSON.stringify({ error: String(e.message || e) }));
    }
  }

  // Static files
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'forbidden', 'text/plain');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'not found', 'text/plain');
    send(res, 200, data, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  FIRST CONTACT');
  console.log(`  open  http://localhost:${PORT}`);
  console.log(`  runtime AI: ${API_KEY ? 'on (' + MODEL + ')' : 'off — fallback notes (set ANTHROPIC_API_KEY to enable)'}`);
  console.log('');
});
