import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, Field, PageShell, Spinner } from '../components/ui';
import { useLiveEvent } from '../hooks/useLiveEvent';
import { useSeatHold } from '../hooks/useSeatHold';
import { bookingsApi, errFields, errMsg } from '../lib/api';
import { fmtDateTime, isPast, money } from '../lib/format';
import { getSocketId } from '../socket';

const RULES = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Enter your full name (at least 2 characters)'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address'),
  mobile: (v) => (/^\+?[0-9]{10,15}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a valid mobile number (10-15 digits)'),
};

function FailurePanel({ message, onRetry, backTo }) {
  return (
    <motion.div role="alert" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1, x: [0, -12, 12, -8, 8, 0] }} transition={{ duration: 0.5 }} className="rounded-3xl border-2 border-danger/30 bg-white p-8 text-center">
      <svg viewBox="0 0 52 52" className="mx-auto h-20 w-20" aria-hidden="true">
        <motion.circle cx="26" cy="26" r="24" fill="none" stroke="#D93A3F" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
        <motion.path d="M17 17 L35 35 M35 17 L17 35" fill="none" stroke="#D93A3F" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.3 }} />
      </svg>
      <h2 className="mt-4 font-display text-3xl font-extrabold">Booking failed</h2>
      <p className="mx-auto mt-2 max-w-md text-ink/75">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button className="btn-blue" onClick={onRetry}>Try again</button>
        <Link className="btn-ghost" to={backTo}>Change tickets</Link>
      </div>
    </motion.div>
  );
}

export default function Checkout() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const { event, loading, error, notFound, reload } = useLiveEvent(id);

  const categoryId = Number(sp.get('category')) || null;
  const qty = Math.min(10, Math.max(1, Number(sp.get('qty')) || 1));
  const category = event?.categories?.find((c) => c.id === categoryId);

  const [form, setForm] = useState({ name: '', email: '', mobile: '' });
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | failed
  const [failure, setFailure] = useState('');
  const idemKey = useRef(crypto.randomUUID());

  const ready = !!event && !!category && !isPast(event);
  const hold = useSeatHold({ eventId: event?.id, categoryId: category?.id, quantity: qty, enabled: ready });

  const errors = useMemo(() => Object.fromEntries(Object.keys(RULES).map((k) => [k, RULES[k](form[k])])), [form]);
  const fieldError = (k) => (touched[k] || serverErrors[k]) && (errors[k] || serverErrors[k]);
  const valid = Object.values(errors).every((e) => !e);
  const total = category ? Number(category.price) * qty : 0;
  const setQty = (n) => setSp({ category: String(categoryId), qty: String(n) }, { replace: true });
  const backTo = `/events/${id}?category=${categoryId || ''}`;

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, mobile: true });
    if (!valid) return;
    setStatus('submitting'); setServerErrors({});
    try {
      const booking = await bookingsApi.create({
        event_id: event.id, category_id: category.id, quantity: qty,
        name: form.name.trim(), email: form.email.trim(), mobile: form.mobile.trim(),
        socket_id: getSocketId(), idempotency_key: idemKey.current,
      });
      navigate(`/ticket/${booking.ticket_code}`, { state: { fresh: true } });
    } catch (err) {
      const fields = errFields(err);
      if (Object.keys(fields).length) { setServerErrors(fields); setStatus('idle'); return; }
      setFailure(errMsg(err)); setStatus('failed'); reload();
    }
  };

  if (loading && !event) return <PageShell><div className="grid place-items-center py-32"><Spinner className="!h-8 !w-8 text-blue" /></div></PageShell>;
  if (notFound) return <PageShell><EmptyState title="Event not found" action={<Link className="btn-blue" to="/events">Back to events</Link>} /></PageShell>;
  if (error && !event) return <PageShell><ErrorState message={error} onRetry={reload} /></PageShell>;
  if (!category || isPast(event)) return <PageShell><EmptyState title={isPast(event) ? 'This event has ended' : 'Choose a ticket first'} action={<Link className="btn-blue" to={`/events/${id}`}>Back to event</Link>} /></PageShell>;

  const left = Math.max(0, category.available_seats);
  const mins = hold.secondsLeft != null ? `${Math.floor(hold.secondsLeft / 60)}:${String(hold.secondsLeft % 60).padStart(2, '0')}` : null;

  return (
    <PageShell>
      <Link to={backTo} className="text-sm font-bold text-ink/60 hover:text-ink">Back to tickets</Link>
      <h1 className="mt-2 font-display text-5xl font-extrabold">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <AnimatePresence mode="wait">
          {status === 'failed' ? (
            <FailurePanel key="fail" message={failure} backTo={backTo} onRetry={() => { setStatus('idle'); idemKey.current = crypto.randomUUID(); }} />
          ) : (
            <motion.form key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={submit} noValidate className="space-y-5 rounded-3xl bg-white p-7 shadow-sm">
              <h2 className="font-display text-2xl font-extrabold">Your details</h2>
              <Field label="Full name" error={fieldError('name')}>
                <input className={`input ${fieldError('name') ? 'input-error' : ''}`} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onBlur={() => setTouched((t) => ({ ...t, name: true }))} />
              </Field>
              <Field label="Email" error={fieldError('email')} hint="We show your ticket on the next screen.">
                <input className={`input ${fieldError('email') ? 'input-error' : ''}`} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onBlur={() => setTouched((t) => ({ ...t, email: true }))} />
              </Field>
              <Field label="Mobile number" error={fieldError('mobile')}>
                <input className={`input ${fieldError('mobile') ? 'input-error' : ''}`} type="tel" inputMode="tel" autoComplete="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} onBlur={() => setTouched((t) => ({ ...t, mobile: true }))} />
              </Field>
              <button className="btn-sun w-full" disabled={status === 'submitting'}>
                {status === 'submitting' ? <><Spinner /> Booking</> : `Confirm booking, ${money(total)}`}
              </button>
              <p className="text-center text-xs text-ink/60">No online payment is taken in this demo.</p>
            </motion.form>
          )}
        </AnimatePresence>

        <aside className="h-fit rounded-3xl bg-ink p-7 text-white lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="font-display text-2xl font-extrabold">{event.title}</h2>
          <p className="mt-1 text-white/70">{fmtDateTime(event.date)}</p>
          <p className="text-white/70">{event.location}</p>
          <dl className="mt-6 space-y-3 border-t border-dashed border-white/25 pt-5">
            <div className="flex justify-between"><dt className="text-white/70">Category</dt><dd className="font-bold">{category.name}</dd></div>
            <div className="flex justify-between"><dt className="text-white/70">Price each</dt><dd className="font-bold">{money(category.price)}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-white/70">Quantity</dt>
              <dd className="flex items-center gap-3">
                <button type="button" className="h-8 w-8 rounded-full border border-white/40 disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label="Fewer tickets">−</button>
                <span className="w-5 text-center font-bold">{qty}</span>
                <button type="button" className="h-8 w-8 rounded-full border border-white/40 disabled:opacity-30" disabled={qty >= Math.min(10, left)} onClick={() => setQty(qty + 1)} aria-label="More tickets">+</button>
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex items-end justify-between border-t border-dashed border-white/25 pt-5">
            <span className="text-white/70">Total</span>
            <motion.span key={total} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-4xl font-extrabold text-sun">{money(total)}</motion.span>
          </div>

          <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm" aria-live="polite">
            {hold.status === 'held' && <p><strong>{qty} seat{qty > 1 ? 's' : ''} held for you</strong>{mins && <> for {mins}</>}.</p>}
            {hold.status === 'failed' && <p className="text-sun">{hold.message}</p>}
            {hold.status === 'expired' && <p className="text-sun">Your hold expired. Seats may still be available when you confirm.</p>}
            {hold.status === 'idle' && <p className="text-white/70">Holding your seats</p>}
            <p className="mt-1 text-white/60">{left} seats left in {category.name}.</p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
