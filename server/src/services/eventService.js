import { pool, withTransaction } from '../config/db.js';
import { badRequest, conflict, notFound } from '../utils/HttpError.js';
import { heldByCategory } from '../sockets/holds.js';

const EVENT_COLUMNS = `e.id, e.title, e.description, e.location, e.\`date\`, e.total_seats, e.available_seats,
  e.price, e.img, e.created_at,
  (SELECT COALESCE(SUM(b.quantity),0) FROM bookings b WHERE b.event_id = e.id AND b.status='confirmed') AS tickets_sold,
  (SELECT COALESCE(SUM(b.total_amount),0) FROM bookings b WHERE b.event_id = e.id AND b.status='confirmed') AS revenue`;

const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listEvents(f) {
  const where = [];
  const params = [];
  if (f.include_past !== 'true') where.push('e.`date` >= UTC_TIMESTAMP()');
  if (f.q) {
    const like = `%${likeEscape(f.q)}%`;
    where.push('(e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)');
    params.push(like, like, like);
  }
  if (f.location) { where.push('e.location LIKE ?'); params.push(`%${likeEscape(f.location)}%`); }
  if (f.from) { where.push('e.`date` >= ?'); params.push(f.from); }
  if (f.to) { where.push('e.`date` <= ?'); params.push(f.to); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (f.page - 1) * f.limit;

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM events e ${clause}`, params);
  const [rows] = await pool.query(
    `SELECT ${EVENT_COLUMNS} FROM events e ${clause} ORDER BY e.\`date\` ASC, e.id ASC LIMIT ? OFFSET ?`,
    [...params, f.limit, offset],
  );
  return { data: rows.map(withHeld), meta: { total, page: f.page, limit: f.limit } };
}

export async function listLocations() {
  const [rows] = await pool.execute(
    'SELECT DISTINCT location FROM events WHERE `date` >= UTC_TIMESTAMP() ORDER BY location',
  );
  return rows.map((r) => r.location);
}

export async function getEvent(id, conn = pool) {
  const [rows] = await conn.execute(`SELECT ${EVENT_COLUMNS} FROM events e WHERE e.id = ?`, [id]);
  if (!rows.length) throw notFound('Event not found');
  const [categories] = await conn.execute(
    'SELECT id, event_id, name, price, total_seats, available_seats FROM ticket_categories WHERE event_id = ? ORDER BY price ASC, id ASC',
    [id],
  );
  return withHeld({ ...rows[0], categories });
}

function withHeld(event) {
  const held = heldByCategory(event.id);
  const total = Object.values(held).reduce((a, b) => a + b, 0);
  return {
    ...event,
    held_seats: total,
    ...(event.categories ? { categories: event.categories.map((c) => ({ ...c, held_seats: held[c.id] || 0 })) } : {}),
  };
}

/** Lightweight payload broadcast over Socket.IO after any seat change. */
export async function getSeatSnapshot(eventId) {
  const [ev] = await pool.execute('SELECT id, available_seats, total_seats FROM events WHERE id = ?', [eventId]);
  if (!ev.length) return null;
  const [cats] = await pool.execute('SELECT id, available_seats FROM ticket_categories WHERE event_id = ?', [eventId]);
  const held = heldByCategory(eventId);
  return {
    event_id: eventId,
    available_seats: ev[0].available_seats,
    total_seats: ev[0].total_seats,
    held_seats: Object.values(held).reduce((a, b) => a + b, 0),
    categories: cats.map((c) => ({ id: c.id, available_seats: c.available_seats, held_seats: held[c.id] || 0 })),
  };
}

function normaliseCategories(body) {
  if (body.categories?.length) return body.categories;
  return [{ name: 'General', price: body.price, total_seats: body.total_seats }];
}

async function recomputeEventTotals(conn, eventId) {
  const [[t]] = await conn.execute(
    'SELECT COALESCE(SUM(total_seats),0) AS total, COALESCE(SUM(available_seats),0) AS available, MIN(price) AS price FROM ticket_categories WHERE event_id = ?',
    [eventId],
  );
  await conn.execute('UPDATE events SET total_seats = ?, available_seats = ?, price = ? WHERE id = ?', [
    t.total, t.available, t.price ?? 0, eventId,
  ]);
}

export async function createEvent(body) {
  if (body.date.getTime() <= Date.now()) throw badRequest('Event date must be in the future');
  const cats = normaliseCategories(body);
  const names = new Set(cats.map((c) => c.name.toLowerCase()));
  if (names.size !== cats.length) throw badRequest('Ticket category names must be unique');

  const id = await withTransaction(async (conn) => {
    const [r] = await conn.execute(
      'INSERT INTO events (title, description, location, `date`, total_seats, available_seats, price, img) VALUES (?,?,?,?,0,0,0,?)',
      [body.title, body.description, body.location, body.date, body.img || null],
    );
    for (const c of cats) {
      await conn.execute(
        'INSERT INTO ticket_categories (event_id, name, price, total_seats, available_seats) VALUES (?,?,?,?,?)',
        [r.insertId, c.name, c.price, c.total_seats, c.total_seats],
      );
    }
    await recomputeEventTotals(conn, r.insertId);
    return r.insertId;
  });
  return getEvent(id);
}

export async function updateEvent(id, body) {
  await withTransaction(async (conn) => {
    const [evRows] = await conn.execute('SELECT id FROM events WHERE id = ? FOR UPDATE', [id]);
    if (!evRows.length) throw notFound('Event not found');
    const [existing] = await conn.execute(
      'SELECT id, name, price, total_seats, available_seats FROM ticket_categories WHERE event_id = ? FOR UPDATE',
      [id],
    );

    // PDF-style update (price/total_seats without categories) only makes sense for single-category events.
    let cats = body.categories;
    if (!cats && (body.price !== undefined || body.total_seats !== undefined)) {
      if (existing.length !== 1) throw badRequest('This event has several ticket categories; send categories[] instead of price/total_seats');
      cats = [{ id: existing[0].id, name: existing[0].name, price: body.price ?? existing[0].price, total_seats: body.total_seats ?? existing[0].total_seats }];
    }

    const fields = [];
    const values = [];
    for (const key of ['title', 'description', 'location', 'date']) {
      if (body[key] !== undefined) { fields.push(`\`${key}\` = ?`); values.push(body[key]); }
    }
    if (body.img !== undefined) { fields.push('img = ?'); values.push(body.img || null); }
    if (fields.length) await conn.execute(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);

    if (cats) {
      const names = new Set(cats.map((c) => c.name.toLowerCase()));
      if (names.size !== cats.length) throw badRequest('Ticket category names must be unique');
      const byId = new Map(existing.map((c) => [c.id, c]));
      const keep = new Set();

      for (const c of cats) {
        if (c.id) {
          const row = byId.get(c.id);
          if (!row) throw badRequest(`Category ${c.id} does not belong to this event`);
          const sold = row.total_seats - row.available_seats;
          if (c.total_seats < sold) throw conflict(`"${row.name}" already has ${sold} seats sold; total cannot go below that`);
          keep.add(c.id);
          await conn.execute(
            'UPDATE ticket_categories SET name = ?, price = ?, total_seats = ?, available_seats = ? WHERE id = ?',
            [c.name, c.price, c.total_seats, c.total_seats - sold, c.id],
          );
        } else {
          await conn.execute(
            'INSERT INTO ticket_categories (event_id, name, price, total_seats, available_seats) VALUES (?,?,?,?,?)',
            [id, c.name, c.price, c.total_seats, c.total_seats],
          );
        }
      }
      for (const row of existing) {
        if (keep.has(row.id)) continue;
        const [[{ n }]] = await conn.execute('SELECT COUNT(*) AS n FROM bookings WHERE category_id = ?', [row.id]);
        if (n > 0) throw conflict(`"${row.name}" has bookings and cannot be removed`);
        await conn.execute('DELETE FROM ticket_categories WHERE id = ?', [row.id]);
      }
      await recomputeEventTotals(conn, id);
    }
  });
  return getEvent(id);
}

export async function deleteEvent(id) {
  await withTransaction(async (conn) => {
    const [ev] = await conn.execute('SELECT id FROM events WHERE id = ? FOR UPDATE', [id]);
    if (!ev.length) throw notFound('Event not found');
    const [[{ n }]] = await conn.execute(
      "SELECT COUNT(*) AS n FROM bookings WHERE event_id = ? AND status = 'confirmed'", [id],
    );
    if (n > 0) throw conflict(`This event has ${n} confirmed booking(s). Cancel them first, then delete the event.`);
    await conn.execute('DELETE FROM bookings WHERE event_id = ?', [id]); // only cancelled ones remain
    await conn.execute('DELETE FROM events WHERE id = ?', [id]); // categories cascade
  });
}
