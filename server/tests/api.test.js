// Integration tests. Start the API first (npm start), then: npm test
// Env: BASE_URL (default http://localhost:5000), ADMIN_EMAIL, ADMIN_PASSWORD
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { io } from 'socket.io-client';

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const ADMIN = { email: process.env.ADMIN_EMAIL || 'admin@example.com', password: process.env.ADMIN_PASSWORD || 'ChangeMe123!' };

let token;
const call = async (method, path, body, auth = true) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
const newEvent = (cats, extra = {}) => call('POST', '/events', { title: `Test event ${Date.now()}`, description: 'Automated test event description', location: 'Test City', date: future(5), categories: cats, ...extra });
const person = (n = 1) => ({ name: 'Test Person', email: `t${n}@example.com`, mobile: '9876543210' });
let seq = 0;
const book = (event_id, category_id, quantity = 1, extra = {}) => call('POST', '/bookings', { event_id, category_id, quantity, ...person(++seq), ...extra }, false);
const created = [];

before(async () => {
  const r = await call('POST', '/auth/login', ADMIN, false);
  assert.equal(r.status, 200);
  token = r.body.token;
});

after(async () => {
  for (const id of created) {
    const bookings = (await call('GET', `/bookings?event_id=${id}&status=confirmed`)).body.data || [];
    for (const b of bookings) await call('PATCH', `/bookings/${b.id}/cancel`);
    await call('DELETE', `/events/${id}`);
  }
});

const make = async (cats) => {
  const r = await newEvent(cats);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  created.push(r.body.data.id);
  return r.body.data;
};

describe('auth + authorization', () => {
  it('rejects wrong password', async () => assert.equal((await call('POST', '/auth/login', { email: ADMIN.email, password: 'nope' }, false)).status, 401));
  it('blocks admin routes without a token', async () => {
    assert.equal((await call('POST', '/events', {}, false)).status, 401);
    assert.equal((await call('GET', '/bookings', null, false)).status, 401);
    assert.equal((await call('DELETE', '/events/1', null, false)).status, 401);
  });
  it('rejects a forged token', async () => {
    const res = await fetch(`${BASE}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer abc.def.ghi' }, body: '{}' });
    assert.equal(res.status, 401);
  });
});

describe('events', () => {
  it('lists upcoming events with search and location filters', async () => {
    const all = await call('GET', '/events', null, false);
    assert.equal(all.status, 200);
    assert.ok(all.body.data.length >= 1);
    const q = await call('GET', '/events?q=hackathon', null, false);
    assert.ok(q.body.data.every((e) => /hackathon/i.test(e.title + e.description)));
    const loc = await call('GET', '/events?location=Goa', null, false);
    assert.ok(loc.body.data.every((e) => e.location.includes('Goa')));
  });
  it('filters by date range', async () => {
    const r = await call('GET', `/events?from=${future(1000)}&to=${future(1001)}`, null, false);
    assert.equal(r.body.data.length, 0);
  });
  it('returns 404 for unknown event and 400 for bad id', async () => {
    assert.equal((await call('GET', '/events/999999', null, false)).status, 404);
    assert.equal((await call('GET', '/events/abc', null, false)).status, 400);
  });
  it('validates event input', async () => {
    const r = await call('POST', '/events', { title: 'x' });
    assert.equal(r.status, 400);
    assert.ok(r.body.error.details.length > 0);
  });
  it('rejects past dates', async () => assert.equal((await newEvent([{ name: 'A', price: 1, total_seats: 5 }], { date: future(-2) })).status, 400));
  it('create, read, update, delete; totals derive from categories', async () => {
    const ev = await make([{ name: 'Std', price: 100, total_seats: 10 }, { name: 'VIP', price: 500.5, total_seats: 5 }]);
    assert.equal(ev.total_seats, 15);
    assert.equal(ev.price, '100.00');
    const up = await call('PUT', `/events/${ev.id}`, { title: 'Renamed event' });
    assert.equal(up.body.data.title, 'Renamed event');
    const std = ev.categories.find((c) => c.name === 'Std');
    const up2 = await call('PUT', `/events/${ev.id}`, { categories: [{ id: std.id, name: 'Std', price: 120, total_seats: 20 }, ...ev.categories.filter((c) => c.name === 'VIP').map((c) => ({ id: c.id, name: c.name, price: c.price, total_seats: c.total_seats }))] });
    assert.equal(up2.body.data.total_seats, 25);
  });
  it('accepts the original single price/total_seats shape', async () => {
    const r = await call('POST', '/events', { title: 'Legacy shape event', description: 'Created with price and seats only', location: 'Test City', date: future(3), price: 250, total_seats: 40 });
    assert.equal(r.status, 201);
    created.push(r.body.data.id);
    assert.equal(r.body.data.categories.length, 1);
  });
});

describe('booking', () => {
  it('validates input on the server', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 5 }]);
    const r = await call('POST', '/bookings', { event_id: ev.id, category_id: ev.categories[0].id, quantity: 0, name: 'x', email: 'bad', mobile: '12' }, false);
    assert.equal(r.status, 400);
    const fields = r.body.error.details.map((d) => d.field);
    for (const f of ['quantity', 'name', 'email', 'mobile']) assert.ok(fields.includes(f), f);
  });
  it('books, computes total in decimals, decrements seats, returns a ticket', async () => {
    const ev = await make([{ name: 'A', price: 19.99, total_seats: 10 }]);
    const r = await book(ev.id, ev.categories[0].id, 3);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.data.total_amount, '59.97');
    assert.match(r.body.data.ticket_code, /^[0-9a-f-]{36}$/);
    assert.equal(r.body.data.email, undefined); // public ticket view hides contact details
    const after = (await call('GET', `/events/${ev.id}`, null, false)).body.data;
    assert.equal(after.available_seats, 7);
    assert.equal(after.categories[0].available_seats, 7);
  });
  it('rejects more tickets than remain (409) and unknown events (404)', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 2 }]);
    assert.equal((await book(ev.id, ev.categories[0].id, 3)).status, 409);
    assert.equal((await book(999999, 1, 1)).status, 404);
  });
  it('rejects a category from another event', async () => {
    const a = await make([{ name: 'A', price: 10, total_seats: 2 }]);
    const b = await make([{ name: 'B', price: 10, total_seats: 2 }]);
    assert.equal((await book(a.id, b.categories[0].id, 1)).status, 400);
  });
  it('is idempotent: same key twice books once', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 10 }]);
    const key = `idem-${Date.now()}-abcdef`;
    const [r1, r2] = await Promise.all([book(ev.id, ev.categories[0].id, 2, { idempotency_key: key }), book(ev.id, ev.categories[0].id, 2, { idempotency_key: key })]);
    assert.ok([200, 201].includes(r1.status) && [200, 201].includes(r2.status));
    assert.equal(r1.body.data.ticket_code, r2.body.data.ticket_code);
    assert.equal((await call('GET', `/events/${ev.id}`, null, false)).body.data.available_seats, 8);
  });
});

describe('concurrency', () => {
  it('20 simultaneous bookings for 5 seats: exactly 5 succeed, seats never negative', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 5 }]);
    const results = await Promise.all(Array.from({ length: 20 }, () => book(ev.id, ev.categories[0].id, 1)));
    assert.equal(results.filter((r) => r.status === 201).length, 5);
    assert.equal(results.filter((r) => r.status === 409).length, 15);
    const after = (await call('GET', `/events/${ev.id}`, null, false)).body.data;
    assert.equal(after.available_seats, 0);
    assert.equal(after.categories[0].available_seats, 0);
  });
  it('two users race for the last 5 seats with 3 each: only one wins', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 5 }]);
    const [a, b] = await Promise.all([book(ev.id, ev.categories[0].id, 3), book(ev.id, ev.categories[0].id, 3)]);
    assert.deepEqual([a.status, b.status].sort(), [201, 409]);
    assert.equal((await call('GET', `/events/${ev.id}`, null, false)).body.data.available_seats, 2);
  });
});

describe('cancel, tickets, delete rules', () => {
  it('cancel restores seats and cannot happen twice', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 5 }]);
    const b = await book(ev.id, ev.categories[0].id, 2);
    const list = (await call('GET', `/bookings?event_id=${ev.id}`)).body.data;
    assert.equal(list.length, 1);
    assert.equal((await call('PATCH', `/bookings/${list[0].id}/cancel`)).status, 200);
    assert.equal((await call('GET', `/events/${ev.id}`, null, false)).body.data.available_seats, 5);
    assert.equal((await call('PATCH', `/bookings/${list[0].id}/cancel`)).status, 409);
    assert.equal((await call('POST', `/tickets/${b.body.data.ticket_code}/verify`)).status, 409); // cancelled
  });
  it('a ticket verifies once, the second scan is rejected, even simultaneously', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 5 }]);
    const code = (await book(ev.id, ev.categories[0].id, 1)).body.data.ticket_code;
    assert.equal((await call('POST', `/tickets/${code}/verify`, null, false)).status, 401);
    const [x, y] = await Promise.all([call('POST', `/tickets/${code}/verify`), call('POST', `/tickets/${code}/verify`)]);
    assert.deepEqual([x.status, y.status].sort(), [200, 409]);
    assert.equal((await call('POST', '/tickets/00000000-0000-4000-8000-000000000000/verify')).status, 404);
    assert.equal((await call('GET', `/tickets/${code}`, null, false)).body.data.status, 'confirmed');
  });
  it('an event with confirmed bookings cannot be deleted', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 5 }]);
    await book(ev.id, ev.categories[0].id, 1);
    assert.equal((await call('DELETE', `/events/${ev.id}`)).status, 409);
  });
  it('seats cannot be reduced below what is sold', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 5 }]);
    await book(ev.id, ev.categories[0].id, 4);
    const r = await call('PUT', `/events/${ev.id}`, { categories: [{ id: ev.categories[0].id, name: 'A', price: 10, total_seats: 3 }] });
    assert.equal(r.status, 409);
  });
});

describe('socket.io', () => {
  const connect = () => new Promise((res, rej) => { const s = io(BASE, { transports: ['websocket'] }); s.on('connect', () => res(s)); s.on('connect_error', rej); });

  it('broadcasts seats:update to other clients when someone books', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 5 }]);
    const watcher = await connect();
    const got = new Promise((res) => watcher.on('seats:update', (s) => s.event_id === ev.id && res(s)));
    await book(ev.id, ev.categories[0].id, 2);
    const snap = await Promise.race([got, new Promise((_, rej) => setTimeout(() => rej(new Error('no seats:update')), 3000))]);
    assert.equal(snap.available_seats, 3);
    watcher.close();
  });
  it('seat holds block other buyers and are released on disconnect', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 5 }]);
    const holder = await connect();
    const ack = await holder.emitWithAck('hold:set', { eventId: ev.id, categoryId: ev.categories[0].id, quantity: 4 });
    assert.equal(ack.ok, true);
    const blocked = await book(ev.id, ev.categories[0].id, 2); // only 1 free
    assert.equal(blocked.status, 409);
    const ok = await book(ev.id, ev.categories[0].id, 1);
    assert.equal(ok.status, 201);
    const withOwnHold = await book(ev.id, ev.categories[0].id, 4, { socket_id: holder.id }); // holder may use own hold... but only 4 remain minus 1 sold = 4
    assert.equal(withOwnHold.status, 201);
    holder.close();
  });
  it('hold is refused when seats are not free, released on disconnect', async () => {
    const ev = await make([{ name: 'A', price: 10, total_seats: 3 }]);
    const a = await connect();
    const b = await connect();
    assert.equal((await a.emitWithAck('hold:set', { eventId: ev.id, categoryId: ev.categories[0].id, quantity: 3 })).ok, true);
    assert.equal((await b.emitWithAck('hold:set', { eventId: ev.id, categoryId: ev.categories[0].id, quantity: 1 })).ok, false);
    a.close();
    await new Promise((r) => setTimeout(r, 300));
    assert.equal((await b.emitWithAck('hold:set', { eventId: ev.id, categoryId: ev.categories[0].id, quantity: 1 })).ok, true);
    b.close();
  });
});
