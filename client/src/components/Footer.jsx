import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-extrabold">SmartEvents</p>
          <p className="mt-3 max-w-sm text-white/70">Find an event, watch the seat count move in real time, and walk away with a QR ticket.</p>
        </div>
        <nav aria-label="Footer" className="space-y-2">
          <p className="font-bold">Explore</p>
          <Link className="block text-white/70 hover:text-white" to="/events">All events</Link>
          <a className="block text-white/70 hover:text-white" href="/#how">How it works</a>
          <a className="block text-white/70 hover:text-white" href="/#faq">FAQ</a>
        </nav>
        <nav aria-label="Organisers" className="space-y-2">
          <p className="font-bold">Organisers</p>
          <Link className="block text-white/70 hover:text-white" to="/admin">Admin dashboard</Link>
        </nav>
      </div>
      <p className="border-t border-white/10 py-5 text-center text-sm text-white/50">Built for the MERN + MySQL assignment. Landing page inspired by the Summitra conference template.</p>
    </footer>
  );
}
