import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible name when title is absent. Defaults to "Dialog". */
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, ariaLabel, children, className }: ModalProps): JSX.Element | null {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-overlay-heavy backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? (ariaLabel ?? 'Dialog') : undefined}
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl border border-border-subtle bg-panel p-6 shadow-2xl backdrop-blur-lg',
          className,
        )}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 id={titleId} className="text-lg font-semibold text-fg">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-fg-muted transition-colors hover:bg-surface-tint hover:text-fg">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
