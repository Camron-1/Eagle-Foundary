import { create } from 'zustand';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (type: ToastType, message: string) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (type, message) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().add('success', msg),
  error: (msg: string) => useToastStore.getState().add('error', msg),
  info: (msg: string) => useToastStore.getState().add('info', msg),
};

const iconMap = { success: CheckCircle2, error: AlertTriangle, info: Info };
const colorMap = { success: 'border-emerald-500/30 text-emerald-400', error: 'border-red-500/30 text-red-400', info: 'border-blue-500/30 text-blue-400' };

function ToastItem({ item }: { item: ToastItem }): JSX.Element {
  const remove = useToastStore((s) => s.remove);
  const Icon = iconMap[item.type];

  return (
    <motion.div
      layout
      role={item.type === 'info' ? 'status' : 'alert'}
      aria-live={item.type === 'info' ? 'polite' : 'assertive'}
      className={cn(
        'flex items-start gap-3 rounded-xl border bg-zinc-950/95 px-4 py-3 shadow-lg backdrop-blur-lg',
        colorMap[item.type],
      )}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm text-zinc-200">{item.message}</p>
      <button
        onClick={() => remove(item.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-0.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastContainer(): JSX.Element {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-auto fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
