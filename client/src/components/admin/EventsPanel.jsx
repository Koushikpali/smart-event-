import { useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi, errMsg } from '../../lib/api';
import { fmtDateTime, money } from '../../lib/format';
import { useLiveEvents } from '../../hooks/useLiveEvents';
import { CardSkeleton, EmptyState, ErrorState, Modal, Spinner } from '../ui';
import EventFormModal from './EventFormModal';

const PARAMS = { include_past: 'true', limit: 50 };

export default function EventsPanel() {
  const { events, loading, error, reload } = useLiveEvents(PARAMS);
  const [form, setForm] = useState(null); // null | { event? }
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const edit = async (e) => {
    try { setForm({ event: await eventsApi.get(e.id) }); } catch (err) { alert(errMsg(err)); }
  };
  const confirmDelete = async () => {
    setDeleting(true); setDeleteError('');
    try { await eventsApi.remove(toDelete.id); setToDelete(null); reload(); }
    catch (err) { setDeleteError(errMsg(err)); }
    finally { setDeleting(false); }
  };

  const sold = events.reduce((n, e) => n + Number(e.tickets_sold || 0), 0);
  const revenue = events.reduce((n, e) => n + Number(e.revenue || 0), 0);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[['Events', events.length], ['Tickets sold', sold], ['Revenue', money(revenue)]].map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-white p-5"><p className="text-sm text-ink/60">{l}</p><p className="font-display text-3xl font-extrabold">{v}</p></div>
        ))}
      </div>

      <div className="mb-4 mt-8 flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">Events</h2>
        <button className="btn-blue !py-2" onClick={() => setForm({})}>Create event</button>
      </div>

      {error && !events.length ? <ErrorState message={error} onRetry={reload} />
        : loading && !events.length ? <CardSkeleton />
        : events.length === 0 ? <EmptyState title="No events yet" text="Create your first event to start taking bookings." action={<button className="btn-blue" onClick={() => setForm({})}>Create event</button>} />
        : (
          <div className="overflow-x-auto rounded-2xl bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-ink/10 text-ink/60"><tr>{['Event', 'Date', 'Seats left', 'Sold', 'Revenue', ''].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3"><Link to={`/events/${e.id}`} className="font-bold hover:underline">{e.title}</Link><p className="text-ink/60">{e.location}</p></td>
                    <td className="px-4 py-3">{fmtDateTime(e.date)}</td>
                    <td className="px-4 py-3 font-bold">{e.available_seats} <span className="font-normal text-ink/50">/ {e.total_seats}</span></td>
                    <td className="px-4 py-3">{e.tickets_sold}</td>
                    <td className="px-4 py-3">{money(e.revenue)}</td>
                    <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
                      <button className="rounded-lg px-3 py-1.5 font-bold text-blue hover:bg-blue/10" onClick={() => edit(e)}>Edit</button>
                      <button className="rounded-lg px-3 py-1.5 font-bold text-danger hover:bg-danger/10" onClick={() => { setDeleteError(''); setToDelete(e); }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {form && <EventFormModal open event={form.event} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete this event?">
        <p className="text-ink/75">“{toDelete?.title}” will be removed permanently. Events with confirmed bookings cannot be deleted until those bookings are cancelled.</p>
        {deleteError && <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{deleteError}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-ghost" onClick={() => setToDelete(null)}>Keep event</button>
          <button className="btn bg-danger text-white" onClick={confirmDelete} disabled={deleting}>{deleting ? <Spinner /> : 'Delete event'}</button>
        </div>
      </Modal>
    </div>
  );
}
