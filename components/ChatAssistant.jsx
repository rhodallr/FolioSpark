'use client';

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  Check,
  ChevronLeft,
  ClipboardCheck,
  GitBranch,
  Link2,
  Loader2,
  Maximize2,
  Minimize2,
  PenLine,
  Plus,
  RefreshCw,
  Settings2,
  SkipForward,
  Sparkles,
  Target,
  Trash2,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import { LONG_SENTENCE, REWRITE_MODES, quickTidy, textStats } from '@/lib/rewrite';
import {
  GOALS,
  PHASES,
  STEPS,
  THEMES,
  applyAnswer,
  fieldToText,
  isStepFilled,
  parseDiagramSteps,
} from '@/lib/caseStudy';
import { SKILLS, analyzeAlignment, critiqueAnswer, fullAudit } from '@/lib/analysis';
import { cn, uid } from '@/lib/utils';

const MAX_JOBS = 5;
const REPLY_DELAY = 550;

// ---------------------------------------------------------------------------
// Small rendering helpers
// ---------------------------------------------------------------------------

function RichText({ text }) {
  const lines = String(text || '').split('\n');
  return lines.map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
    return (
      <Fragment key={li}>
        {li > 0 && <br />}
        {parts.map((part, pi) => {
          if (part.startsWith('**') && part.endsWith('**')) return <strong key={pi}>{part.slice(2, -2)}</strong>;
          if (part.startsWith('`') && part.endsWith('`'))
            return (
              <code key={pi} className="rounded bg-paper-deep px-1 py-0.5 text-[0.85em]">
                {part.slice(1, -1)}
              </code>
            );
          return <Fragment key={pi}>{part}</Fragment>;
        })}
      </Fragment>
    );
  });
}

const LEVEL_STYLES = {
  high: 'bg-red-50 text-red-700 border-red-100',
  medium: 'bg-amber-50 text-amber-800 border-amber-100',
  low: 'bg-sky-50 text-sky-800 border-sky-100',
};

function msg(role, text, extra = {}) {
  return { id: uid(), role, text, at: new Date().toISOString(), ...extra };
}

// ---------------------------------------------------------------------------
// Conversation copy
// ---------------------------------------------------------------------------

function askFor(index, alignment) {
  const step = STEPS[index];
  if (!step) return null;
  const prev = STEPS[index - 1];
  const parts = [];
  if (!prev || prev.phase !== step.phase) {
    const phaseNo = PHASES.indexOf(step.phase) + 1;
    parts.push(`**Phase ${phaseNo} of ${PHASES.length} · ${step.phase}**`);
    const gap = alignment.find((a) => !a.proven);
    if (prev && gap) {
      parts.push(`While you answer, look for a chance to show **${gap.label}** — it's still missing. ${gap.ask}`);
    }
  }
  parts.push(step.prompt);
  return parts.join('\n');
}

// Offer a one-click fix when the answer is long or hard to scan.
function polishActionsFor(stepId, text) {
  if (['title', 'timeline'].includes(stepId)) return [];
  const s = textStats(text);
  if (s.words > 110) return [{ type: 'polish', stepId, mode: 'condense' }];
  if (s.longCount > 0) return [{ type: 'polish', stepId, mode: 'shorten' }];
  return [];
}

function feedbackFor(stepId, text, before, after) {
  const lines = [];
  const newlyProven = after.filter((a) => a.proven && !before.find((b) => b.id === a.id && b.proven));
  newlyProven.forEach((a) => {
    lines.push(
      `✓ That's proof of **${a.label}**${a.jobs ? ` — ${a.jobs} of your target role${a.jobs === 1 ? '' : 's'} ask for it` : ''}.`
    );
  });
  const notes = critiqueAnswer(stepId, text);
  if (notes.length) {
    lines.push(notes.length === 1 ? `One note: ${notes[0]}` : `A few notes:\n${notes.map((n) => `• ${n}`).join('\n')}`);
  } else if (!newlyProven.length) {
    const praise = ['Clear and specific — nice.', 'Good, that reads well.', 'Solid. That gives a reviewer what they need.'];
    lines.push(praise[text.length % praise.length]);
  }
  return lines.join('\n');
}

function introFor(onboarding, alignment) {
  const lines = [
    "Hi — I'm your design partner for this case study. I'll ask about **one thing at a time**, and the preview on the right fills in as we go. You can skip anything and come back later.",
  ];
  const goal = GOALS.find((g) => g.id === onboarding.goal);
  if (goal?.id === 'promotion') lines.push('Since this is for a promotion, I\'ll push you on scope, influence and business outcomes.');
  if (goal?.id === 'freelance') lines.push('For freelance clients, results and how you work together matter more than tools — I\'ll steer that way.');
  if (goal?.id === 'new-role') lines.push("I'll read your answers the way a hiring lead would.");
  if (goal?.id === 'brand') lines.push("For a public audience, I'll help you keep it skimmable and story-led.");

  const demanded = alignment.filter((a) => a.jobs > 0).slice(0, 4);
  if (demanded.length) {
    lines.push(
      `Across your targets, the skills in demand are ${demanded
        .map((a) => `**${a.label}** (${a.jobs})`)
        .join(', ')}. I'll track which ones your story proves at the top of this panel.`
    );
  } else if (alignment.length) {
    lines.push(`I'll track proof of the skills you picked: ${alignment.map((a) => `**${a.label}**`).join(', ')}.`);
  }
  const linkOnly = (onboarding.jobs || []).filter((j) => /^https?:\/\/\S+$/.test(String(j).trim()));
  if (linkOnly.length) {
    lines.push(
      "Heads up: I can't open job links, so I can only match skills from pasted text. Paste the description itself (under **Targets**) for the sharpest matching."
    );
  }
  return lines.join('\n\n');
}

function themeFromNote(note) {
  const n = note.toLowerCase();
  if (/(dark|moody|night|neon)/.test(n)) return 'midnight';
  if (/(minimal|clean|monochrome|black and white|swiss|stark)/.test(n)) return 'mono';
  if (/(warm|editorial|serif|friendly|soft)/.test(n)) return 'warm';
  return null;
}

// ---------------------------------------------------------------------------
// Onboarding modal
// ---------------------------------------------------------------------------

function OnboardingModal({ initial, onSubmit, onClose, isFirstRun }) {
  const [goal, setGoal] = useState(initial?.goal || 'new-role');
  const [roles, setRoles] = useState(initial?.roles || '');
  const [jobs, setJobs] = useState(initial?.jobs?.length ? initial.jobs : ['']);
  const [skills, setSkills] = useState(initial?.skills || []);

  function setJob(i, value) {
    setJobs((list) => list.map((j, idx) => (idx === i ? value : j)));
  }

  function toggleSkill(id) {
    setSkills((list) => (list.includes(id) ? list.filter((s) => s !== id) : [...list, id]));
  }

  function submit(e) {
    e.preventDefault();
    onSubmit({
      goal,
      roles: roles.trim(),
      jobs: jobs.map((j) => j.trim()).filter(Boolean).slice(0, MAX_JOBS),
      skills,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <form
        onSubmit={submit}
        className="flex max-h-[90vh] w-full max-w-2xl animate-rise flex-col overflow-hidden rounded-3xl bg-white shadow-soft"
      >
        <div className="flex items-start justify-between gap-4 border-b border-paper-line p-6">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-spark">
              <Sparkles className="h-3.5 w-3.5" /> {isFirstRun ? 'Before we start' : 'Your targets'}
            </p>
            <h2 id="onb-title" className="mt-1 font-display text-2xl font-semibold">
              What should this case study do for you?
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Everything here is optional, but it makes the feedback sharper.</p>
          </div>
          {!isFirstRun && (
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-paper-deep" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto p-6">
          <fieldset>
            <legend className="label">Primary goal</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {GOALS.map((g) => (
                <label
                  key={g.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition',
                    goal === g.id ? 'border-spark bg-spark-light/50 font-medium' : 'border-paper-line hover:bg-paper'
                  )}
                >
                  <input type="radio" name="goal" value={g.id} checked={goal === g.id} onChange={() => setGoal(g.id)} className="sr-only" />
                  <span className={cn('grid h-4 w-4 place-items-center rounded-full border', goal === g.id ? 'border-spark bg-spark' : 'border-paper-line')}>
                    {goal === g.id && <Check className="h-3 w-3 text-white" />}
                  </span>
                  {g.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="roles" className="label">
              Target role titles
            </label>
            <input
              id="roles"
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              className="input"
              placeholder="Senior Product Designer, Design Systems Lead"
            />
            <p className="mt-1 text-xs text-ink-muted">Comma-separated. Shown on your dashboard.</p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label mb-0">Target job descriptions</span>
              <span className="text-xs text-ink-muted">
                {jobs.length}/{MAX_JOBS}
              </span>
            </div>
            <div className="space-y-2">
              {jobs.map((job, i) => (
                <div key={i} className="flex gap-2">
                  <textarea
                    value={job}
                    onChange={(e) => setJob(i, e.target.value)}
                    rows={job.length > 300 ? 8 : 4}
                    className="input resize-y"
                    placeholder="Paste the job description text (best), or a link"
                    aria-label={`Job description ${i + 1}`}
                  />
                  {jobs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setJobs((list) => list.filter((_, idx) => idx !== i))}
                      className="self-start rounded-lg p-2 text-ink-muted hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove job ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {jobs.length < MAX_JOBS && (
              <button type="button" onClick={() => setJobs((list) => [...list, ''])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-spark-dark hover:underline">
                <Plus className="h-4 w-4" /> Add another
              </button>
            )}
          </div>

          <fieldset>
            <legend className="label">Core skills to showcase</legend>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((s) => {
                const on = skills.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSkill(s.id)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition',
                      on ? 'border-ink bg-ink text-paper' : 'border-paper-line bg-white hover:bg-paper'
                    )}
                  >
                    {on && <Check className="mr-1 inline h-3.5 w-3.5" />}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-paper-line bg-paper p-4">
          {isFirstRun && (
            <button type="button" onClick={() => onSubmit({ goal, roles: '', jobs: [], skills: [] })} className="btn-ghost">
              Skip for now
            </button>
          )}
          <button type="submit" className="btn-spark">
            {isFirstRun ? "Let's start" : 'Update targets'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ChatAssistant({ project, update, alignment }) {
  const { content, onboarding, chat, flow } = project;
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [modal, setModal] = useState(!onboarding ? 'first' : null);
  const [tool, setTool] = useState(null); // 'style' | 'diagram' | 'refine' | null
  const [styleUrl, setStyleUrl] = useState('');
  const [styleNote, setStyleNote] = useState('');
  const [diagram, setDiagram] = useState({ type: 'flow', title: '', steps: '' });
  const [rewriting, setRewriting] = useState(null); // mode currently running
  const [suggestion, setSuggestion] = useState(null); // { mode, text, source, original, reason }
  const [undoText, setUndoText] = useState(null);
  const [rewriteError, setRewriteError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const timers = useRef([]);
  const rewriteSeq = useRef(0);

  const currentStep = STEPS[flow.step];
  const editingStep = flow.editing ? STEPS.find((s) => s.id === flow.editing) : null;
  const activeStep = editingStep || currentStep;
  const currentPhase = activeStep ? activeStep.phase : null;
  const done = !currentStep;

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.length, typing]);

  // Grow the text box with its content (never shrinking below a size the user dragged it to).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || expanded) return;
    if (!input) {
      el.style.height = '';
      return;
    }
    const max = Math.round(window.innerHeight * 0.3);
    if (el.scrollHeight > el.clientHeight && el.clientHeight < max) {
      el.style.height = `${Math.min(el.scrollHeight + 2, max)}px`;
    }
  }, [input, expanded]);

  // ----- Writing helper -----

  async function rewrite(mode, sourceText = input, step = activeStep) {
    const text = String(sourceText || '').trim();
    if (!text || rewriting) return;
    const seq = ++rewriteSeq.current;
    setRewriting(mode);
    setRewriteError('');
    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, mode, section: step?.id || '', sectionLabel: step?.label || '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (seq !== rewriteSeq.current) return;
      if (!res.ok) {
        setRewriteError(data.error || 'The rewrite didn’t work. Try again in a moment.');
        return;
      }
      setSuggestion({ mode, text: data.text, source: data.source, reason: data.reason, original: text });
    } catch {
      if (seq !== rewriteSeq.current) return;
      // Offline or route unavailable — still help with a local tidy.
      setSuggestion({ mode, text: quickTidy(text, mode), source: 'rules', reason: 'network', original: text });
    } finally {
      if (seq === rewriteSeq.current) setRewriting(null);
    }
  }

  function acceptSuggestion() {
    if (!suggestion) return;
    setUndoText(input);
    setInput(suggestion.text);
    setSuggestion(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function undoSuggestion() {
    if (undoText === null) return;
    setInput(undoText);
    setUndoText(null);
  }

  function discardSuggestion() {
    rewriteSeq.current += 1;
    setSuggestion(null);
    setRewriting(null);
  }

  // Assistant replies arrive after a short pause so the exchange feels conversational.
  function reply(messages) {
    setTyping(true);
    const t = setTimeout(() => {
      update((p) => ({ ...p, chat: [...p.chat, ...messages] }));
      setTyping(false);
    }, REPLY_DELAY);
    timers.current.push(t);
  }

  function auditMessage(c, a) {
    const items = fullAudit(c, a);
    if (!items.length) {
      return msg('assistant', "I've read it end to end as a hiring lead would. **Nothing major to flag** — this is ready to export.");
    }
    return msg('assistant', `Here's my review, most important first (${items.length} note${items.length === 1 ? '' : 's'}):`, {
      kind: 'audit',
      items,
    });
  }

  // ----- Onboarding -----

  function submitOnboarding(data) {
    const firstRun = modal === 'first';
    setModal(null);
    const nextAlignment = analyzeAlignment(data, content);
    if (firstRun && chat.length === 0) {
      update((p) => ({ ...p, onboarding: data }));
      reply([msg('assistant', introFor(data, nextAlignment)), msg('assistant', askFor(flow.step, nextAlignment))]);
    } else {
      update((p) => ({ ...p, onboarding: data }));
      const missing = nextAlignment.filter((a) => !a.proven);
      reply([
        msg(
          'assistant',
          nextAlignment.length
            ? `Targets updated. Your story currently proves **${nextAlignment.length - missing.length} of ${nextAlignment.length}** skills in demand.${
                missing[0] ? ` Biggest gap: **${missing[0].label}**. ${missing[0].ask}` : ''
              }`
            : 'Targets updated.'
        ),
      ]);
    }
  }

  // ----- Sending -----

  function send(raw) {
    const text = String(raw ?? input).trim();
    if (!text || typing) return;
    setInput('');
    setSuggestion(null);
    setUndoText(null);
    setRewriteError('');
    setExpanded(false);
    const userMsg = msg('user', text);

    if (editingStep) {
      const nextContent = applyAnswer(editingStep.id, text, content);
      const after = analyzeAlignment(onboarding, nextContent);
      update((p) => ({
        ...p,
        content: applyAnswer(editingStep.id, text, p.content),
        chat: [...p.chat, userMsg],
        flow: { ...p.flow, editing: null },
      }));
      const fb = feedbackFor(editingStep.id, text, alignment, after);
      const follow = currentStep ? `\n\nBack to where we were:\n${currentStep.prompt}` : '';
      const polish = polishActionsFor(editingStep.id, text);
      reply([msg('assistant', `Updated **${editingStep.label}**. ${fb}${follow}`, polish.length ? { actions: polish } : {})]);
      return;
    }

    if (currentStep) {
      const nextContent = applyAnswer(currentStep.id, text, content);
      const after = analyzeAlignment(onboarding, nextContent);
      const nextIndex = flow.step + 1;
      update((p) => ({
        ...p,
        content: applyAnswer(currentStep.id, text, p.content),
        chat: [...p.chat, userMsg],
        flow: { ...p.flow, step: nextIndex },
      }));
      const fb = feedbackFor(currentStep.id, text, alignment, after);
      const polish = polishActionsFor(currentStep.id, text);
      const out = [msg('assistant', fb, polish.length ? { actions: polish } : {})];
      if (STEPS[nextIndex]) {
        out.push(msg('assistant', askFor(nextIndex, after)));
      } else {
        out.push(
          msg(
            'assistant',
            "**That's a complete first draft.** Have a look at the preview. Here's my review — then refine any section, add a diagram, or export.",
            { actions: ['diagram', 'style', 'refine'] }
          )
        );
        out.push(auditMessage(nextContent, after));
      }
      reply(out);
      return;
    }

    // Free-form after the interview
    update((p) => ({ ...p, chat: [...p.chat, userMsg] }));
    const lower = text.toLowerCase();
    if (/(audit|review|critique|feedback|check)/.test(lower)) {
      reply([auditMessage(content, alignment)]);
    } else if (/diagram|flow ?chart|visuali[sz]e/.test(lower)) {
      setTool('diagram');
      reply([msg('assistant', "Sure — I've opened the diagram tool below. List the steps separated by `->` and I'll draw it.")]);
    } else if (/(carousel|flip|timeline)/.test(lower)) {
      const layout = lower.includes('carousel') ? 'carousel' : lower.includes('timeline') ? 'timeline' : 'flip';
      update((p) => ({ ...p, content: { ...p.content, processLayout: layout } }));
      reply([msg('assistant', `Switched your decisions to the **${layout}** layout.`)]);
    } else {
      reply([
        msg(
          'assistant',
          'Got it. To change a section, use **Refine** and pick it — your next message will replace it. I can also run an **audit**, draw a **diagram**, or note a **style reference**.',
          { actions: ['audit', 'refine', 'diagram'] }
        ),
      ]);
    }
  }

  function skip() {
    if (!currentStep || typing) return;
    const nextIndex = flow.step + 1;
    update((p) => ({
      ...p,
      chat: [...p.chat, msg('user', `Skip ${currentStep.label.toLowerCase()} for now`, { muted: true })],
      flow: { ...p.flow, step: nextIndex },
    }));
    reply([
      STEPS[nextIndex]
        ? msg('assistant', `No problem — you can fill it in later from **Refine**.\n\n${askFor(nextIndex, alignment)}`)
        : msg('assistant', "That's the end of the interview. Use **Refine** to go back to anything you skipped.", {
            actions: ['refine', 'audit'],
          }),
    ]);
  }

  function back() {
    if (flow.step === 0 || typing) return;
    const prevIndex = Math.min(flow.step, STEPS.length) - 1;
    const prev = STEPS[prevIndex];
    update((p) => ({ ...p, flow: { ...p.flow, step: prevIndex } }));
    setInput(fieldToText(prev.id, content));
    reply([msg('assistant', `Going back. ${prev.prompt}`)]);
    inputRef.current?.focus();
  }

  function startRefine(stepId) {
    const step = STEPS.find((s) => s.id === stepId);
    setTool(null);
    update((p) => ({ ...p, flow: { ...p.flow, editing: stepId } }));
    setInput(fieldToText(stepId, content));
    reply([msg('assistant', `Let's rework **${step.label}**. Edit the text below and send it — it'll replace what's there.\n\n${step.prompt}`)]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function cancelRefine() {
    update((p) => ({ ...p, flow: { ...p.flow, editing: null } }));
    setInput('');
    discardSuggestion();
    setUndoText(null);
  }

  function runAction(action) {
    if (typeof action === 'object' && action.type === 'polish') {
      const step = STEPS.find((s) => s.id === action.stepId);
      const text = fieldToText(action.stepId, content);
      if (!step || !text) return;
      setTool(null);
      update((p) => ({ ...p, flow: { ...p.flow, editing: action.stepId } }));
      setInput(text);
      rewrite(action.mode, text, step);
      return;
    }
    if (typeof action === 'object' && action.type === 'theme') {
      update((p) => ({ ...p, content: { ...p.content, theme: action.value } }));
      reply([msg('assistant', `Applied the **${THEMES[action.value].label}** theme to the preview.`)]);
      return;
    }
    if (action === 'audit') reply([auditMessage(content, alignment)]);
    if (action === 'diagram' || action === 'style' || action === 'refine') setTool(action);
  }

  // ----- Tools -----

  function addStyleRef(e) {
    e.preventDefault();
    const url = styleUrl.trim();
    if (!url) return;
    const note = styleNote.trim();
    update((p) => ({
      ...p,
      content: { ...p.content, styleRefs: [...p.content.styleRefs, { id: uid(), url, note }] },
      chat: [...p.chat, msg('user', `Style reference: ${url}${note ? `\n“${note}”` : ''}`)],
    }));
    setStyleUrl('');
    setStyleNote('');
    setTool(null);
    const theme = note ? themeFromNote(note) : null;
    const text = note
      ? `Saved. I can't open links, so I'm going by your note.${
          theme && theme !== content.theme ? ` It sounds closest to the **${THEMES[theme].label}** theme.` : ''
        }`
      : "Saved. I can't open links myself — tell me what you like about it (layout, type, colour, tone) and I'll suggest how to bring that into the preview.";
    reply([msg('assistant', text, theme && theme !== content.theme ? { actions: [{ type: 'theme', value: theme }] } : {})]);
  }

  function removeStyleRef(id) {
    update((p) => ({ ...p, content: { ...p.content, styleRefs: p.content.styleRefs.filter((r) => r.id !== id) } }));
  }

  function addDiagram(e) {
    e.preventDefault();
    const steps = parseDiagramSteps(diagram.steps);
    if (steps.length < 2) return;
    const block = { id: uid(), type: diagram.type, title: diagram.title.trim(), steps };
    update((p) => ({
      ...p,
      content: { ...p.content, diagrams: [...p.content.diagrams, block] },
      chat: [...p.chat, msg('user', `Add a ${diagram.type} diagram: ${steps.join(' → ')}`)],
    }));
    setDiagram({ type: 'flow', title: '', steps: '' });
    setTool(null);
    reply([
      msg(
        'assistant',
        steps.length > 6
          ? `Added. At ${steps.length} steps it's getting busy — reviewers take in 4–6 at a glance. Consider grouping some.`
          : `Added a **${block.type}** diagram with ${steps.length} steps. It's in the preview under your decisions.`
      ),
    ]);
  }

  // ----- Derived UI -----

  const stats = useMemo(() => textStats(input), [input]);
  const provenCount = alignment.filter((a) => a.proven).length;
  const phaseIndex = done && !editingStep ? PHASES.length : PHASES.indexOf(currentPhase);
  const placeholder = activeStep ? activeStep.placeholder : 'Ask for an audit, a diagram, or a layout change…';
  const actionLabels = useMemo(
    () => ({ audit: 'Run an audit', diagram: 'Add a diagram', style: 'Add style reference', refine: 'Refine a section' }),
    []
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header: phases + alignment */}
      <div className="space-y-3 border-b border-paper-line bg-paper px-4 py-3">
        <ol className="flex gap-1" aria-label="Interview progress">
          {PHASES.map((p, i) => (
            <li key={p} className="flex-1" title={p}>
              <div
                className={cn(
                  'h-1 rounded-full',
                  i < phaseIndex ? 'bg-spark' : i === phaseIndex ? 'bg-spark/40' : 'bg-paper-line'
                )}
              />
              <span className={cn('mt-1 hidden truncate text-[10px] xl:block', i === phaseIndex ? 'font-semibold text-ink' : 'text-ink-muted')}>
                {p}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {alignment.length ? (
              <>
                <span className="mr-1 self-center text-xs font-medium text-ink-muted">
                  Skill proof {provenCount}/{alignment.length}
                </span>
                {alignment.map((a) => (
                  <span
                    key={a.id}
                    title={a.proven ? 'Shown in your story' : a.ask}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      a.proven
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'border border-dashed border-spark/50 text-spark-dark'
                    )}
                  >
                    {a.proven && <Check className="h-3 w-3" />}
                    {a.label}
                    {a.jobs > 1 && <span className="opacity-60">×{a.jobs}</span>}
                  </span>
                ))}
              </>
            ) : (
              <span className="text-xs text-ink-muted">Add target jobs or skills to see live gap analysis.</span>
            )}
          </div>
          <button type="button" onClick={() => setModal('edit')} className="btn-ghost shrink-0 px-2.5 py-1 text-xs">
            <Target className="h-3.5 w-3.5" /> Targets
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="scrollbar-thin min-h-[140px] flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {chat.length === 0 && !typing && (
          <div className="grid h-full place-items-center text-center text-sm text-ink-muted">
            <div>
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-spark" />
              Set your targets to begin.
              <div>
                <button type="button" onClick={() => setModal('first')} className="btn-spark mt-3">
                  Get started
                </button>
              </div>
            </div>
          </div>
        )}

        {chat.map((m) => (
          <div key={m.id} className={cn('flex animate-rise', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                m.role === 'user'
                  ? cn('rounded-tr-sm whitespace-pre-wrap', m.muted ? 'bg-paper-deep italic text-ink-muted' : 'bg-ink text-paper')
                  : 'rounded-tl-sm border border-paper-line bg-white text-ink shadow-sm'
              )}
            >
              {m.role === 'user' ? m.text : <RichText text={m.text} />}

              {m.kind === 'audit' && (
                <ul className="mt-3 space-y-2">
                  {m.items.map((it, i) => (
                    <li key={i} className={cn('rounded-xl border p-2.5', LEVEL_STYLES[it.level])}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                        {it.area} · {it.level}
                      </p>
                      <p className="font-medium">{it.title}</p>
                      <p className="text-xs opacity-90">{it.detail}</p>
                    </li>
                  ))}
                </ul>
              )}

              {m.actions?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.actions.map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => runAction(a)}
                      className="rounded-full border border-paper-line bg-paper px-2.5 py-1 text-xs font-medium hover:border-spark hover:text-spark-dark"
                    >
                      {typeof a === 'string' ? (
                        actionLabels[a]
                      ) : a.type === 'polish' ? (
                        <span className="inline-flex items-center gap-1">
                          <Wand2 className="h-3 w-3" />
                          {a.mode === 'condense' ? 'Condense it for me' : 'Shorten the sentences for me'}
                        </span>
                      ) : (
                        `Apply ${THEMES[a.value].label} theme`
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-tl-sm border border-paper-line bg-white px-4 py-3" aria-label="Assistant is typing">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-blink rounded-full bg-ink-muted" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tool panels */}
      {tool === 'refine' && (
        <div className="animate-rise border-t border-paper-line bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Refine a section</p>
            <button type="button" onClick={() => setTool(null)} aria-label="Close" className="rounded p-1 text-ink-muted hover:bg-paper-deep">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => startRefine(s.id)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs',
                  isStepFilled(s.id, content) ? 'border-paper-line bg-paper hover:border-spark' : 'border-dashed border-spark/50 text-spark-dark'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {tool === 'style' && (
        <form onSubmit={addStyleRef} className="animate-rise space-y-2 border-t border-paper-line bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Style references</p>
            <button type="button" onClick={() => setTool(null)} aria-label="Close" className="rounded p-1 text-ink-muted hover:bg-paper-deep">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {content.styleRefs.length > 0 && (
            <ul className="space-y-1">
              {content.styleRefs.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-xs">
                  <Link2 className="h-3 w-3 shrink-0 text-ink-muted" />
                  <a href={r.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-spark-dark hover:underline">
                    {r.url}
                  </a>
                  <button type="button" onClick={() => removeStyleRef(r.id)} aria-label="Remove reference" className="text-ink-muted hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input type="url" required value={styleUrl} onChange={(e) => setStyleUrl(e.target.value)} className="input" placeholder="https://dribbble.com/shots/…" aria-label="Reference URL" />
          <div className="flex gap-2">
            <input value={styleNote} onChange={(e) => setStyleNote(e.target.value)} className="input" placeholder="What do you like about it? e.g. clean, minimal, big type" aria-label="What you like about it" />
            <button type="submit" className="btn-primary shrink-0">
              Add
            </button>
          </div>
        </form>
      )}

      {tool === 'diagram' && (
        <form onSubmit={addDiagram} className="animate-rise space-y-2 border-t border-paper-line bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Request a section diagram</p>
            <button type="button" onClick={() => setTool(null)} aria-label="Close" className="rounded p-1 text-ink-muted hover:bg-paper-deep">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <select
              value={diagram.type}
              onChange={(e) => setDiagram((d) => ({ ...d, type: e.target.value }))}
              className="input w-32 shrink-0"
              aria-label="Diagram type"
            >
              <option value="flow">Flow</option>
              <option value="timeline">Timeline</option>
            </select>
            <input value={diagram.title} onChange={(e) => setDiagram((d) => ({ ...d, title: e.target.value }))} className="input" placeholder="Title (optional)" aria-label="Diagram title" />
          </div>
          <div className="flex gap-2">
            <input
              required
              value={diagram.steps}
              onChange={(e) => setDiagram((d) => ({ ...d, steps: e.target.value }))}
              className="input"
              placeholder="Research -> Synthesis -> Prototype -> Test"
              aria-label="Diagram steps"
            />
            <button type="submit" className="btn-primary shrink-0" disabled={parseDiagramSteps(diagram.steps).length < 2}>
              Draw
            </button>
          </div>
        </form>
      )}

      {/* Composer */}
      <div className="scrollbar-thin max-h-[70%] shrink-0 overflow-y-auto border-t border-paper-line bg-white p-3">
        {editingStep && (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-spark-light/60 px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1.5">
              <PenLine className="h-3.5 w-3.5 text-spark-dark" /> Editing <b>{editingStep.label}</b> — your message replaces it
            </span>
            <button type="button" onClick={cancelRefine} className="font-medium text-spark-dark hover:underline">
              Cancel
            </button>
          </div>
        )}

        <div className="mb-2 flex flex-wrap items-center gap-1">
          {[
            { id: 'refine', label: 'Refine', icon: PenLine },
            { id: 'style', label: 'Style ref', icon: Link2 },
            { id: 'diagram', label: 'Diagram', icon: GitBranch },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(tool === id ? null : id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                tool === id ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-deep'
              )}
              aria-pressed={tool === id}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => runAction('audit')}
            disabled={typing}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-paper-deep"
          >
            <ClipboardCheck className="h-3.5 w-3.5" /> Audit
          </button>
          <span className="flex-1" />
          {!editingStep && currentStep && (
            <>
              {flow.step > 0 && (
                <button type="button" onClick={back} disabled={typing} className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs text-ink-muted hover:bg-paper-deep">
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </button>
              )}
              <button type="button" onClick={skip} disabled={typing} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-ink-muted hover:bg-paper-deep">
                Skip <SkipForward className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {suggestion && (
          <div className="mb-2 animate-rise rounded-2xl border border-spark/40 bg-spark-light/40 p-3" role="region" aria-label="Suggested rewrite">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-spark-dark">
                <Wand2 className="h-3.5 w-3.5" />
                {REWRITE_MODES[suggestion.mode].label}
                <span className="font-normal text-ink-muted">
                  · {textStats(suggestion.original).words} → {textStats(suggestion.text).words} words · longest sentence{' '}
                  {textStats(suggestion.original).longest} → {textStats(suggestion.text).longest}
                </span>
              </p>
              {suggestion.source === 'rules' && (
                <span
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-ink-muted"
                  title={
                    suggestion.reason === 'no-key'
                      ? 'Add an ANTHROPIC_API_KEY to enable AI rewrites'
                      : 'The AI rewrite was unavailable, so this is a quick rule-based tidy'
                  }
                >
                  Quick tidy · no AI
                </span>
              )}
            </div>
            <div className="scrollbar-thin max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-sm leading-relaxed">
              {suggestion.text}
            </div>
            {suggestion.text.trim() === suggestion.original.trim() && (
              <p className="mt-2 text-xs text-ink-muted">No changes needed for this one — it already reads well.</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={acceptSuggestion} className="btn-spark px-3 py-1.5 text-xs">
                <Check className="h-3.5 w-3.5" /> Use this
              </button>
              <button
                type="button"
                onClick={() => rewrite(suggestion.mode, suggestion.original)}
                disabled={Boolean(rewriting)}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                {rewriting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Try again
              </button>
              <button type="button" onClick={discardSuggestion} className="btn-ghost px-3 py-1.5 text-xs">
                Keep mine
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="rounded-2xl border border-paper-line bg-paper focus-within:border-spark focus-within:ring-2 focus-within:ring-spark/20"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (undoText !== null) setUndoText(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={4}
            style={expanded ? { height: '50vh' } : undefined}
            placeholder={onboarding ? placeholder : 'Set your targets first…'}
            disabled={!onboarding}
            className="scrollbar-thin block min-h-[6.5rem] w-full resize-y rounded-t-2xl bg-transparent px-3 py-2.5 text-sm leading-relaxed focus:outline-none disabled:cursor-not-allowed"
            aria-label="Message the assistant"
          />

          {/* Writing helper bar */}
          <div className="flex items-center gap-1 border-t border-paper-line/70 px-1.5 py-1.5">
            <div className="scrollbar-thin flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            <span className="flex shrink-0 items-center gap-1 pl-1 pr-0.5 text-[11px] font-semibold text-ink-muted">
              <Wand2 className="h-3.5 w-3.5 text-spark" />
              <span className="hidden sm:inline">Polish</span>
            </span>
            {Object.entries(REWRITE_MODES).map(([mode, m]) => (
              <button
                key={mode}
                type="button"
                title={m.hint}
                onClick={() => rewrite(mode)}
                disabled={!input.trim() || Boolean(rewriting) || !onboarding}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-40',
                  rewriting === mode ? 'border-spark bg-spark-light text-spark-dark' : 'border-paper-line bg-white hover:border-spark hover:text-spark-dark'
                )}
              >
                {rewriting === mode && <Loader2 className="h-3 w-3 animate-spin" />}
                {m.label}
              </button>
            ))}
            </div>
            <button
              type="button"
              onClick={() => setExpanded((x) => !x)}
              className="shrink-0 rounded-lg p-1.5 text-ink-muted hover:bg-paper-deep hover:text-ink"
              aria-label={expanded ? 'Shrink text box' : 'Expand text box'}
              title={expanded ? 'Shrink' : 'Expand'}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || typing || !onboarding}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-spark text-white transition hover:bg-spark-dark disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-ink-muted">
          {stats.words > 0 ? (
            <>
              <span className="tabular-nums">{stats.words} words</span>
              <span className={cn('tabular-nums', stats.longCount > 0 && 'font-medium text-amber-700')}>
                {stats.longCount > 0
                  ? `${stats.longCount} long sentence${stats.longCount === 1 ? '' : 's'} (longest ${stats.longest} words)`
                  : `Longest sentence ${stats.longest} words`}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1">
              <Settings2 className="h-3 w-3" /> Enter to send · Shift+Enter for a new line · drag the corner to resize
            </span>
          )}
          {undoText !== null && (
            <button type="button" onClick={undoSuggestion} className="inline-flex items-center gap-1 font-medium text-spark-dark hover:underline">
              <Undo2 className="h-3 w-3" /> Undo rewrite
            </button>
          )}
          {rewriteError && <span className="text-red-600">{rewriteError}</span>}
        </div>
      </div>

      {modal && (
        <OnboardingModal
          initial={onboarding}
          isFirstRun={modal === 'first'}
          onSubmit={submitOnboarding}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
