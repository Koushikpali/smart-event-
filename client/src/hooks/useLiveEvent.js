import { useCallback, useEffect, useState } from 'react';
import { eventsApi, errMsg } from '../lib/api';
import { mergeSeats, subscribeEventsChanged, subscribeSeatUpdates } from '../socket';

/** Single event (with ticket categories), live-updated over Socket.IO. */
export function useLiveEvent(id) {
  const [state, setState] = useState({ event: null, loading: true, error: null, notFound: false });

  const load = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const event = await eventsApi.get(id);
      setState({ event, loading: false, error: null, notFound: false });
    } catch (e) {
      const notFound = e?.response?.status === 404;
      setState((s) => ({ ...s, event: notFound ? null : s.event, loading: false, error: errMsg(e), notFound }));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const offSeats = subscribeSeatUpdates((snap) =>
      setState((s) => (s.event ? { ...s, event: mergeSeats(s.event, snap) } : s)));
    const offChanged = subscribeEventsChanged(() => load(true));
    return () => { offSeats(); offChanged(); };
  }, [load]);

  return { ...state, reload: () => load() };
}
