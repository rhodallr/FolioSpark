import Link from 'next/link';
import {
  ArrowRight,
  Download,
  FileText,
  Layers,
  MessageSquareText,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Target,
    title: 'Job description alignment',
    body: 'Add up to five target roles. FolioSpark flags the skills they ask for that your story does not prove yet — live, as you write.',
  },
  {
    icon: MessageSquareText,
    title: 'Step-by-step narrative',
    body: 'Starts with easy facts, then digs into trade-offs, metrics and business impact — the parts hiring leads actually read.',
  },
  {
    icon: Layers,
    title: 'Live visual structure',
    body: 'Watch the case study build beside the chat, with flip cards, carousels, before/after toggles and process diagrams.',
  },
  {
    icon: Wand2,
    title: 'Strategic critique',
    body: 'Feedback on text density, readability, tone of voice and storytelling clarity — from a mentor who has hired designers.',
  },
  {
    icon: Download,
    title: 'Export anywhere',
    body: 'Download a standalone HTML page, clean Markdown, or structured JSON ready for any static site.',
  },
  {
    icon: FileText,
    title: 'Drafts that keep',
    body: 'Try it as a guest. Sign in to keep multiple drafts, clone them for different roles, and pick up where you left off.',
  },
];

const PHASES = ['Context', 'Problem & value', 'Process & decisions', 'Business impact'];

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <section className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-24">
        <div className="animate-rise">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-paper-line bg-white px-3 py-1 text-xs font-medium text-ink-soft">
            <Sparkles className="h-3.5 w-3.5 text-spark" /> Your design mentor and hiring lead, in one chat
          </p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Beat the blank canvas.
            <br />
            <span className="text-spark">Tell the story</span> they hire for.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            FolioSpark interviews you about a project, one question at a time, and builds the case study as you
            answer — checked against the jobs you actually want.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/builder/guest" className="btn-spark px-6 py-3 text-base">
              Start a case study <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-ghost px-6 py-3 text-base">
              Sign in to save drafts
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-muted">No account needed for your first draft.</p>
        </div>

        {/* Product preview */}
        <div className="relative animate-rise [animation-delay:120ms]">
          <div className="absolute -right-24 -top-16 h-72 w-72 rounded-full bg-spark-light blur-3xl" aria-hidden />
          <div className="relative overflow-hidden rounded-3xl border border-paper-line bg-white shadow-soft">
            <div className="flex items-center gap-1.5 border-b border-paper-line bg-paper px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-paper-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-paper-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-paper-line" />
            </div>
            <div className="grid grid-cols-[2fr_3fr]">
              <div className="space-y-3 border-r border-paper-line bg-paper p-4">
                <div className="flex flex-wrap gap-1">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    ✓ User research
                  </span>
                  <span className="rounded-full border border-dashed border-spark/50 px-2 py-0.5 text-[10px] font-medium text-spark-dark">
                    Design systems
                  </span>
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-white p-3 text-xs leading-relaxed shadow-sm">
                  Walk me through <b>2–4 key decisions</b> and what you traded off.
                </div>
                <div className="ml-6 rounded-2xl rounded-tr-sm bg-ink p-3 text-xs leading-relaxed text-paper">
                  Guest checkout first — we gave up early sign-ups
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-white p-3 text-xs leading-relaxed shadow-sm">
                  Good call. Hiring leads look for what you gave up — that is the judgement.
                </div>
              </div>
              <div className="space-y-3 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-spark">Case study</p>
                <p className="font-display text-xl font-semibold leading-tight">Checkout for first-time buyers</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-paper-deep p-3">
                    <p className="font-display text-lg font-semibold text-spark">+18%</p>
                    <p className="text-[10px] text-ink-muted">Conversion</p>
                  </div>
                  <div className="rounded-xl bg-paper-deep p-3">
                    <p className="font-display text-lg font-semibold text-spark">52s</p>
                    <p className="text-[10px] text-ink-muted">Time to pay</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  {['Research', 'Prototype', 'Test'].map((s, i) => (
                    <span key={s} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-spark">→</span>}
                      <span className="rounded-md border border-paper-line px-2 py-1">{s}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-paper-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <ol className="grid gap-4 sm:grid-cols-4">
            {PHASES.map((p, i) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper-deep font-display text-sm font-semibold text-spark">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{p}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything a senior reviewer would tell you — before you hit publish.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-paper-line bg-white p-6 transition hover:shadow-soft">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-spark-light text-spark-dark">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink p-10 text-paper sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold">Ten minutes to a first draft.</h2>
            <p className="mt-2 text-paper/70">Pick a project you are proud of. We will take it from there.</p>
          </div>
          <Link href="/builder/guest" className="btn-spark px-6 py-3 text-base">
            Start now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
