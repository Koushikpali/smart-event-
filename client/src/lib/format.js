import { CURRENCY } from './config';

export const money = (v) => {
  const n = Number(v) || 0;
  return `${CURRENCY}${n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
};
export const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtShortDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
export const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;

/** 'YYYY-MM-DD' (local day) -> ISO instants for [00:00, 23:59:59.999] local time. */
export function dayRange(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return {
    from: new Date(y, m - 1, d, 0, 0, 0, 0).toISOString(),
    to: new Date(y, m - 1, d, 23, 59, 59, 999).toISOString(),
  };
}

/** ISO -> value for <input type="datetime-local"> in the user's local time. */
export function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const seatsLeft = (e) => Math.max(0, (e.available_seats ?? 0) - (e.held_seats ?? 0));
export const isPast = (e) => new Date(e.date).getTime() < Date.now();

export const FALLBACK_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%233B34FF'/><stop offset='1' stop-color='%2314122B'/></linearGradient></defs><rect width='1200' height='800' fill='url(%23g)'/></svg>";
