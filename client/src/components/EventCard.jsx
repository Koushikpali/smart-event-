import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FALLBACK_IMG, fmtDate, fmtTime, isPast, money } from '../lib/format';
import SeatMeter from './SeatMeter';

export default function EventCard({ event, index = 0 }) {
  const past = isPast(event);
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index, 5) * 0.07 }}
      whileHover={{ y: -6 }}
      className="drop-shadow-[0_10px_24px_rgba(20,18,43,0.12)]"
    >
      <Link to={`/events/${event.id}`} className="stub group flex h-full flex-col bg-white" aria-label={`${event.title}, ${money(event.price)}`}>
        <div className="relative h-44 overflow-hidden">
          <img src={event.img || FALLBACK_IMG} onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold">{fmtDate(event.date)}</span>
        </div>
        <div className="flex-1 space-y-1.5 p-5 pb-4">
          <h3 className="font-display text-xl font-bold leading-snug">{event.title}</h3>
          <p className="text-sm text-ink/70">{event.location}</p>
          <p className="text-sm text-ink/70">{fmtTime(event.date)}</p>
        </div>
        <div className="perf flex h-16 items-center justify-between gap-4 px-5">
          <div>
            <p className="text-xs text-ink/60">From</p>
            <p className="font-display text-lg font-extrabold leading-none">{money(event.price)}</p>
          </div>
          {past ? <span className="text-sm font-bold text-ink/60">Event ended</span> : <SeatMeter event={event} compact />}
        </div>
      </Link>
    </motion.div>
  );
}
