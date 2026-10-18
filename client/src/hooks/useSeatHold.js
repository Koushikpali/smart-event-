import { useEffect, useRef, useState } from 'react';
import { releaseHold, requestHold, subscribeHoldExpired } from '../socket';

/**
 * Bonus: real-time seat locking for the checkout page.
 * Holds `quantity` seats of a category while mounted, shows a countdown, releases on unmount.
 */
export function useSeatHold({ eventId, categoryId, quantity, enabled }) {
  const [hold, setHold] = useState({ status: 'idle', expiresAt: null, message: '' }); // idle | held | failed | expired
  const [secondsLeft, setSecondsLeft] = useState(null);
  const active = useRef(false);

  useEffect(() => {
    if (!enabled || !eventId || !categoryId || !quantity) return undefined;
    let cancelled = false;
    requestHold({ eventId, categoryId, quantity }).then((res) => {
      if (cancelled) return;
      active.current = !!res?.ok;
      setHold(res?.ok ? { status: 'held', expiresAt: res.expiresAt, message: '' } : { status: 'failed', expiresAt: null, message: res?.message || 'Seats could not be held.' });
    });
    return () => { cancelled = true; };
  }, [enabled, eventId, categoryId, quantity]);

  useEffect(() => subscribeHoldExpired(() => { active.current = false; setHold({ status: 'expired', expiresAt: null, message: 'Your seat hold expired.' }); }), []);

  useEffect(() => () => { if (active.current) releaseHold(); }, []);

  useEffect(() => {
    if (hold.status !== 'held' || !hold.expiresAt) { setSecondsLeft(null); return undefined; }
    const tick = () => setSecondsLeft(Math.max(0, Math.round((hold.expiresAt - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [hold]);

  return { ...hold, secondsLeft };
}
