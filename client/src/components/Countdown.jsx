import { useEffect, useState } from 'react';

export default function Countdown({ target, dark = false }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, Math.floor((new Date(target) - now) / 1000));
  const parts = [
    ['Days', Math.floor(diff / 86400)],
    ['Hours', Math.floor((diff % 86400) / 3600)],
    ['Minutes', Math.floor((diff % 3600) / 60)],
    ['Seconds', diff % 60],
  ];
  return (
    <div className="grid grid-cols-4 gap-3" role="timer" aria-label="Time until the event starts">
      {parts.map(([label, v]) => (
        <div key={label} className={`rounded-2xl px-2 py-4 text-center ${dark ? 'bg-white/10' : 'bg-white'}`}>
          <p className="font-display text-3xl font-extrabold tabular-nums sm:text-5xl">{String(v).padStart(2, '0')}</p>
          <p className={`mt-1 text-xs sm:text-sm ${dark ? 'text-white/70' : 'text-ink/60'}`}>{label}</p>
        </div>
      ))}
    </div>
  );
}
