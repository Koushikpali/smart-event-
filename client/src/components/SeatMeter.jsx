import { motion } from 'framer-motion';
import { seatsLeft } from '../lib/format';

/** Live seat indicator: bar + number that animates whenever the count changes. */
export default function SeatMeter({ event, compact = false }) {
  const left = seatsLeft(event);
  const total = event.total_seats || 1;
  const pct = Math.round((left / total) * 100);
  const soldOut = left === 0;
  const low = !soldOut && (left <= 10 || pct <= 15);
  const color = soldOut ? 'bg-danger' : low ? 'bg-sun' : 'bg-ok';
  const label = soldOut ? 'Sold out' : low ? `Only ${left} left` : `${left} seats left`;

  return (
    <div className={compact ? 'min-w-[7rem]' : ''}>
      <div className="flex items-center gap-1.5 text-sm font-bold">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          {!soldOut && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${color}`} />}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
        </span>
        <motion.span key={label} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} aria-live="polite">{label}</motion.span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={left} aria-label="Seats available">
        <motion.div className={`h-full rounded-full ${color}`} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </div>
    </div>
  );
}
