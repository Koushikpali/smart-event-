import { pool, withTransaction } from '../config/db.js';
import { conflict, notFound } from '../utils/HttpError.js';

const TICKET_SELECT = `SELECT b.id, b.event_id, b.ticket_code, b.status, b.checked_in_at, b.name, b.quantity,
  b.total_amount, b.booking_date, e.title AS event_title, e.location, e.\`date\` AS event_date, c.name AS category_name
  FROM bookings b JOIN events e ON e.id = b.event_id JOIN ticket_categories c ON c.id = b.category_id`;

/** Public view of a ticket (no email / mobile). */
export async function getTicket(code, conn = pool) {
  const [rows] = await conn.execute(`${TICKET_SELECT} WHERE b.ticket_code = ?`, [code]);
  if (!rows.length) throw notFound('Ticket not found');
  return rows[0];
}

/** Gate check: valid once, then "already used". Row lock makes two simultaneous scans safe. */
export async function verifyTicket(code) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute('SELECT id, status, checked_in_at FROM bookings WHERE ticket_code = ? FOR UPDATE', [code]);
    if (!rows.length) throw notFound('Ticket not found. This code is not valid.');
    const b = rows[0];
    if (b.status === 'cancelled') throw conflict('This ticket was cancelled.');
    if (b.checked_in_at) throw conflict(`Already used at ${new Date(b.checked_in_at).toISOString()}.`);
    await conn.execute('UPDATE bookings SET checked_in_at = NOW() WHERE id = ?', [b.id]);
    return getTicket(code, conn);
  });
}
