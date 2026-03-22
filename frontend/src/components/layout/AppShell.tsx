import { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';

export default function AppShell(): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 landing-grid opacity-[0.06]" />
      <div className="pointer-events-none absolute left-[-18rem] top-[-20rem] h-[36rem] w-[36rem] rounded-full bg-white/10 blur-[180px]" />

      <div className="relative z-10 flex h-full flex-col">
        <TopBar onToggleSidebar={toggleSidebar} />

        <div className="flex flex-1 overflow-hidden">
          <div className="hidden lg:block">
            <Sidebar collapsed={!sidebarOpen} />
          </div>

          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                key="sidebar-overlay"
                className="fixed inset-0 z-40 lg:hidden"
                onClick={toggleSidebar}
                role="button"
                aria-label="Close sidebar"
                tabIndex={0}
                initial={reducedMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
              >
                <motion.div
                  className="absolute inset-0 bg-black/60"
                  initial={reducedMotion ? undefined : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0 }}
                  transition={reducedMotion ? { duration: 0 } : undefined}
                />
                <motion.div
                  className="relative h-full"
                  onClick={(e) => e.stopPropagation()}
                  initial={reducedMotion ? undefined : { x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={reducedMotion ? undefined : { x: '-100%' }}
                  transition={reducedMotion ? { duration: 0 } : { type: 'tween', duration: 0.25, ease: 'easeOut' }}
                >
                  <Sidebar />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="mx-auto w-full max-w-[1200px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
