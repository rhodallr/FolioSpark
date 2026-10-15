'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  FileJson,
  FileText,
  Monitor,
  Palette,
  RotateCw,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { PROCESS_LAYOUTS, THEMES } from '@/lib/caseStudy';
import { toHTML, toJSON, toMarkdown } from '@/lib/exporters';
import { cn, downloadFile, isImageUrl, slugify } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Placeholder({ children, className }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-center text-sm text-[var(--muted)]',
        className
      )}
    >
      {children}
    </div>
  );
}

function Section({ title, children, className }) {
  return (
    <section className={cn('mt-14 animate-rise', className)}>
      {title && <h2 className="mb-4 font-display text-2xl font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

function Paragraphs({ text }) {
  return String(text || '')
    .split(/\n+/)
    .filter((p) => p.trim())
    .map((p, i) => (
      <p key={i} className="mb-3 leading-relaxed last:mb-0">
        {p}
      </p>
    ));
}

function FlipCard({ index, decision }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="perspective block min-h-[190px] w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-2xl"
      aria-pressed={flipped}
      aria-label={`${decision.title}. ${flipped ? 'Showing trade-off' : 'Show trade-off'}`}
    >
      <span
        className={cn('preserve-3d relative block h-full min-h-[190px] transition-transform duration-500', flipped && 'rotate-y-180')}
      >
        <span className="backface-hidden absolute inset-0 flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5">
          <span className="font-display text-sm font-semibold text-[var(--accent)]">{String(index + 1).padStart(2, '0')}</span>
          <span className="mt-2 font-display text-lg font-semibold leading-snug">{decision.title}</span>
          <span className="mt-auto flex items-center gap-1 pt-3 text-xs text-[var(--muted)]">
            <RotateCw className="h-3 w-3" /> Tap for the trade-off
          </span>
        </span>
        <span className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col gap-2 rounded-2xl bg-[var(--accent)] p-5 text-[var(--bg)]">
          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Trade-off</span>
          <span className="leading-relaxed">{decision.tradeoff || 'No trade-off recorded yet.'}</span>
        </span>
      </span>
    </button>
  );
}

function Carousel({ decisions }) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef(null);
  const count = decisions.length;

  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);

  function go(i) {
    const next = Math.max(0, Math.min(count - 1, i));
    setIndex(next);
    const track = trackRef.current;
    const slide = track?.children[next];
    if (track && slide) track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  }

  return (
    <div>
      <div ref={trackRef} className="flex snap-x snap-mandatory gap-4 overflow-x-hidden">
        {decisions.map((d, i) => (
          <div key={i} className="min-h-[180px] w-full shrink-0 snap-start rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6">
            <span className="font-display text-sm font-semibold text-[var(--accent)]">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="mt-2 font-display text-xl font-semibold">{d.title}</h3>
            {d.tradeoff && (
              <p className="mt-3 text-[var(--muted)]">
                <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--fg)]">Trade-off</span>
                {d.tradeoff}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-sm text-[var(--muted)]">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] text-[var(--fg)] disabled:opacity-30"
          aria-label="Previous decision"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="tabular-nums">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index >= count - 1}
          className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] text-[var(--fg)] disabled:opacity-30"
          aria-label="Next decision"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Timeline({ decisions }) {
  return (
    <ol className="ml-2 border-l-2 border-[var(--line)] pl-6">
      {decisions.map((d, i) => (
        <li key={i} className="relative pb-6 last:pb-0">
          <span className="absolute -left-[32px] top-1.5 h-3 w-3 rounded-full bg-[var(--accent)] ring-4 ring-[var(--bg)]" />
          <h3 className="font-display text-lg font-semibold">{d.title}</h3>
          {d.tradeoff && (
            <p className="mt-1 text-[var(--muted)]">
              <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--fg)]">Trade-off</span>
              {d.tradeoff}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

function BeforeAfter({ before, after }) {
  const [view, setView] = useState('after');
  const value = view === 'before' ? before : after;
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)]">
      <div className="flex gap-1 border-b border-[var(--line)] bg-[var(--card)] p-1.5" role="tablist">
        {['before', 'after'].map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              'flex-1 rounded-xl py-2 text-sm font-medium capitalize transition',
              view === v ? 'bg-[var(--bg)] text-[var(--fg)] shadow-sm' : 'text-[var(--muted)]'
            )}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="p-5">
        {!value ? (
          <p className="text-sm text-[var(--muted)]">Not provided yet.</p>
        ) : isImageUrl(value) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.trim()} alt={`${view} state`} className="w-full rounded-xl" />
        ) : (
          <Paragraphs text={value} />
        )}
      </div>
    </div>
  );
}

function DiagramBlock({ diagram, onRemove }) {
  return (
    <figure className="group relative mb-4 rounded-2xl border border-dashed border-[var(--line)] p-5">
      <figcaption className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
        {diagram.title || (diagram.type === 'timeline' ? 'Timeline' : 'Process')}
      </figcaption>
      {diagram.type === 'timeline' ? (
        <div className="relative flex justify-between gap-2">
          <span className="absolute left-2 right-2 top-[7px] h-0.5 bg-[var(--line)]" aria-hidden />
          {diagram.steps.map((s, i) => (
            <div key={i} className="relative flex flex-1 flex-col items-center gap-2 text-center text-xs">
              <span className="h-3.5 w-3.5 rounded-full bg-[var(--accent)] ring-4 ring-[var(--bg)]" />
              {s}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {diagram.steps.map((s, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-4 w-4 text-[var(--accent)]" />}
              <span className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-medium">{s}</span>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-3 top-3 rounded-lg p-1 text-[var(--muted)] opacity-0 transition hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
        aria-label="Remove diagram"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LivePreview({ project, update }) {
  const c = project.content;
  const theme = THEMES[c.theme] || THEMES.warm;
  const [device, setDevice] = useState('desktop');
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const compact = device === 'mobile';

  useEffect(() => {
    function onClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function setContent(patch) {
    update((p) => ({ ...p, content: { ...p.content, ...patch } }));
  }

  function exportAs(type) {
    const name = slugify(c.title);
    if (type === 'html') downloadFile(`${name}.html`, toHTML(c), 'text/html;charset=utf-8');
    if (type === 'md') downloadFile(`${name}.md`, toMarkdown(c), 'text/markdown;charset=utf-8');
    if (type === 'json') downloadFile(`${name}.json`, toJSON(project), 'application/json;charset=utf-8');
    setExportOpen(false);
  }

  const meta = [
    ['Role', c.role],
    ['Team', c.team],
    ['Timeline & tools', c.timeline],
  ];

  return (
    <div className="flex h-full flex-col bg-paper-deep">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-paper-line bg-white px-4 py-2">
        <div className="flex rounded-full border border-paper-line p-0.5" role="group" aria-label="Decisions layout">
          {PROCESS_LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setContent({ processLayout: l.id })}
              aria-pressed={c.processLayout === l.id}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium',
                c.processLayout === l.id ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-deep'
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 rounded-full border border-paper-line px-2.5 py-1 text-xs">
          <Palette className="h-3.5 w-3.5 text-ink-muted" />
          <span className="sr-only">Theme</span>
          <select
            value={c.theme}
            onChange={(e) => setContent({ theme: e.target.value })}
            className="bg-transparent font-medium focus:outline-none"
          >
            {Object.entries(THEMES).map(([id, t]) => (
              <option key={id} value={id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex rounded-full border border-paper-line p-0.5" role="group" aria-label="Preview width">
          {[
            { id: 'desktop', icon: Monitor, label: 'Desktop' },
            { id: 'mobile', icon: Smartphone, label: 'Mobile' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDevice(id)}
              aria-pressed={device === id}
              aria-label={label}
              title={label}
              className={cn('rounded-full p-1.5', device === id ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-deep')}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        <span className="flex-1" />

        <div className="relative" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen((o) => !o)}
            className="btn-primary py-1.5"
            aria-haspopup="menu"
            aria-expanded={exportOpen}
          >
            <Download className="h-4 w-4" /> Export
          </button>
          {exportOpen && (
            <div role="menu" className="absolute right-0 z-20 mt-2 w-64 animate-rise rounded-2xl border border-paper-line bg-white p-1 shadow-soft">
              {[
                { type: 'html', icon: Code2, label: 'HTML/CSS page', hint: 'Single file, ready to host' },
                { type: 'md', icon: FileText, label: 'Markdown', hint: 'For Notion, GitHub, static sites' },
                { type: 'json', icon: FileJson, label: 'JSON', hint: 'Structured data for your own templates' },
              ].map(({ type, icon: Icon, label, hint }) => (
                <button
                  key={type}
                  type="button"
                  role="menuitem"
                  onClick={() => exportAs(type)}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-paper-deep"
                >
                  <Icon className="mt-0.5 h-4 w-4 text-spark" />
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-ink-muted">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document */}
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4 lg:p-8">
        <article
          style={theme.vars}
          className={cn(
            'mx-auto rounded-3xl bg-[var(--bg)] text-[var(--fg)] shadow-soft transition-all duration-300',
            compact ? 'max-w-[390px] px-5 py-10' : 'max-w-3xl px-8 py-14 sm:px-14'
          )}
        >
          {/* Hero */}
          <header>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Case study</p>
            {c.title ? (
              <h1 className={cn('font-display font-semibold leading-[1.1] tracking-tight', compact ? 'text-3xl' : 'text-5xl')}>
                {c.title}
              </h1>
            ) : (
              <Placeholder className="text-left">Your title appears here.</Placeholder>
            )}
            {c.summary && <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">{c.summary}</p>}
            {meta.some(([, v]) => v) && (
              <dl className={cn('mt-8 grid gap-4 border-t border-[var(--line)] pt-6', compact ? 'grid-cols-1' : 'grid-cols-3')}>
                {meta
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{k}</dt>
                      <dd className="mt-1 font-medium">{v}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </header>

          {/* Context */}
          <Section title="Context">
            {c.context ? <Paragraphs text={c.context} /> : <Placeholder>Set the scene in the Context phase.</Placeholder>}
          </Section>

          {/* Problem & value */}
          <Section>
            <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-2')}>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6">
                <h2 className="mb-3 font-display text-xl font-semibold">The problem</h2>
                {c.problem ? <Paragraphs text={c.problem} /> : <p className="text-sm text-[var(--muted)]">Coming up…</p>}
              </div>
              <div className="rounded-2xl bg-[var(--accent-soft)] p-6">
                <h2 className="mb-3 font-display text-xl font-semibold">Why it mattered</h2>
                {c.value ? <Paragraphs text={c.value} /> : <p className="text-sm text-[var(--muted)]">Coming up…</p>}
              </div>
            </div>
          </Section>

          {/* Decisions */}
          <Section title="Key decisions">
            {c.decisions.length === 0 ? (
              <Placeholder>Your decisions and trade-offs will appear as {PROCESS_LAYOUTS.find((l) => l.id === c.processLayout)?.label.toLowerCase()}.</Placeholder>
            ) : c.processLayout === 'carousel' ? (
              <Carousel decisions={c.decisions} />
            ) : c.processLayout === 'timeline' ? (
              <Timeline decisions={c.decisions} />
            ) : (
              <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-2')}>
                {c.decisions.map((d, i) => (
                  <FlipCard key={`${i}-${d.title}`} index={i} decision={d} />
                ))}
              </div>
            )}
          </Section>

          {/* Diagrams */}
          {c.diagrams.length > 0 && (
            <Section>
              {c.diagrams.map((d) => (
                <DiagramBlock
                  key={d.id}
                  diagram={d}
                  onRemove={() => setContent({ diagrams: c.diagrams.filter((x) => x.id !== d.id) })}
                />
              ))}
            </Section>
          )}

          {/* Before / after */}
          <Section title="Before & after">
            {c.before || c.after ? (
              <BeforeAfter before={c.before} after={c.after} />
            ) : (
              <Placeholder>Describe the before and after states — or paste image URLs — to get a toggle here.</Placeholder>
            )}
          </Section>

          {/* Impact */}
          <Section title="Impact">
            {c.metrics.length === 0 && c.outcomes.length === 0 ? (
              <Placeholder>Metrics become tiles. Write them as “Metric: value”.</Placeholder>
            ) : (
              <>
                {c.metrics.length > 0 && (
                  <div className={cn('grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-3')}>
                    {c.metrics.map((m, i) => (
                      <div key={i} className="flex flex-col gap-1 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                        <span className="font-display text-2xl font-semibold leading-tight text-[var(--accent)]">{m.value}</span>
                        <span className="text-sm text-[var(--muted)]">{m.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {c.outcomes.length > 0 && (
                  <ul className="mt-5 list-disc space-y-1.5 pl-5">
                    {c.outcomes.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Section>

          {/* Reflection */}
          <Section title="Reflection">
            {c.reflection ? (
              <blockquote className="border-l-[3px] border-[var(--accent)] pl-5 font-display text-lg leading-relaxed">
                <Paragraphs text={c.reflection} />
              </blockquote>
            ) : (
              <Placeholder>What you learned closes the story.</Placeholder>
            )}
          </Section>

          <footer className="mt-16 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">Made with FolioSpark</footer>
        </article>
      </div>
    </div>
  );
}
