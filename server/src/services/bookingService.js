import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from '../config/db.js';
import { badRequest, conflict, notFound } from '../utils/HttpError.js';
import { heldFor } from '../sockets/holds.js';
import { getTicket } from './ticketService.js';

/**
 * Create a booking safely under concurrency.
 *  1. Lock the event row (SELECT ... FOR UPDATE): other bookings for this event wait here.
 *  2. Lock the category row and check seats (minus seats held by OTHER people's checkout pages).
 *  3. Conditional UPDATEs ("... WHERE available_seats >= ?") so seats can never go negative.
 *  4. Insert the booking and commit. Any error rolls everything back.
 * Returns { ticket, duplicate }.
 */
export async function createBooking(input) {
  const { event_id, name, email, mobile, quantity, socket_id, idempotency_key } = input;

  if (idempotency_key) {
    const [dup] = await pool.execute('SELECT ticket_code FROM bookings WHERE idempotency_key = ?', [idempotency_key]);
    if (dup.length) return { ticket: await getTicket(dup[0].ticket_code), duplicate: true };
  }

  try {
    const code = await withTransaction(async (conn) => {
      const [events] = await conn.execute('SELECT id, `date` FROM events WHERE id = ? FOR UPDATE', [event_id]);
      if (!events.length) throw notFound('Event not found');
      if (new Date(events[0].date).getTime() < Date.now()) throw conflict('This event has already started or ended.');

      let categoryId = input.category_id;
      if (!categoryId) {
        const [cats] = await conn.execute('SELECT id FROM ticket_categories WHERE event_id = ?', [event_id]);
        if (cats.length !== 1) throw badRequest('category_id is required for events with several ticket categories');
        categoryId = cats[0].id;
      }
      const [catRows] = await conn.execute(
        'SELECT id, name, price, available_seats FROM ticket_categories WHERE id = ? AND event_id = ? FOR UPDATE',
        [categoryId, event_id],
      );
      if (!catRows.length) throw badRequest('That ticket category does not belong to this event');
      const cat = catRows[0];

      const free = cat.available_seats - heldFor(event_id, cat.id, socket_id);
      if (free < quantity) {
        throw conflict(free <= 0 ? `${cat.name} tickets are sold out.` : `Only ${free} ${cat.name} ticket(s) left. Reduce the quantity and try again.`);
      }

      const [u1] = await conn.execute('UPDATE ticket_categories SET available_seats = available_seats - ? WHERE id = ? AND available_seats >= ?', [quantity, cat.id, quantity]);
      const [u2] = await conn.execute('UPDATE events SET available_seats = available_seats - ? WHERE id = ? AND available_seats >= ?', [quantity, event_id, quantity]);
      if (u1.affectedRows !== 1 || u2.affectedRows !== 1) throw conflict('Those seats were just taken. Please try again.');

      const cents = Math.round(parseFloat(cat.price) * 100) * quantity; // integer maths, no float drift
      const ticketCode = randomUUID();
      await conn.execute(
        `INSERT INTO bookings (event_id, category_id, name, email, mobile, quantity, total_amount, status, ticket_code, idempotency_key)
         VALUES (?,?,?,?,?,?,?,'confirmed',?,?)`,
        [event_id, cat.id, name, email, mobile, quantity, (cents / 100).toFixed(2), ticketCode, idempotency_key ?? null],
      );
      return ticketCode;
    });
    return { ticket: await getTicket(code), duplicate: false };
  } catch (err) {
    // Two identical requests raced: the loser hit the UNIQUE key and was rolled back. Return the winner's ticket.
    if (err.code === 'ER_DUP_ENTRY' && idempotency_key) {
      const [dup] = await pool.execute('SELECT ticket_code FROM bookings WHERE idempotency_key = ?', [idempotency_key]);
      if (dup.length) return { ticket: await getTicket(dup[0].ticket_code), duplicate: true };
    }
    throw err;
  }
}

export async function listBookings({ event_id, status, q }) {
  const where = [];
  const params = [];
  if (event_id) { where.push('b.event_id = ?'); params.push(event_id); }
  if (status) { where.push('b.status = ?'); params.push(status); }
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push('(b.name LIKE ? OR b.email LIKE ? OR b.mobile LIKE ? OR b.ticket_code LIKE ?)');
    params.push(like, like, like, like);
  }
  const [rows] = await pool.query(
    `SELECT b.id, b.event_id, b.category_id, b.name, b.email, b.mobile, b.quantity, b.total_amount, b.booking_date,
            b.status, b.ticket_code, b.checked_in_at, e.title AS event_title, c.name AS category_name
     FROM bookings b JOIN events e ON e.id = b.event_id JOIN ticket_categories c ON c.id = b.category_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY b.booking_date DESC, b.id DESC LIMIT 500`,
    params,
  );
  return rows;
}

/** Cancel a booking and give the seats back. Same lock order as createBooking (event, category, booking). */
export async function cancelBooking(id) {
  return withTransaction(async (conn) => {
    const [pre] = await conn.execute('SELECT event_id, category_id FROM bookings WHERE id = ?', [id]);
    if (!pre.length) throw notFound('Booking not found');
    await conn.execute('SELECT id FROM events WHERE id = ? FOR UPDATE', [pre[0].event_id]);
    await conn.execute('SELECT id FROM ticket_categories WHERE id = ? FOR UPDATE', [pre[0].category_id]);
    const [rows] = await conn.execute('SELECT id, event_id, category_id, quantity, status, ticket_code FROM bookings WHERE id = ? FOR UPDATE', [id]);
    const b = rows[0];
    if (b.status === 'cancelled') throw conflict('This booking is already cancelled');
    await conn.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);
    await conn.execute('UPDATE ticket_categories SET available_seats = LEAST(total_seats, available_seats + ?) WHERE id = ?', [b.quantity, b.category_id]);
    await conn.execute('UPDATE events SET available_seats = LEAST(total_seats, available_seats + ?) WHERE id = ?', [b.quantity, b.event_id]);
    return { id: b.id, event_id: b.event_id, status: 'cancelled', ticket_code: b.ticket_code };
  });
}
