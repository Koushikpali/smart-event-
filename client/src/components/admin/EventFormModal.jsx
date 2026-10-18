import { useState } from 'react';
import { Field, Modal, Spinner } from '../ui';
import { errFields, errMsg, eventsApi } from '../../lib/api';
import { toLocalInput } from '../../lib/format';

const blankCat = () => ({ name: '', price: '', total_seats: '' });

function initial(event) {
  if (!event) return { title: '', description: '', location: '', date: '', img: '', categories: [{ name: 'General', price: '', total_seats: '' }] };
  return {
    title: event.title, description: event.description, location: event.location,
    date: toLocalInput(event.date), img: event.img || '',
    categories: event.categories.map((c) => ({ id: c.id, name: c.name, price: c.price, total_seats: c.total_seats, sold: c.total_seats - c.available_seats })),
  };
}

export default function EventFormModal({ open, event, onClose, onSaved }) {
  const [f, setF] = useState(() => initial(event));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const editing = !!event;

  const setCat = (i, patch) => setF((s) => ({ ...s, categories: s.categories.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({}); setFormError('');
    const body = {
      title: f.title, description: f.description, location: f.location,
      date: f.date ? new Date(f.date).toISOString() : '', img: f.img.trim(),
      categories: f.categories.map((c) => ({ ...(c.id ? { id: c.id } : {}), name: c.name, price: Number(c.price), total_seats: Number(c.total_seats) })),
    };
    try {
      const saved = editing ? await eventsApi.update(event.id, body) : await eventsApi.create(body);
      onSaved(saved);
    } catch (err) {
      setErrors(errFields(err));
      setFormError(errMsg(err));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit event' : 'Create event'} wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" error={errors.title}><input className="input" required minLength={3} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Description" error={errors.description}><textarea className="input min-h-28" required minLength={10} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" error={errors.location}><input className="input" required value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
          <Field label="Date and time" error={errors.date}><input className="input" type="datetime-local" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        </div>
        <Field label="Image URL" error={errors.img} hint="Optional. A direct link to a JPG or PNG."><input className="input" type="url" value={f.img} onChange={(e) => setF({ ...f, img: e.target.value })} /></Field>

        <fieldset className="rounded-2xl border-2 border-ink/10 p-4">
          <legend className="px-2 font-bold">Ticket categories</legend>
          <div className="space-y-3">
            {f.categories.map((c, i) => (
              <div key={c.id ?? `new-${i}`} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <input className="input" placeholder="Name (e.g. VIP)" aria-label="Category name" required value={c.name} onChange={(e) => setCat(i, { name: e.target.value })} />
                <input className="input" type="number" min="0" step="0.01" placeholder="Price" aria-label="Price" required value={c.price} onChange={(e) => setCat(i, { price: e.target.value })} />
                <input className="input" type="number" min={Math.max(1, c.sold || 0)} placeholder="Seats" aria-label="Seats" required value={c.total_seats} onChange={(e) => setCat(i, { total_seats: e.target.value })} />
                <button type="button" className="rounded-xl px-3 text-danger hover:bg-danger/10 disabled:opacity-30" disabled={f.categories.length === 1 || c.sold > 0} onClick={() => setF({ ...f, categories: f.categories.filter((_, j) => j !== i) })} title={c.sold > 0 ? 'Has bookings' : 'Remove'} aria-label="Remove category">×</button>
              </div>
            ))}
          </div>
          {errors.categories && <p className="mt-2 text-sm text-danger">{errors.categories}</p>}
          <button type="button" className="btn-ghost mt-3 !py-2 text-sm" disabled={f.categories.length >= 8} onClick={() => setF({ ...f, categories: [...f.categories, blankCat()] })}>Add category</button>
        </fieldset>

        {formError && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{formError}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-blue" disabled={busy}>{busy ? <Spinner /> : editing ? 'Save changes' : 'Create event'}</button>
        </div>
      </form>
    </Modal>
  );
}
