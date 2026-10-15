'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Clock,
  Copy,
  FileText,
  Loader2,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import { cloneProject, createProject, deleteProject, listProjects, loadGuestProject } from '@/lib/projectStore';
import { STATUS_LABELS } from '@/lib/caseStudy';
import { cn, timeAgo } from '@/lib/utils';

const STATUS_STYLES = {
  draft: 'bg-paper-deep text-ink-soft',
  'in-progress': 'bg-amber-50 text-amber-800',
  ready: 'bg-emerald-50 text-emerald-700',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [guestDraft, setGuestDraft] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setError('');
      setProjects(await listProjects());
    } catch (err) {
      setError(err.message || 'Could not load your projects.');
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    setGuestDraft(loadGuestProject());
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (isSupabaseConfigured) router.replace('/login?next=/dashboard');
      return;
    }
    refresh();
  }, [loading, user, router, refresh]);

  async function handleNew() {
    setCreating(true);
    try {
      const project = await createProject(user.id);
      router.push(`/builder/${project.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  async function handleClone(id) {
    setBusyId(id);
    try {
      await cloneProject(user.id, id);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setBusyId(id);
    try {
      await deleteProject(id);
      setProjects((list) => list.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-amber-600" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Accounts aren&apos;t connected yet</h1>
        <p className="mt-2 text-ink-soft">
          Add your Supabase keys to <code>.env.local</code> to enable the dashboard. Meanwhile, your guest draft is
          saved in this browser.
        </p>
        <Link href="/builder/guest" className="btn-spark mt-6">
          Open guest draft
        </Link>
      </main>
    );
  }

  if (loading || !user || projects === null) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-ink-muted">Your portfolio</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Case studies</h1>
        </div>
        <button type="button" onClick={handleNew} disabled={creating} className="btn-spark self-start px-5 py-2.5">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New project
        </button>
      </div>

      {error && (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      {guestDraft && guestDraft.completion > 0 && (
        <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-dashed border-spark/40 bg-spark-light/40 p-4 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2 text-sm">
            <UserRound className="h-4 w-4 text-spark-dark" />
            You have a guest draft, <b>{guestDraft.title}</b>, saved in this browser.
          </p>
          <Link href="/builder/guest" className="btn-ghost">
            Open and save to account
          </Link>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-paper-line bg-white p-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-paper-deep text-spark">
            <FileText className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold">No case studies yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Pick a project you&apos;re proud of. The assistant will interview you and build the page as you go.
          </p>
          <button type="button" onClick={handleNew} disabled={creating} className="btn-spark mt-6">
            <Plus className="h-4 w-4" /> Start your first
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li
              key={p.id}
              className={cn(
                'group relative flex flex-col rounded-3xl border border-paper-line bg-white p-5 transition hover:shadow-soft',
                busyId === p.id && 'pointer-events-none opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', STATUS_STYLES[p.status])}>
                  {STATUS_LABELS[p.status] || 'Draft'}
                </span>
                <div className="relative z-10 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleClone(p.id)}
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-paper-deep hover:text-ink"
                    title="Clone"
                    aria-label={`Clone ${p.title}`}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.title)}
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                    aria-label={`Delete ${p.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Link href={`/builder/${p.id}`} className="mt-4 block flex-1 focus:outline-none">
                <span className="absolute inset-0 rounded-3xl" aria-hidden />
                <h2 className="font-display text-xl font-semibold leading-snug">{p.title}</h2>
                <div className="mt-3 flex min-h-[26px] flex-wrap gap-1.5">
                  {(p.target_roles || []).length ? (
                    p.target_roles.slice(0, 3).map((r) => (
                      <span key={r} className="rounded-full border border-paper-line px-2 py-0.5 text-xs text-ink-soft">
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-ink-muted">No target roles yet</span>
                  )}
                  {(p.target_roles || []).length > 3 && (
                    <span className="text-xs text-ink-muted">+{p.target_roles.length - 3}</span>
                  )}
                </div>
              </Link>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>{p.completion}% complete</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {timeAgo(p.updated_at)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-deep">
                  <div className="h-full rounded-full bg-spark transition-all" style={{ width: `${p.completion}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
