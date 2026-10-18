import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { CardSkeleton, EmptyState, ErrorState, PageShell } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { useLiveEvents } from '../hooks/useLiveEvents';
import { eventsApi } from '../lib/api';
import { dayRange } from '../lib/format';

const LIMIT = 9;

export default function Events() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') || '';
  const location = sp.get('location') || '';
  const date = sp.get('date') || '';
  const page = Number(sp.get('page') || 1);

  const [search, setSearch] = useState(q);
  const debounced = useDebounce(search);
  const [locations, setLocations] = useState([]);

  const update = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries({ page: '', ...patch }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setSp(next, { replace: true });
  };

  useEffect(() => { if (debounced !== q) update({ q: debounced }); /* eslint-disable-next-line */ }, [debounced]);
  useEffect(() => { eventsApi.locations().then(setLocations).catch(() => {}); }, []);

  const params = { q: q || undefined, location: location || undefined, page, limit: LIMIT, ...(date ? dayRange(date) : {}) };
  const { events, meta, loading, error, reload } = useLiveEvents(params);
  const pages = meta ? Math.max(1, Math.ceil(meta.total / LIMIT)) : 1;
  const hasFilters = q || location || date;

  const clear = () => { setSearch(''); setSp({}, { replace: true }); };

  return (
    <PageShell>
      <h1 className="font-display text-5xl font-extrabold">Upcoming events</h1>
      <p className="mt-2 text-ink/70">Seat counts update live. No refresh needed.</p>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-8 grid gap-3 rounded-3xl bg-white p-4 shadow-sm md:grid-cols-[2fr_1fr_1fr_auto]">
        <input className="input" type="search" placeholder="Search events, venues, topics" aria-label="Search events" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" aria-label="Filter by location" value={location} onChange={(e) => update({ location: e.target.value })}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <input className="input" type="date" aria-label="Filter by date" value={date} onChange={(e) => update({ date: e.target.value })} />
        <button type="button" onClick={clear} disabled={!hasFilters} className="btn-ghost !py-2.5">Clear</button>
      </form>

      <div className="mt-10">
        {error && !events.length ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !events.length ? (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
        ) : events.length === 0 ? (
          <EmptyState title={hasFilters ? 'No events match your filters' : 'No upcoming events yet'} text={hasFilters ? 'Try a different search, location or date.' : 'Check back soon.'} action={hasFilters && <button onClick={clear} className="btn-blue">Clear filters</button>} />
        ) : (
          <>
            <p className="mb-5 text-sm font-bold text-ink/60">{meta?.total} event{meta?.total === 1 ? '' : 's'}</p>
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
            </div>
            {pages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-4">
                <button className="btn-ghost" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Previous</button>
                <span className="font-bold">Page {page} of {pages}</span>
                <button className="btn-ghost" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
