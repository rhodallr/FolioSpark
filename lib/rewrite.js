// Writing helpers: readability stats, a rule-based "quick tidy", and the AI rewrite prompt.
// Pure functions — safe to import on the client and the server.

export const LONG_SENTENCE = 25; // words; flagged above this
export const TARGET_AVG = 18;

export const REWRITE_MODES = {
  condense: {
    label: 'Condense',
    hint: 'Cut it down, keep every fact and number',
    instruction:
      'Condense this to roughly half its length. Keep every fact, number, name and outcome. Cut filler, repetition, throat-clearing and obvious statements.',
  },
  shorten: {
    label: 'Shorter sentences',
    hint: 'Split long sentences so it scans',
    instruction: `Break it into short, scannable sentences of at most ${LONG_SENTENCE - 5} words each. Lead each sentence with its main point. Keep all the content — this is about rhythm, not removing information.`,
  },
  voice: {
    label: 'Stronger voice',
    hint: 'Active, confident, owns the decisions',
    instruction:
      'Make it confident and direct. Use active voice. Remove hedging words such as "just", "simply", "tried to", "helped to", "kind of", "basically", "I think". Where the writer clearly made a decision themselves, use "I"; keep "we" for genuine team work. Do not claim anything the writer did not say.',
  },
};

const SECTION_FORMAT = {
  decisions:
    'Keep one decision per line in the form "Decision — trade-off". Do not merge or drop lines.',
  impact:
    'Keep one item per line. Metrics stay in the form "Metric: value" with the original numbers unchanged.',
  role: 'Keep two lines: the role on the first line, the team on the second.',
  title: 'This is a title: return a single line of 8 words or fewer, with no full stop.',
  summary: 'This is a one-sentence summary: return exactly one sentence.',
};

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function textStats(text) {
  const sentences = splitSentences(text);
  const lengths = sentences.map(countWords);
  const words = countWords(text);
  return {
    words,
    sentences: sentences.length,
    longest: lengths.length ? Math.max(...lengths) : 0,
    avg: sentences.length ? Math.round(words / sentences.length) : 0,
    longCount: lengths.filter((n) => n > LONG_SENTENCE).length,
  };
}

// ---------------------------------------------------------------------------
// Quick tidy (no AI) — used when no API key is configured or the request fails
// ---------------------------------------------------------------------------

const WORDY = [
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bowing to the fact that\b/gi, 'because'],
  [/\bin spite of the fact that\b/gi, 'although'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bat the end of the day,?\s*/gi, ''],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\bin the event that\b/gi, 'if'],
  [/\bwith regard(?:s)? to\b/gi, 'on'],
  [/\bin terms of\b/gi, 'for'],
  [/\ba large number of\b/gi, 'many'],
  [/\bthe majority of (them|us|these|those|the)\b/gi, 'most of $1'],
  [/\bthe majority of\b/gi, 'most'],
  [/\bwas able to\b/gi, 'could'],
  [/\bwere able to\b/gi, 'could'],
  [/\bmade the decision to\b/gi, 'decided to'],
  [/\bcame to the conclusion that\b/gi, 'concluded that'],
  [/\bit is important to note that\s*/gi, ''],
  [/\bit should be noted that\s*/gi, ''],
  [/\bneedless to say,?\s*/gi, ''],
  [/\bin my opinion,?\s*/gi, ''],
];

const FILLER = [/\bbasically\b,?\s*/gi, /\bactually\b,?\s*/gi, /\breally\s+/gi, /\bvery\s+/gi, /\bquite\s+/gi, /\bsimply\s+/gi, /\bjust\s+/gi];
const HEDGES = [/\bkind of\s+/gi, /\bsort of\s+/gi, /\bI think\s+(?:that\s+)?/gi, /\bmaybe\s+/gi, /\bsomewhat\s+/gi];

function capitaliseSentences(text) {
  return text.replace(/(^|[.!?]\s+|\n)([a-z])/g, (_m, pre, ch) => pre + ch.toUpperCase());
}

function tidySpacing(text) {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
}

function splitLongSentence(sentence) {
  if (countWords(sentence) <= LONG_SENTENCE) return [sentence];
  const joins = [/,\s+(?:and|but|so|which|while|because)\s+/i, /;\s+/, /\s+(?:and|but|so|because|while)\s+/i, /,\s+/];
  const words = sentence.split(/\s+/);
  const middle = sentence.length / 2;
  for (const join of joins) {
    const re = new RegExp(join.source, 'gi');
    let best = null;
    let match;
    while ((match = re.exec(sentence))) {
      const left = sentence.slice(0, match.index);
      if (countWords(left) < 5 || countWords(sentence.slice(match.index + match[0].length)) < 5) continue;
      if (!best || Math.abs(match.index - middle) < Math.abs(best.index - middle)) best = { index: match.index, length: match[0].length, text: match[0] };
    }
    if (best) {
      let left = sentence.slice(0, best.index).trim().replace(/[,;]$/, '');
      let right = sentence.slice(best.index + best.length).trim();
      const connector = best.text.trim().replace(/^[,;]\s*/, '').toLowerCase();
      if (connector === 'but') right = `But ${right}`;
      else if (connector === 'so') right = `So ${right}`;
      else if (connector === 'because') right = `This was because ${right}`;
      else if (connector === 'which') right = `This ${right}`;
      if (!/[.!?]$/.test(left)) left += '.';
      return [...splitLongSentence(left), ...splitLongSentence(right)];
    }
  }
  return words.length ? [sentence] : [];
}

function mapLines(text, fn) {
  return String(text || '')
    .split('\n')
    .map((line) => (line.trim() ? fn(line) : line))
    .join('\n');
}

export function quickTidy(text, mode) {
  let out = String(text || '');
  WORDY.forEach(([re, rep]) => {
    out = out.replace(re, rep);
  });
  if (mode === 'condense' || mode === 'voice') FILLER.forEach((re) => (out = out.replace(re, '')));
  if (mode === 'voice' || mode === 'condense') {
    HEDGES.forEach((re) => (out = out.replace(re, '')));
    out = out.replace(/\b(tried|attempted) to\s+/gi, '').replace(/\bhelped (?:to\s+)?/gi, '');
  }
  if (mode === 'shorten' || mode === 'condense') {
    out = mapLines(out, (line) =>
      splitSentences(line)
        .flatMap(splitLongSentence)
        .join(' ')
    );
  }
  return capitaliseSentences(tidySpacing(out));
}

// ---------------------------------------------------------------------------
// AI prompt
// ---------------------------------------------------------------------------

export function buildRewritePrompt({ text, mode, section, sectionLabel }) {
  const m = REWRITE_MODES[mode] || REWRITE_MODES.condense;
  const system = [
    'You are a senior design hiring lead editing a designer\'s portfolio case study so it is easy to scan.',
    'Rules:',
    '- Never invent facts, numbers, names, tools or results. Only use what is in the text.',
    '- Keep the writer\'s first-person perspective and their spelling conventions (e.g. British or American English).',
    '- Plain, confident language. No buzzwords, no marketing tone, no emoji, no markdown formatting.',
    '- Keep line breaks that separate items.',
    '- Reply with the rewritten text only — no preamble, no quotation marks, no explanation.',
  ].join('\n');
  const format = SECTION_FORMAT[section] ? `\nFormat: ${SECTION_FORMAT[section]}` : '';
  const user = `Section: ${sectionLabel || 'Case study text'}\nTask: ${m.instruction}${format}\n\n<text>\n${text}\n</text>`;
  return { system, user };
}
