import { useCallback, useEffect, useState } from 'react';
import { bookingsApi, errMsg, eventsApi } from '../../lib/api';
import { fmtDateTime, money } from '../../lib/format';
import { subscribeSeatUpdates } from '../../socket';
import { EmptyState, ErrorState, Modal, Spinner } from '../ui';

export default function BookingsPanel() {
  const [rows, setRows] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows(await bookingsApi.list({ event_id: eventId || undefined, status: status || undefined })); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [eventId, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { eventsApi.list({ include_past: 'true', limit: 50 }).then((r) => setEvents(r.data)).catch(() => {}); }, []);
  useEffect(() => subscribeSeatUpdates(() => load()), [load]); // new booking anywhere => refresh table

  const cancel = async () => {
    setBusy(true); setCancelError('');
    try { await bookingsApi.cancel(toCancel.id); setToCancel(null); load(); }
    catch (e) { setCancelError(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold">Bookings</h2>
        <div className="flex flex-wrap gap-3">
          <select className="input !w-auto !py-2" aria-label="Filter by event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">All events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <select className="input !w-auto !py-2" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={load} />
        : loading && !rows.length ? <div className="grid place-items-center py-16"><Spinner className="!h-7 !w-7 text-blue" /></div>
        : rows.length === 0 ? <EmptyState title="No bookings found" text="Bookings appear here the moment someone books." />
        : (
          <div className="overflow-x-auto rounded-2xl bg-white">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-ink/10 text-ink/60"><tr>{['Guest', 'Event', 'Tickets', 'Amount', 'Booked', 'Status', ''].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3"><p className="font-bold">{b.name}</p><p className="text-ink/60">{b.email}</p><p className="text-ink/60">{b.mobile}</p></td>
                    <td className="px-4 py-3">{b.event_title}</td>
                    <td className="px-4 py-3">{b.quantity} × {b.category_name}</td>
                    <td className="px-4 py-3">{money(b.total_amount)}</td>
                    <td className="px-4 py-3">{fmtDateTime(b.booking_date)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${b.status === 'confirmed' ? 'bg-ok' : 'bg-danger'}`}>{b.status}</span>{b.checked_in_at && <p className="mt-1 text-xs text-ink/60">Checked in</p>}</td>
                    <td className="px-4 py-3 text-right">{b.status === 'confirmed' && <button className="rounded-lg px-3 py-1.5 font-bold text-danger hover:bg-danger/10" onClick={() => { setCancelError(''); setToCancel(b); }}>Cancel</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Modal open={!!toCancel} onClose={() => setToCancel(null)} title="Cancel this booking?">
        <p className="text-ink/75">{toCancel?.name}'s {toCancel?.quantity} ticket(s) will be cancelled and the seats released back to the event.</p>
        {cancelError && <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{cancelError}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-ghost" onClick={() => setToCancel(null)}>Keep booking</button>
          <button className="btn bg-danger text-white" onClick={cancel} disabled={busy}>{busy ? <Spinner /> : 'Cancel booking'}</button>
        </div>
      </Modal>
    </div>
  );
}
