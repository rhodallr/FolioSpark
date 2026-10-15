'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, CloudOff, Eye, Loader2, MessageSquare, Save } from 'lucide-react';
import ChatAssistant from '@/components/ChatAssistant';
import LivePreview from '@/components/LivePreview';
import { useAuth } from '@/lib/useAuth';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { analyzeAlignment } from '@/lib/analysis';
import { computeCompletion, statusFromCompletion } from '@/lib/caseStudy';
import { GUEST_ID, clearGuestProject, createProject, loadProject, saveProject } from '@/lib/projectStore';
import { cn } from '@/lib/utils';

function deriveRoles(onboarding) {
  if (!onboarding?.roles) return [];
  return onboarding.roles
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export default function BuilderPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isGuest = id === GUEST_ID;

  const [project, setProject] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const [mobileTab, setMobileTab] = useState('chat');
  const [promoting, setPromoting] = useState(false);
  const hydrated = useRef(false);

  // Load
  useEffect(() => {
    if (authLoading) return;
    if (!isGuest && !user) {
      router.replace(`/login?next=/builder/${id}`);
      return;
    }
    let active = true;
    loadProject(id)
      .then((p) => {
        if (!active) return;
        setProject(p);
        hydrated.current = false;
      })
      .catch((err) => active && setLoadError(err.message || 'Could not open this project.'));
    return () => {
      active = false;
    };
  }, [id, isGuest, user, authLoading, router]);

  // Autosave (debounced)
  useEffect(() => {
    if (!project) return undefined;
    if (!hydrated.current) {
      hydrated.current = true;
      return undefined;
    }
    setSaveState('saving');
    const timer = setTimeout(() => {
      saveProject(id, project)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 800);
    return () => clearTimeout(timer);
  }, [project, id]);

  // Single entry point for all changes; keeps derived fields in sync.
  const update = useCallback((updater) => {
    setProject((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const completion = computeCompletion(next.content);
      const roles = deriveRoles(next.onboarding);
      return {
        ...next,
        title: next.content.title || next.title || 'Untitled case study',
        completion,
        status: statusFromCompletion(completion),
        target_roles: roles.length ? roles : next.target_roles,
      };
    });
  }, []);

  const alignment = useMemo(
    () => (project ? analyzeAlignment(project.onboarding, project.content) : []),
    [project]
  );

  async function saveGuestToAccount() {
    if (!user || !project) return;
    setPromoting(true);
    try {
      const created = await createProject(user.id, project);
      clearGuestProject();
      router.push(`/builder/${created.id}`);
    } catch (err) {
      setLoadError(err.message);
      setPromoting(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <h1 className="mt-4 font-display text-2xl font-semibold">We couldn&apos;t open that</h1>
        <p className="mt-2 text-sm text-ink-muted">{loadError}</p>
        <Link href={user ? '/dashboard' : '/'} className="btn-ghost mt-6">
          <ArrowLeft className="h-4 w-4" /> Go back
        </Link>
      </main>
    );
  }

  if (!project) {
    return (
      <div className="grid h-[calc(100vh-56px)] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      {/* Workspace bar */}
      <div className="flex items-center gap-3 border-b border-paper-line bg-white px-4 py-2">
        <Link
          href={user ? '/dashboard' : '/'}
          className="rounded-lg p-1.5 text-ink-muted hover:bg-paper-deep hover:text-ink"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <input
          value={project.content.title}
          onChange={(e) => update((p) => ({ ...p, content: { ...p.content, title: e.target.value } }))}
          placeholder="Untitled case study"
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 font-display text-lg font-semibold focus:bg-paper focus:outline-none"
          aria-label="Case study title"
        />
        <div className="hidden items-center gap-2 sm:flex">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-paper-deep" title={`${project.completion}% complete`}>
            <div className="h-full bg-spark transition-all" style={{ width: `${project.completion}%` }} />
          </div>
          <span className="w-9 text-xs tabular-nums text-ink-muted">{project.completion}%</span>
        </div>
        <span
          className={cn(
            'flex items-center gap-1 text-xs',
            saveState === 'error' ? 'text-red-600' : 'text-ink-muted'
          )}
          aria-live="polite"
        >
          {saveState === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saveState === 'saved' && <Check className="h-3.5 w-3.5" />}
          {saveState === 'error' && <CloudOff className="h-3.5 w-3.5" />}
          <span className="hidden md:inline">
            {saveState === 'saving'
              ? 'Saving…'
              : saveState === 'error'
                ? 'Not saved'
                : isGuest
                  ? 'Saved in this browser'
                  : 'Saved'}
          </span>
        </span>
        {isGuest && user && (
          <button type="button" onClick={saveGuestToAccount} disabled={promoting} className="btn-spark py-1.5">
            {promoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">Save to account</span>
          </button>
        )}
        {isGuest && !user && isSupabaseConfigured && (
          <Link href="/login?next=/builder/guest" className="btn-ghost py-1.5">
            <Save className="h-4 w-4" /> <span className="hidden sm:inline">Sign in to keep it</span>
          </Link>
        )}
      </div>

      {/* Mobile tabs */}
      <div className="flex border-b border-paper-line bg-white lg:hidden" role="tablist">
        {[
          { id: 'chat', label: 'Assistant', icon: MessageSquare },
          { id: 'preview', label: 'Preview', icon: Eye },
        ].map(({ id: tab, label, icon: Icon }) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 border-b-2 py-2.5 text-sm font-medium',
              mobileTab === tab ? 'border-spark text-ink' : 'border-transparent text-ink-muted'
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Dual pane */}
      <div className="flex min-h-0 flex-1">
        <section
          className={cn(
            'min-h-0 w-full border-r border-paper-line bg-paper lg:block lg:w-2/5',
            mobileTab === 'chat' ? 'block' : 'hidden'
          )}
          aria-label="Portfolio assistant"
        >
          <ChatAssistant project={project} update={update} alignment={alignment} />
        </section>
        <section
          className={cn('min-h-0 w-full lg:block lg:w-3/5', mobileTab === 'preview' ? 'block' : 'hidden')}
          aria-label="Live preview"
        >
          <LivePreview project={project} update={update} />
        </section>
      </div>
    </div>
  );
}
