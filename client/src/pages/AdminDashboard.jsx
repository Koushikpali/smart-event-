import { useState } from 'react';
import BookingsPanel from '../components/admin/BookingsPanel';
import EventsPanel from '../components/admin/EventsPanel';
import VerifyPanel from '../components/admin/VerifyPanel';
import { PageShell } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const TABS = [['events', 'Events'], ['bookings', 'Bookings'], ['verify', 'Verify ticket']];

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [tab, setTab] = useState('events');
  return (
    <PageShell>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-5xl font-extrabold">Admin</h1>
        <button className="btn-ghost !py-2" onClick={logout}>Sign out</button>
      </div>
      <div role="tablist" className="mb-8 inline-flex rounded-full bg-white p-1.5">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-5 py-2 font-bold transition-colors ${tab === k ? 'bg-ink text-white' : 'hover:bg-ink/5'}`}>{l}</button>
        ))}
      </div>
      {tab === 'events' && <EventsPanel />}
      {tab === 'bookings' && <BookingsPanel />}
      {tab === 'verify' && <VerifyPanel />}
    </PageShell>
  );
}
