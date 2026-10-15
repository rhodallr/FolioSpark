// Case study data model, guided interview steps, and parsers.

export const PHASES = ['Context', 'Problem & Value', 'Process & Decisions', 'Business Impact', 'Reflection'];

export const GOALS = [
  { id: 'new-role', label: 'Land a new role' },
  { id: 'promotion', label: 'Make the case for a promotion' },
  { id: 'freelance', label: 'Win freelance clients' },
  { id: 'brand', label: 'Build my public profile' },
];

/**
 * The guided interview. Each step fills one part of the case study.
 * Low-friction facts come first; trade-offs and impact come later.
 */
export const STEPS = [
  {
    id: 'title',
    phase: 'Context',
    label: 'Title',
    prompt: "Let's start easy. **What's the project called?** A working title is fine — we can sharpen it later.",
    placeholder: 'e.g. Rebuilding checkout for first-time buyers',
  },
  {
    id: 'summary',
    phase: 'Context',
    label: 'One-liner',
    prompt: 'Now the elevator pitch: **in one sentence, what did you change and for whom?**',
    placeholder: 'e.g. I redesigned checkout so first-time buyers could pay in under a minute.',
  },
  {
    id: 'role',
    phase: 'Context',
    label: 'Role & team',
    prompt:
      '**What was your role, and who was on the team?** Put your role on the first line and the team on the second.',
    placeholder: 'Lead product designer\n2 engineers, 1 PM, 1 researcher',
  },
  {
    id: 'timeline',
    phase: 'Context',
    label: 'Timeline & tools',
    prompt: '**How long did it run, and what tools did you lean on?**',
    placeholder: '12 weeks · Figma, Maze, Amplitude',
  },
  {
    id: 'context',
    phase: 'Context',
    label: 'Context',
    prompt:
      "**Set the scene.** What's the company or product, who uses it, and what was happening when this project started?",
    placeholder: 'A UK grocery app with 400k monthly users. Growth had stalled because…',
  },
  {
    id: 'problem',
    phase: 'Problem & Value',
    label: 'Problem',
    prompt:
      '**What problem were you solving?** Whose pain was it, and how did you know — research, data, support tickets?',
    placeholder: '38% of new users abandoned at the payment step. Interviews showed…',
  },
  {
    id: 'value',
    phase: 'Problem & Value',
    label: 'Business value',
    prompt: '**Why did it matter to the business?** What was at stake if nothing changed?',
    placeholder: 'Each abandoned basket was worth ~£42. Leadership had set a Q3 target to…',
  },
  {
    id: 'decisions',
    phase: 'Process & Decisions',
    label: 'Key decisions',
    prompt:
      'This is where hiring leads lean in. **Walk me through 2–4 key decisions and what you traded off.** One per line, as `Decision — trade-off`.',
    placeholder:
      'Guest checkout first — we gave up early account sign-ups\nOne-page form — harder to validate, but fewer drop-off points',
  },
  {
    id: 'before',
    phase: 'Process & Decisions',
    label: 'Before',
    prompt: '**Describe the "before" state** — or paste an image URL of it.',
    placeholder: 'Five-step checkout, mandatory account creation, card form on step 4…',
  },
  {
    id: 'after',
    phase: 'Process & Decisions',
    label: 'After',
    prompt: '**And the "after" state?** Again, text or an image URL both work.',
    placeholder: 'Single page, guest by default, Apple Pay above the fold…',
  },
  {
    id: 'impact',
    phase: 'Business Impact',
    label: 'Impact',
    prompt:
      '**What changed?** Put each metric on its own line as `Metric: value`. Add qualitative outcomes as plain lines.',
    placeholder: 'Checkout conversion: +18%\nTime to pay: 3m 10s → 52s\nSupport tickets about payment dropped noticeably',
  },
  {
    id: 'reflection',
    phase: 'Reflection',
    label: 'Reflection',
    prompt: 'Last one. **What did you learn, and what would you do differently?**',
    placeholder: "I'd bring engineering into discovery earlier — two of our concepts weren't feasible…",
  },
];

export const THEMES = {
  warm: {
    label: 'Warm',
    vars: {
      '--bg': '#FFFDF9',
      '--fg': '#1A1714',
      '--muted': '#6B635A',
      '--accent': '#E8590C',
      '--accent-soft': '#FFE8D9',
      '--card': '#F6F1E9',
      '--line': '#E7E0D6',
    },
  },
  mono: {
    label: 'Mono',
    vars: {
      '--bg': '#FFFFFF',
      '--fg': '#111111',
      '--muted': '#666666',
      '--accent': '#111111',
      '--accent-soft': '#EDEDED',
      '--card': '#F5F5F5',
      '--line': '#E2E2E2',
    },
  },
  midnight: {
    label: 'Midnight',
    vars: {
      '--bg': '#12131A',
      '--fg': '#F1EFEA',
      '--muted': '#A09CB0',
      '--accent': '#9B8CFF',
      '--accent-soft': '#2A2645',
      '--card': '#1C1D27',
      '--line': '#2C2D3A',
    },
  },
};

export const PROCESS_LAYOUTS = [
  { id: 'flip', label: 'Flip cards' },
  { id: 'carousel', label: 'Carousel' },
  { id: 'timeline', label: 'Timeline' },
];

export function emptyContent() {
  return {
    title: '',
    summary: '',
    role: '',
    team: '',
    timeline: '',
    context: '',
    problem: '',
    value: '',
    decisions: [],
    before: '',
    after: '',
    metrics: [],
    outcomes: [],
    reflection: '',
    diagrams: [],
    styleRefs: [],
    processLayout: 'flip',
    theme: 'warm',
  };
}

export function emptyProject() {
  return {
    title: 'Untitled case study',
    target_roles: [],
    status: 'draft',
    completion: 0,
    onboarding: null,
    content: emptyContent(),
    chat: [],
    flow: { step: 0, editing: null },
  };
}

/** Fill any fields missing from older saved projects. */
export function normaliseProject(raw) {
  const base = emptyProject();
  const project = { ...base, ...(raw || {}) };
  project.content = { ...emptyContent(), ...(raw?.content || {}) };
  project.chat = Array.isArray(raw?.chat) ? raw.chat : [];
  project.flow = { ...base.flow, ...(raw?.flow || {}) };
  project.target_roles = Array.isArray(raw?.target_roles) ? raw.target_roles : [];
  return project;
}

const DECISION_SPLIT = /\s+[—–]\s+|\s+-{1,2}\s+|:\s+/;

export function parseDecisions(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(DECISION_SPLIT);
      if (!match) return { title: line, tradeoff: '' };
      const idx = match.index;
      return { title: line.slice(0, idx).trim(), tradeoff: line.slice(idx + match[0].length).trim() };
    });
}

export function parseImpact(text) {
  const metrics = [];
  const outcomes = [];
  String(text || '')
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)]\s)\s*/, '').trim())
    .filter(Boolean)
    .forEach((line) => {
      const colon = line.indexOf(':');
      if (colon > 0 && colon < line.length - 1 && /\d/.test(line.slice(colon + 1))) {
        metrics.push({ label: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim() });
      } else {
        outcomes.push(line);
      }
    });
  return { metrics, outcomes };
}

/** Apply an answer for a given step to the content object. Returns new content. */
export function applyAnswer(stepId, text, content) {
  const value = String(text || '').trim();
  const next = { ...content };
  switch (stepId) {
    case 'role': {
      const [first, ...rest] = value.split('\n');
      next.role = (first || '').trim();
      next.team = rest.join(' ').trim();
      break;
    }
    case 'decisions':
      next.decisions = parseDecisions(value);
      break;
    case 'impact': {
      const { metrics, outcomes } = parseImpact(value);
      next.metrics = metrics;
      next.outcomes = outcomes;
      break;
    }
    default:
      next[stepId] = value;
  }
  return next;
}

/** Turn a stored field back into editable text (for "refine a section"). */
export function fieldToText(stepId, content) {
  switch (stepId) {
    case 'role':
      return [content.role, content.team].filter(Boolean).join('\n');
    case 'decisions':
      return content.decisions.map((d) => (d.tradeoff ? `${d.title} — ${d.tradeoff}` : d.title)).join('\n');
    case 'impact':
      return [...content.metrics.map((m) => `${m.label}: ${m.value}`), ...content.outcomes].join('\n');
    default:
      return content[stepId] || '';
  }
}

export function isStepFilled(stepId, content) {
  switch (stepId) {
    case 'role':
      return Boolean(content.role);
    case 'decisions':
      return content.decisions.length > 0;
    case 'impact':
      return content.metrics.length > 0 || content.outcomes.length > 0;
    default:
      return Boolean(String(content[stepId] || '').trim());
  }
}

export function computeCompletion(content) {
  const filled = STEPS.filter((s) => isStepFilled(s.id, content)).length;
  return Math.round((filled / STEPS.length) * 100);
}

export function statusFromCompletion(completion) {
  if (completion >= 100) return 'ready';
  if (completion >= 25) return 'in-progress';
  return 'draft';
}

export const STATUS_LABELS = {
  draft: 'Draft',
  'in-progress': 'In progress',
  ready: 'Ready to publish',
};

export function parseDiagramSteps(text) {
  return String(text || '')
    .split(/\s*(?:->|→|=>|>|\n|,)\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}
