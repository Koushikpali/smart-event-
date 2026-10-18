import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Countdown from '../components/Countdown';
import EventCard from '../components/EventCard';
import Faq from '../components/Faq';
import SeatMeter from '../components/SeatMeter';
import { CardSkeleton } from '../components/ui';
import { useLiveEvent } from '../hooks/useLiveEvent';
import { useLiveEvents } from '../hooks/useLiveEvents';
import { FALLBACK_IMG, fmtDate, fmtShortDate, money } from '../lib/format';

const PARAMS = { limit: 6 };

function HeroStub({ event, style, className = '' }) {
  return (
    <motion.div style={style} className={`absolute w-60 drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)] ${className}`}>
      <Link to={`/events/${event.id}`} className="stub block bg-white text-ink">
        <img src={event.img || FALLBACK_IMG} onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }} alt="" className="h-28 w-full object-cover" />
        <div className="h-[104px] space-y-1 p-4">
          <p className="line-clamp-2 font-display font-bold leading-snug">{event.title}</p>
          <p className="text-xs text-ink/60">{fmtShortDate(event.date)}</p>
        </div>
        <div className="perf flex h-16 items-center justify-between px-4">
          <span className="font-display font-extrabold">{money(event.price)}</span>
          <SeatMeter event={event} compact />
        </div>
      </Link>
    </motion.div>
  );
}

function Hero({ events }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const glow = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const next = events[0];

  return (
    <section ref={ref} className="relative isolate overflow-hidden bg-blue text-white">
      <motion.div style={{ y: glow }} aria-hidden="true" className="absolute -left-40 top-20 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#6C63FF] opacity-60 blur-3xl" />
      <motion.div style={{ y: y3 }} aria-hidden="true" className="absolute -right-32 bottom-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-ink opacity-50 blur-3xl" />
      <div className="mx-auto grid min-h-[92vh] max-w-6xl items-center gap-10 px-5 pb-20 pt-32 lg:grid-cols-[1.15fr_1fr]">
        <div>
          {next && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
              <span aria-hidden="true">📍</span>
              <span className="truncate">Next up: {next.title}, {next.location}</span>
            </motion.div>
          )}
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="font-display text-5xl font-extrabold leading-[1.02] sm:text-7xl">
            Book the seat before it's gone.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-6 max-w-xl text-lg text-white/85">
            Concerts, hackathons, summits and workshops. Seat counts move live as people book, and your QR ticket is ready the moment you confirm.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 flex flex-wrap gap-3">
            <Link to="/events" className="btn-sun">Browse events</Link>
            <a href="#how" className="btn-ghost-light">See how booking works</a>
          </motion.div>
        </div>

        <div className="relative hidden h-[30rem] lg:block" aria-hidden={events.length === 0}>
          {events[0] && <HeroStub event={events[0]} style={{ y: y1 }} className="left-2 top-2 -rotate-6" />}
          {events[1] && <HeroStub event={events[1]} style={{ y: y2 }} className="right-4 top-28 rotate-3" />}
          {events[2] && <HeroStub event={events[2]} style={{ y: y3 }} className="bottom-0 left-24 -rotate-2" />}
        </div>
      </div>
    </section>
  );
}

function About({ next }) {
  return (
    <section id="about" className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-4xl font-extrabold sm:text-5xl">What you see is what is left.</h2>
        <p className="mt-5 max-w-lg text-lg text-ink/75">
          Every card and every ticket tier shows the seats remaining right now. When someone books, the number changes on your screen without a refresh, so you never fill in a form for seats that are already gone.
        </p>
      </div>
      <div>
        {next ? (
          <>
            <p className="mb-3 font-bold">{next.title} starts in</p>
            <Countdown target={next.date} />
            <Link to={`/events/${next.id}`} className="btn-blue mt-6">Book this event</Link>
          </>
        ) : (
          <p className="text-ink/60">New events will appear here as soon as they are published.</p>
        )}
      </div>
    </section>
  );
}

function ParallaxBand() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-12%', '12%']);
  return (
    <section ref={ref} className="relative h-[26rem] overflow-hidden bg-ink">
      <motion.img style={{ y, scale: 1.25 }} src="https://picsum.photos/seed/crowd-lights/1600/900" onError={(e) => { e.currentTarget.style.display = 'none'; }} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
      <div className="relative mx-auto flex h-full max-w-6xl items-center px-5">
        <p className="max-w-2xl font-display text-4xl font-extrabold leading-tight text-white sm:text-6xl">One crowd. One seat map. Updated in real time.</p>
      </div>
    </section>
  );
}

function Upcoming({ events, loading }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-4xl font-extrabold sm:text-5xl">Happening soon</h2>
        <Link to="/events" className="btn-ghost">See all events</Link>
      </div>
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />) : events.slice(0, 6).map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
      </div>
      {!loading && events.length === 0 && <p className="text-ink/60">No upcoming events yet. Check back soon.</p>}
    </section>
  );
}

function Pricing({ eventId }) {
  const { event } = useLiveEvent(eventId);
  if (!event?.categories?.length) return null;
  return (
    <section id="pricing" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="font-display text-4xl font-extrabold sm:text-5xl">Ticket tiers for {event.title}</h2>
        <p className="mt-3 max-w-xl text-ink/70">Pick the tier that fits. Prices are per ticket.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {event.categories.map((c, i) => (
            <motion.div key={c.id} whileHover={{ y: -6 }} className={`flex flex-col rounded-3xl p-7 ${i === event.categories.length - 1 && event.categories.length > 1 ? 'bg-ink text-white' : 'bg-paper'}`}>
              <p className="font-display text-xl font-bold">{c.name}</p>
              <p className="mt-3 font-display text-5xl font-extrabold">{money(c.price)}</p>
              <div className="mt-6 flex-1"><SeatMeter event={{ total_seats: c.total_seats, available_seats: c.available_seats, held_seats: c.held_seats }} /></div>
              <Link to={`/events/${event.id}?category=${c.id}`} className="btn-sun mt-7">Choose {c.name}</Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  ['Find an event', 'Search by name, narrow by location or date, and check the live seat count on every card.'],
  ['Choose your tickets', 'Pick a ticket tier and quantity. The total updates as you change them.'],
  ['Enter your details', 'Name, email and mobile number. Your seats are held for a few minutes while you fill this in.'],
  ['Download your ticket', 'Confirm and get a QR ticket straight away. Show it at the entrance.'],
];

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-24">
      <h2 className="font-display text-4xl font-extrabold sm:text-5xl">From search to ticket in four steps</h2>
      <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="rounded-3xl bg-white p-6">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-blue font-display font-extrabold text-white">{i + 1}</span>
            <p className="mt-5 font-display text-xl font-bold">{t}</p>
            <p className="mt-2 text-ink/70">{d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Landing() {
  const { events, loading } = useLiveEvents(PARAMS);
  const next = events[0];
  return (
    <>
      <Hero events={events} />
      <About next={next} />
      <ParallaxBand />
      <Upcoming events={events} loading={loading} />
      {next && <Pricing eventId={next.id} />}
      <HowItWorks />
      <section id="faq" className="mx-auto max-w-3xl px-5 pb-24">
        <h2 className="mb-8 font-display text-4xl font-extrabold sm:text-5xl">Questions, answered</h2>
        <Faq />
      </section>
      <section className="bg-blue px-5 py-20 text-center text-white">
        <h2 className="mx-auto max-w-2xl font-display text-4xl font-extrabold sm:text-5xl">Your seat is waiting. {next ? `${fmtDate(next.date)} is closer than it looks.` : ''}</h2>
        <Link to="/events" className="btn-sun mt-8">Browse events</Link>
      </section>
    </>
  );
}
