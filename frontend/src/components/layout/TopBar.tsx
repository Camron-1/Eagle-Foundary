import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Search, User, Menu, Shield } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { api, unwrapApiData } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { toast } from '@/components/ui/toast';

interface TopBarProps {
  onToggleSidebar?: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get(endpoints.notifications.unreadCount);
      const payload = unwrapApiData<{ count: number }>(res.data);
      return payload.count;
    },
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Logout failed. Please try again.');
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/search');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const handleProfileKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setProfileOpen(false);
    }
  }, []);

  const initials = user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <header className="relative z-[70] flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-black/60 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden">
          <Menu size={18} />
        </button>
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/assets/brand/logo-dark-512.png" alt="Eagle-Foundry" className="h-7 w-7 rounded-full" />
          <span className="hidden text-sm font-semibold tracking-wide text-zinc-100 sm:inline">Eagle-Foundry</span>
        </Link>
      </div>

      <button
        onClick={() => navigate('/search')}
        className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200 md:flex"
      >
        <Search size={14} />
        <span>Search...</span>
        <kbd className="ml-4 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">⌘K</kbd>
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/notifications')}
          className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Bell size={18} />
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
              {unreadCount! > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <div className="relative" ref={profileRef} onKeyDown={handleProfileKeyDown}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            aria-expanded={profileOpen}
            aria-controls="profile-menu"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white transition-colors hover:bg-white/20"
          >
            {initials}
          </button>
          {profileOpen && (
            <div
              id="profile-menu"
              role="menu"
              className="absolute right-0 top-full z-[80] mt-1 w-48 rounded-xl border border-white/10 bg-zinc-950/95 p-1.5 shadow-xl backdrop-blur-lg"
            >
              <Link
                role="menuitem"
                to={user?.role === 'STUDENT' ? '/student/profile' : user?.role === 'UNIVERSITY_ADMIN' ? '/admin' : '/company/org'}
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <User size={14} />
                Profile
              </Link>
              <Link
                role="menuitem"
                to="/settings/security"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Shield size={14} />
                Security
              </Link>
              <button
                role="menuitem"
                onClick={() => { setProfileOpen(false); handleLogout(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
