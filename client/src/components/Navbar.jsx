import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

const links = [
  { to: '/events', label: 'Events' },
  { to: '/#how', label: 'How it works' },
  { to: '/#faq', label: 'FAQ' },
  { to: '/admin', label: 'Admin' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const live = useConnectionStatus();
  const overHero = pathname === '/' && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${overHero ? 'bg-transparent text-white' : 'bg-paper/95 text-ink shadow-sm backdrop-blur'}`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4" aria-label="Main">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold">
          <span aria-hidden="true" className="stub-mark grid h-8 w-8 place-items-center rounded-lg bg-sun text-ink">🎟</span>
          SmartEvents
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) =>
            l.to.includes('#') ? (
              <a key={l.to} href={l.to} className="font-medium hover:opacity-70">{l.label}</a>
            ) : (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `font-medium hover:opacity-70 ${isActive ? 'underline decoration-sun decoration-2 underline-offset-8' : ''}`}>{l.label}</NavLink>
            ),
          )}
          <span className="flex items-center gap-1.5 text-xs font-bold" title={live ? 'Live updates connected' : 'Reconnecting to live updates'}>
            <span className={`h-2 w-2 rounded-full ${live ? 'bg-ok' : 'bg-sun'}`} aria-hidden="true" />
            {live ? 'Live' : 'Offline'}
          </span>
          <Link to="/events" className="btn-sun !px-5 !py-2">Book tickets</Link>
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Toggle menu">
          <span className="block text-2xl leading-none">{open ? '×' : '☰'}</span>
        </button>
      </nav>
      {open && (
        <div className="space-y-1 border-t border-ink/10 bg-paper px-5 pb-5 pt-2 text-ink md:hidden">
          {links.map((l) => <a key={l.to} href={l.to} className="block py-2.5 text-lg font-medium">{l.label}</a>)}
          <Link to="/events" className="btn-sun mt-2 w-full">Book tickets</Link>
        </div>
      )}
    </header>
  );
}
