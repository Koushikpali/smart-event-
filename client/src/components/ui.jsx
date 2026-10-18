import { motion } from 'framer-motion';

export function Spinner({ className = '' }) {
  return <span className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} role="status" aria-label="Loading" />;
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm" aria-hidden="true">
      <div className="h-44 animate-pulse bg-ink/10" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 animate-pulse rounded bg-ink/10" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-ink/10" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-ink/10" />
      </div>
      <div className="h-16 animate-pulse bg-ink/5" />
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="mx-auto max-w-md rounded-3xl border-2 border-dashed border-ink/20 px-6 py-14 text-center">
      <p className="font-display text-2xl font-bold">{title}</p>
      {text && <p className="mt-2 text-ink/70">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-3xl border-2 border-danger/30 bg-danger/5 px-6 py-12 text-center">
      <p className="font-display text-2xl font-bold text-danger">Could not load this</p>
      <p className="mt-2 text-ink/70">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-blue mt-6">Try again</button>}
    </div>
  );
}

export function Field({ label, error, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink/60">{hint}</span>}
      {error && <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 block text-sm font-medium text-danger">{error}</motion.span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        role="dialog" aria-modal="true" aria-label={title}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-6 shadow-2xl sm:rounded-3xl ${wide ? 'max-w-3xl' : 'max-w-md'}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-xl leading-none hover:bg-ink/10">×</button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function PageShell({ children, className = '' }) {
  return <main className={`mx-auto min-h-screen max-w-6xl px-5 pb-24 pt-28 ${className}`}>{children}</main>;
}
