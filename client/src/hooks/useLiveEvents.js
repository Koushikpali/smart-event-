import { useCallback, useEffect, useState } from 'react';
import { eventsApi, errMsg } from '../lib/api';
import { mergeSeats, subscribeEventsChanged, subscribeSeatUpdates } from '../socket';

/** Event list that fetches via REST and stays fresh via Socket.IO (no manual refresh). */
export function useLiveEvents(params) {
  const key = JSON.stringify(params);
  const [state, setState] = useState({ events: [], meta: null, loading: true, error: null });

  const load = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await eventsApi.list(JSON.parse(key));
      setState({ events: res.data, meta: res.meta, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: errMsg(e) }));
    }
  }, [key]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const offSeats = subscribeSeatUpdates((snap) =>
      setState((s) => ({ ...s, events: s.events.map((e) => mergeSeats(e, snap)) })));
    const offChanged = subscribeEventsChanged(() => load(true));
    return () => { offSeats(); offChanged(); };
  }, [load]);

  return { ...state, reload: () => load() };
}
