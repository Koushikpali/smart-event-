import { motion } from 'framer-motion';
import { useState } from 'react';
import { errMsg, ticketsApi } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';
import { Spinner } from '../ui';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export default function VerifyPanel() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok, message, ticket }

  const verify = async (e) => {
    e.preventDefault();
    const code = input.match(UUID)?.[0];
    if (!code) return setResult({ ok: false, message: 'That does not look like a ticket code.' });
    setBusy(true); setResult(null);
    try {
      const res = await ticketsApi.verify(code);
      setResult({ ok: true, message: 'Valid ticket. Entry recorded.', ticket: res.data });
    } catch (err) {
      setResult({ ok: false, message: errMsg(err) });
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-xl">
      <h2 className="font-display text-2xl font-extrabold">Verify a ticket</h2>
      <p className="mt-1 text-ink/70">Paste the ticket code (or the full ticket link from the QR). A valid ticket is marked as used, so a second scan is rejected.</p>
      <form onSubmit={verify} className="mt-5 flex gap-3">
        <input className="input" placeholder="Ticket code" aria-label="Ticket code" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn-blue" disabled={busy || !input.trim()}>{busy ? <Spinner /> : 'Verify'}</button>
      </form>
      {result && (
        <motion.div role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 rounded-2xl p-5 ${result.ok ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger'}`}>
          <p className="font-bold">{result.message}</p>
          {result.ticket && (
            <p className="mt-2 text-sm text-ink">{result.ticket.name}, {result.ticket.quantity} × {result.ticket.category_name}, {result.ticket.event_title}, {fmtDateTime(result.ticket.event_date)}</p>
          )}
        </motion.div>
      )}
    </div>
  );
}
