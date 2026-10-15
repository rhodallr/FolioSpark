// Recruiter-lens analysis: job-spec alignment, per-answer critique, and full audits.
// Runs entirely in the browser — no API keys needed.

import { STEPS, isStepFilled } from './caseStudy';
import { wordCount } from './utils';

export const SKILLS = [
  {
    id: 'design-systems',
    label: 'Design systems',
    keywords: ['design system', 'component library', 'design tokens', 'tokens', 'pattern library', 'ui kit', 'storybook'],
    ask: 'Did you create or extend shared components, tokens or patterns? Name them.',
  },
  {
    id: 'cross-functional',
    label: 'Cross-functional leadership',
    keywords: ['cross-functional', 'cross functional', 'stakeholder', 'engineer', 'product manager', ' pm ', 'partnered', 'aligned', 'facilitat', 'workshop', 'collaborat'],
    ask: 'Show a moment where you aligned engineering, product or leadership — what did you do to get agreement?',
  },
  {
    id: 'research',
    label: 'User research',
    keywords: ['user research', 'interview', 'usability test', 'survey', 'research', 'synthes', 'persona', 'diary study', 'contextual inquiry'],
    ask: 'Mention the research you ran or used — method, sample size, and the one insight that changed direction.',
  },
  {
    id: 'metrics',
    label: 'Data-informed design',
    keywords: ['metric', 'a/b', 'ab test', 'experiment', 'analytics', 'conversion', 'retention', 'kpi', 'data', 'funnel', 'amplitude', 'mixpanel'],
    ask: 'Point to a number you used to make or validate a decision.',
  },
  {
    id: 'prototyping',
    label: 'Prototyping',
    keywords: ['prototype', 'prototyping', 'protopie', 'framer', 'clickable', 'high-fidelity', 'hi-fi'],
    ask: 'Describe a prototype you built and what it let you test.',
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    keywords: ['accessib', 'wcag', 'a11y', 'screen reader', 'contrast', 'inclusive'],
    ask: 'Name an accessibility standard or change you designed for.',
  },
  {
    id: 'strategy',
    label: 'Product strategy',
    keywords: ['strategy', 'strategic', 'roadmap', 'vision', 'prioritis', 'prioritiz', 'north star', 'business goal', 'okr'],
    ask: 'Show how the work connected to a company goal or roadmap decision.',
  },
  {
    id: 'ia',
    label: 'Information architecture',
    keywords: ['information architecture', 'navigation', 'sitemap', 'card sort', 'taxonomy', 'tree test'],
    ask: 'Explain how you structured content or navigation, and how you tested it.',
  },
  {
    id: 'interaction',
    label: 'Interaction design',
    keywords: ['interaction', 'user flow', 'micro-interaction', 'motion', 'edge case', 'error state', 'empty state'],
    ask: 'Describe a flow, state or interaction detail you sweated over.',
  },
  {
    id: 'visual',
    label: 'Visual design',
    keywords: ['visual design', 'typography', 'brand', 'illustration', 'colour', 'color', 'grid', 'art direction'],
    ask: 'Call out a visual or brand decision and why it fit the audience.',
  },
  {
    id: 'mentorship',
    label: 'Mentorship & leadership',
    keywords: ['mentor', 'coached', 'led a team', 'managed', 'hiring', 'critique', 'leadership', 'line manag'],
    ask: 'Did you mentor, run critiques, or lead other designers? Say how.',
  },
  {
    id: 'systems-thinking',
    label: 'Systems thinking',
    keywords: ['end-to-end', 'end to end', 'ecosystem', 'service design', 'journey map', 'blueprint', 'at scale', 'platform'],
    ask: 'Zoom out: how did this fit the wider product or service journey?',
  },
];

const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

function normalise(text) {
  return ` ${String(text || '').toLowerCase().replace(/\s+/g, ' ')} `;
}

export function detectSkills(text) {
  const haystack = normalise(text);
  return SKILLS.filter((s) => s.keywords.some((k) => haystack.includes(k))).map((s) => s.id);
}

export function contentToPlainText(content) {
  return [
    content.title,
    content.summary,
    content.role,
    content.team,
    content.timeline,
    content.context,
    content.problem,
    content.value,
    ...content.decisions.map((d) => `${d.title} ${d.tradeoff}`),
    content.before,
    content.after,
    ...content.metrics.map((m) => `${m.label} ${m.value}`),
    ...content.outcomes,
    content.reflection,
    ...content.diagrams.map((d) => `${d.title} ${d.steps.join(' ')}`),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Which skills the target jobs ask for, how often, and whether the case study proves them.
 * Returns [] when there are no targets yet.
 */
export function analyzeAlignment(onboarding, content) {
  if (!onboarding) return [];
  const jobs = (onboarding.jobs || []).filter((j) => String(j).trim());
  const demand = {};
  jobs.forEach((job) => {
    detectSkills(job).forEach((id) => {
      demand[id] = (demand[id] || 0) + 1;
    });
  });
  (onboarding.skills || []).forEach((id) => {
    if (!SKILL_BY_ID[id]) return;
    demand[id] = demand[id] || 0;
  });

  const proven = new Set(detectSkills(contentToPlainText(content)));
  const chosen = new Set(onboarding.skills || []);

  return Object.keys(demand)
    .map((id) => ({
      id,
      label: SKILL_BY_ID[id].label,
      ask: SKILL_BY_ID[id].ask,
      jobs: demand[id],
      chosen: chosen.has(id),
      proven: proven.has(id),
    }))
    .sort((a, b) => b.jobs + (b.chosen ? 0.5 : 0) - (a.jobs + (a.chosen ? 0.5 : 0)));
}

const HEDGES = ['just', 'simply', 'tried to', 'helped to', 'kind of', 'sort of', 'basically', 'i think', 'maybe'];

function sentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function countWord(text, word) {
  const matches = String(text || '').toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g'));
  return matches ? matches.length : 0;
}

/** Short, specific feedback on a single answer, from a hiring-lead point of view. */
export function critiqueAnswer(stepId, text) {
  const notes = [];
  const words = wordCount(text);
  const lower = String(text || '').toLowerCase();

  const longForm = ['context', 'problem', 'value', 'reflection', 'before', 'after'];
  const thin = words < 8 || (words < 15 && !/\d/.test(text));
  if (longForm.includes(stepId) && thin && !/^https?:\/\//.test(text.trim())) {
    notes.push('This is a little thin. One more concrete detail — a number, a quote, a name — will make it land.');
  }
  if (longForm.includes(stepId) && words > 130) {
    notes.push(`At ${words} words this will get skimmed. Aim for 60–100 and move the rest into a caption or appendix.`);
  }

  const avg = sentences(text).length ? words / sentences(text).length : 0;
  if (avg > 28) {
    notes.push('Some sentences run long. Breaking them up will make the page easier to scan.');
  }

  if (['context', 'problem', 'decisions', 'reflection'].includes(stepId)) {
    const we = countWord(text, 'we');
    const i = countWord(text, 'i');
    if (we >= 2 && i === 0) {
      notes.push('Recruiter lens: it reads as all "we". Use "I" for the decisions you personally drove.');
    }
  }

  const hedge = HEDGES.find((h) => lower.includes(h));
  if (hedge && stepId !== 'title') {
    notes.push(`"${hedge}" softens your claim. Cut it and state what you did.`);
  }

  if (stepId === 'title' && words > 10) {
    notes.push('Titles land best under ~8 words. Lead with the outcome, not the feature.');
  }
  if (stepId === 'summary' && !/\d/.test(text) && words > 0) {
    notes.push('Strong one-liners often carry a result. If you have a headline number, put it here.');
  }
  if (stepId === 'problem' && !/(user|customer|people|research|interview|data|ticket|survey|%|\d)/i.test(text)) {
    notes.push('How did you know this was the problem? Add the evidence — research, data, or support volume.');
  }
  if (stepId === 'value' && !/(revenue|cost|£|\$|€|retention|conversion|churn|growth|%|\d|target|goal)/i.test(text)) {
    notes.push('Tie this to something the business counts — revenue, cost, retention, or a target.');
  }
  if (stepId === 'decisions') {
    const lines = String(text || '').split('\n').filter((l) => l.trim());
    const withTradeoff = lines.filter((l) => /\s[—–-]{1,2}\s|:\s|because|instead|but|trade/i.test(l)).length;
    if (lines.length < 2) notes.push('Two to four decisions shows range. Is there another call you made?');
    if (withTradeoff < lines.length) {
      notes.push('A few decisions have no trade-off. Hiring leads look for what you gave up — that is the judgement.');
    }
  }
  if (stepId === 'impact') {
    if (!/\d/.test(text)) {
      notes.push('No numbers yet. Even proxy metrics help — time saved, tickets reduced, tasks completed in testing.');
    } else if (!/(revenue|conversion|retention|churn|cost|time|nps|csat|tickets|adoption|%)/i.test(text)) {
      notes.push('Good to see numbers. Make sure at least one is a business metric, not just an output count.');
    }
  }
  if (stepId === 'reflection' && !/(would|next time|differently|learn|learned|learnt)/i.test(text)) {
    notes.push('Make the lesson explicit — "Next time I would…" signals self-awareness.');
  }

  return notes.slice(0, 3);
}

/** Full document audit: completeness, density, readability, tone, storytelling. */
export function fullAudit(content, alignment = []) {
  const issues = [];

  const missing = STEPS.filter((s) => !isStepFilled(s.id, content));
  if (missing.length) {
    issues.push({
      level: missing.length > 3 ? 'high' : 'medium',
      area: 'Storytelling',
      title: `${missing.length} section${missing.length === 1 ? '' : 's'} still empty`,
      detail: `Missing: ${missing.map((s) => s.label).join(', ')}.`,
    });
  }

  const longSections = ['context', 'problem', 'value', 'reflection']
    .map((id) => ({ id, words: wordCount(content[id]) }))
    .filter((s) => s.words > 130);
  longSections.forEach((s) => {
    issues.push({
      level: 'medium',
      area: 'Text density',
      title: `${STEPS.find((x) => x.id === s.id).label} is ${s.words} words`,
      detail: 'Most reviewers spend under a minute per case study. Trim to the essentials or split into a visual.',
    });
  });

  const allText = contentToPlainText(content);
  const sents = sentences(allText);
  const avg = sents.length ? wordCount(allText) / sents.length : 0;
  if (avg > 22) {
    issues.push({
      level: 'low',
      area: 'Readability',
      title: `Average sentence is ${Math.round(avg)} words`,
      detail: 'Around 15–20 reads comfortably on screen. Split compound sentences.',
    });
  }

  const we = countWord(allText, 'we');
  const i = countWord(allText, 'i');
  if (we > 3 && we > i * 2) {
    issues.push({
      level: 'high',
      area: 'Tone of voice',
      title: 'Your contribution is hard to see',
      detail: `"We" appears ${we} times and "I" ${i}. Credit the team, but own your decisions.`,
    });
  }

  const hedges = HEDGES.filter((h) => allText.toLowerCase().includes(h));
  if (hedges.length) {
    issues.push({
      level: 'low',
      area: 'Tone of voice',
      title: 'Hedging language',
      detail: `Found: ${hedges.map((h) => `"${h}"`).join(', ')}. Confident, plain statements read as senior.`,
    });
  }

  if (content.decisions.length && content.decisions.some((d) => !d.tradeoff)) {
    issues.push({
      level: 'medium',
      area: 'Storytelling',
      title: 'Decisions without trade-offs',
      detail: 'Each decision should say what you gave up. That is where judgement shows.',
    });
  }

  if (!content.metrics.length && (content.outcomes.length || content.problem)) {
    issues.push({
      level: 'high',
      area: 'Business impact',
      title: 'No quantified results',
      detail: 'Add at least one metric. If the project shipped recently, use leading indicators from testing.',
    });
  }

  if (!content.diagrams.length && content.decisions.length >= 3) {
    issues.push({
      level: 'low',
      area: 'Visual structure',
      title: 'Process is all text',
      detail: 'A simple flow diagram would break up the page and make your process scannable.',
    });
  }

  alignment
    .filter((a) => !a.proven)
    .slice(0, 3)
    .forEach((a) => {
      issues.push({
        level: a.jobs >= 2 ? 'high' : 'medium',
        area: 'Job alignment',
        title: `No proof of ${a.label}`,
        detail: `${a.jobs ? `${a.jobs} target role${a.jobs === 1 ? '' : 's'} ask for this. ` : ''}${a.ask}`,
      });
    });

  const order = { high: 0, medium: 1, low: 2 };
  return issues.sort((a, b) => order[a.level] - order[b.level]);
}
