'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, LogIn, LogOut, Sparkles, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function signOut() {
    setMenuOpen(false);
    if (supabase) await supabase.auth.signOut();
    router.push('/');
  }

  const name = user?.user_metadata?.full_name || user?.email || '';
  const avatar = user?.user_metadata?.avatar_url;
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-paper-line bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="FolioSpark home">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-spark">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">FolioSpark</span>
        </Link>

        <div className="flex items-center gap-2">
          {user && (
            <Link
              href="/dashboard"
              className={cn(
                'hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-paper-deep sm:inline-flex',
                pathname === '/dashboard' && 'bg-paper-deep text-ink'
              )}
            >
              <LayoutGrid className="h-4 w-4" /> Dashboard
            </Link>
          )}

          {loading ? (
            <span className="h-8 w-20 animate-pulse rounded-full bg-paper-deep" aria-hidden />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-paper-line bg-white py-1 pl-1 pr-3 text-sm hover:bg-paper-deep"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" className="h-6 w-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-spark-light text-xs font-semibold text-spark-dark">
                    {initial}
                  </span>
                )}
                <span className="hidden max-w-[140px] truncate sm:inline">{name}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" title="Signed in" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 animate-rise overflow-hidden rounded-2xl border border-paper-line bg-white p-1 shadow-soft"
                >
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-ink-muted">
                    <User className="h-3.5 w-3.5" /> <span className="truncate">{user.email}</span>
                  </div>
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-paper-deep"
                  >
                    <LayoutGrid className="h-4 w-4" /> My projects
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-paper-deep"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <span className="hidden items-center gap-1.5 text-xs text-ink-muted md:inline-flex">
                <span className="h-2 w-2 rounded-full bg-ink-muted/40" /> Guest mode
              </span>
              <Link href="/login" className="btn-primary">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
