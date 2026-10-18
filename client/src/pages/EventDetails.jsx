import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SeatMeter from '../components/SeatMeter';
import { EmptyState, ErrorState, PageShell, Spinner } from '../components/ui';
import { useLiveEvent } from '../hooks/useLiveEvent';
import { FALLBACK_IMG, fmtDate, fmtTime, isPast, money } from '../lib/format';

function Stepper({ value, onChange, max }) {
  return (
    <div className="inline-flex items-center rounded-full border-2 border-ink/15 bg-white">
      <button type="button" className="h-11 w-11 text-xl font-bold disabled:opacity-30" disabled={value <= 1} onClick={() => onChange(value - 1)} aria-label="Fewer tickets">−</button>
      <motion.span key={value} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="w-10 text-center font-display text-lg font-extrabold" aria-live="polite">{value}</motion.span>
      <button type="button" className="h-11 w-11 text-xl font-bold disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="More tickets">+</button>
    </div>
  );
}

function TicketPicker({ event }) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const past = isPast(event);
  const cats = event.categories || [];
  const [catId, setCatId] = useState(() => Number(sp.get('category')) || null);
  const [qty, setQty] = useState(1);

  const selected = cats.find((c) => c.id === catId) || cats.find((c) => c.available_seats - (c.held_seats || 0) > 0) || cats[0];
  const left = selected ? Math.max(0, selected.available_seats - (selected.held_seats || 0)) : 0;
  const max = Math.min(10, left);

  useEffect(() => { if (selected && catId !== selected.id) setCatId(selected.id); }, [selected, catId]);
  useEffect(() => { if (max > 0 && qty > max) setQty(max); }, [max, qty]);

  const total = selected ? Number(selected.price) * qty : 0;
  const disabled = past || !selected || left === 0;

  return (
    <aside className="rounded-3xl bg-white p-6 shadow-lg lg:sticky lg:top-24" aria-label="Choose tickets">
      <h2 className="font-display text-2xl font-extrabold">Choose tickets</h2>
      <div className="mt-2"><SeatMeter event={event} /></div>

      <fieldset className="mt-5 space-y-3">
        <legend className="sr-only">Ticket category</legend>
        {cats.map((c) => {
          const cl = Math.max(0, c.available_seats - (c.held_seats || 0));
          const active = selected?.id === c.id;
          return (
            <motion.label key={c.id} layout whileTap={{ scale: 0.98 }} className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 p-4 transition-colors ${active ? 'border-blue bg-blue/5' : 'border-ink/10'} ${cl === 0 ? 'opacity-50' : ''}`}>
              <span className="flex items-center gap-3">
                <input type="radio" name="category" className="h-4 w-4 accent-blue" checked={active} disabled={cl === 0} onChange={() => setCatId(c.id)} />
                <span>
                  <span className="block font-bold">{c.name}</span>
                  <span className="block text-xs text-ink/60">{cl === 0 ? 'Sold out' : `${cl} left`}</span>
                </span>
              </span>
              <span className="font-display text-lg font-extrabold">{money(c.price)}</span>
            </motion.label>
          );
        })}
      </fieldset>

      <div className="mt-6 flex items-center justify-between">
        <span className="font-bold">Quantity</span>
        <Stepper value={qty} onChange={setQty} max={Math.max(1, max)} />
      </div>

      <div className="mt-6 flex items-end justify-between border-t-2 border-dashed border-ink/15 pt-5">
        <span className="text-ink/70">Total</span>
        <motion.span key={total} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-4xl font-extrabold">{money(total)}</motion.span>
      </div>

      <button className="btn-sun mt-5 w-full" disabled={disabled} onClick={() => navigate(`/events/${event.id}/checkout?category=${selected.id}&qty=${qty}`)}>
        {past ? 'Event has ended' : left === 0 ? 'Sold out' : 'Continue to checkout'}
      </button>
    </aside>
  );
}

export default function EventDetails() {
  const { id } = useParams();
  const { event, loading, error, notFound, reload } = useLiveEvent(id);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);

  if (loading && !event) return <PageShell><div className="grid place-items-center py-32"><Spinner className="!h-8 !w-8 text-blue" /></div></PageShell>;
  if (notFound) return <PageShell><EmptyState title="Event not found" text="It may have been removed or the link is wrong." action={<Link className="btn-blue" to="/events">Back to events</Link>} /></PageShell>;
  if (error && !event) return <PageShell><ErrorState message={error} onRetry={reload} /></PageShell>;

  const mapQuery = encodeURIComponent(event.location);

  return (
    <>
      <div ref={heroRef} className="relative h-[24rem] overflow-hidden bg-ink sm:h-[30rem]">
        <motion.img style={{ y, scale: 1.15 }} src={event.img || FALLBACK_IMG} onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-10 text-white">
          <Link to="/events" className="mb-4 w-fit text-sm font-bold text-white/80 hover:text-white">Back to events</Link>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl font-display text-4xl font-extrabold leading-tight sm:text-6xl">{event.title}</motion.h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
            <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">{fmtDate(event.date)}, {fmtTime(event.date)}</span>
            <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">{event.location}</span>
            <span className="rounded-full bg-sun px-4 py-2 text-ink">From {money(event.price)}</span>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-6xl gap-10 px-5 py-14 pb-24 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="font-display text-3xl font-extrabold">About this event</h2>
          <p className="mt-4 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-ink/80">{event.description}</p>

          <h2 className="mt-12 font-display text-3xl font-extrabold">Where</h2>
          <p className="mt-2 text-ink/70">{event.location}</p>
          <div className="mt-4 overflow-hidden rounded-3xl bg-white">
            <iframe title={`Map of ${event.location}`} loading="lazy" className="h-72 w-full border-0" src={`https://www.google.com/maps?q=${mapQuery}&output=embed`} referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <a className="btn-ghost mt-4" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer">Open in Google Maps</a>
        </div>
        <TicketPicker event={event} />
      </main>
    </>
  );
}
