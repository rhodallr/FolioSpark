import { NextResponse } from 'next/server';
import { REWRITE_MODES, buildRewritePrompt, quickTidy } from '@/lib/rewrite';

export const runtime = 'nodejs';

const MAX_CHARS = 6000;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

// Best-effort per-IP limit. Serverless instances don't share memory, so this
// only slows down abuse; set a spend limit in the Anthropic Console as well.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function fallback(text, mode, reason) {
  return NextResponse.json({ text: quickTidy(text, mode), source: 'rules', reason });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const text = String(body?.text || '').trim();
  const mode = REWRITE_MODES[body?.mode] ? body.mode : 'condense';
  const section = typeof body?.section === 'string' ? body.section.slice(0, 40) : '';
  const sectionLabel = typeof body?.sectionLabel === 'string' ? body.sectionLabel.slice(0, 60) : '';

  if (!text) return NextResponse.json({ error: 'Nothing to rewrite.' }, { status: 400 });
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: `That's over ${MAX_CHARS} characters — try one section at a time.` }, { status: 413 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback(text, mode, 'no-key');

  const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many rewrites in a minute — give it a moment.' }, { status: 429 });
  }

  const { system, user } = buildRewritePrompt({ text, mode, section, sectionLabel });

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Rewrite API error', res.status, detail.slice(0, 500));
      return fallback(text, mode, 'api-error');
    }

    const data = await res.json();
    const out = (data.content || [])
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
      .replace(/^<text>\s*|\s*<\/text>$/g, '')
      .trim();

    if (!out) return fallback(text, mode, 'empty');
    return NextResponse.json({ text: out, source: 'ai' });
  } catch (err) {
    console.error('Rewrite request failed', err);
    return fallback(text, mode, 'network');
  }
}
