import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { EmptyState, ErrorState, PageShell, Spinner } from '../components/ui';
import { ticketsApi, errMsg } from '../lib/api';
import { celebrate } from '../lib/confetti';
import { fmtDateTime, money } from '../lib/format';
import { downloadTicketPng, makeQr } from '../lib/ticketImage';

function CheckMark() {
  return (
    <svg viewBox="0 0 52 52" className="mx-auto h-24 w-24" aria-hidden="true">
      <motion.circle cx="26" cy="26" r="24" fill="#12915A" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} />
      <motion.path d="M14 27 L23 35 L38 18" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.4 }} />
    </svg>
  );
}

export default function TicketPage() {
  const { code } = useParams();
  const fresh = !!useLocation().state?.fresh;
  const [ticket, setTicket] = useState(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let off = false;
    ticketsApi.get(code)
      .then(async (t) => { if (off) return; setTicket(t); setQr(await makeQr(code)); if (fresh) celebrate(); })
      .catch((e) => { if (off) return; setNotFound(e?.response?.status === 404); setError(errMsg(e)); });
    return () => { off = true; };
  }, [code, fresh]);

  if (notFound) return <PageShell><EmptyState title="Ticket not found" text="Check the link, or book again." action={<Link className="btn-blue" to="/events">Browse events</Link>} /></PageShell>;
  if (error) return <PageShell><ErrorState message={error} onRetry={() => window.location.reload()} /></PageShell>;
  if (!ticket) return <PageShell><div className="grid place-items-center py-32"><Spinner className="!h-8 !w-8 text-blue" /></div></PageShell>;

  const cancelled = ticket.status === 'cancelled';
  const used = !!ticket.checked_in_at;

  return (
    <PageShell className="!max-w-3xl">
      {fresh && !cancelled && (
        <div className="mb-8 text-center">
          <CheckMark />
          <h1 className="mt-4 font-display text-4xl font-extrabold">You're booked!</h1>
          <p className="mt-2 text-ink/70">Download your ticket and show the QR code at the entrance.</p>
        </div>
      )}
      {!fresh && <h1 className="mb-8 font-display text-4xl font-extrabold">Your ticket</h1>}

      <motion.div initial={{ opacity: 0, y: 30, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: fresh ? 0.5 : 0 }} className="drop-shadow-[0_18px_30px_rgba(20,18,43,0.18)]">
        <div className="overflow-hidden rounded-3xl bg-white sm:grid sm:grid-cols-[1fr_15rem]">
          <div className="p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${cancelled ? 'bg-danger' : used ? 'bg-ink/60' : 'bg-ok'}`}>{cancelled ? 'Cancelled' : used ? 'Already used' : 'Valid'}</span>
            </div>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight">{ticket.event_title}</h2>
            <p className="mt-2 text-ink/70">{ticket.location}</p>
            <p className="text-ink/70">{fmtDateTime(ticket.event_date)}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-ink/60">Name</dt><dd className="font-bold">{ticket.name}</dd></div>
              <div><dt className="text-ink/60">Tickets</dt><dd className="font-bold">{ticket.quantity} × {ticket.category_name}</dd></div>
              <div><dt className="text-ink/60">Total</dt><dd className="font-bold">{money(ticket.total_amount)}</dd></div>
              <div><dt className="text-ink/60">Booked</dt><dd className="font-bold">{fmtDateTime(ticket.booking_date)}</dd></div>
            </dl>
            <p className="mt-6 break-all font-mono text-xs text-ink/50">{ticket.ticket_code}</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 border-t-2 border-dashed border-ink/20 bg-paper p-6 sm:border-l-2 sm:border-t-0">
            {qr && <img src={qr} alt={`QR code for ticket ${ticket.ticket_code}`} className={`h-44 w-44 rounded-xl bg-white p-2 ${cancelled ? 'opacity-30' : ''}`} />}
            <p className="text-sm font-bold">Scan at entry</p>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button className="btn-blue" disabled={cancelled} onClick={() => downloadTicketPng(ticket)}>Download ticket</button>
        <button className="btn-ghost" onClick={() => window.print()}>Print</button>
        <Link className="btn-ghost" to="/events">More events</Link>
      </div>
    </PageShell>
  );
}
