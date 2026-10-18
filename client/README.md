# SmartEvents: client (React + Vite + Tailwind + Framer Motion + Socket.IO)

## Run
```bash
npm install
cp .env.example .env     # set VITE_API_URL to your Express server
npm run dev              # http://localhost:5173
npm run build            # production build in dist/
```

## Structure
```
src/
  socket/      modular Socket.IO layer
    events.js    event-name constants (must match the server)
    client.js    getSocket(), onConnectionChange(), getSocketId()
    seats.js     subscribeSeatUpdates(), subscribeEventsChanged(), requestHold(), releaseHold(), mergeSeats()
    index.js     re-exports
  hooks/       useLiveEvents, useLiveEvent (REST + live seats), useSeatHold (checkout seat lock), useDebounce
  lib/         api.js (axios services), format.js, ticketImage.js (QR + PNG ticket), confetti.js
  components/  Navbar, EventCard (ticket-stub), SeatMeter, Countdown, Faq, ui.jsx, admin/*
  pages/       Landing, Events, EventDetails, Checkout, TicketPage, AdminLogin, AdminDashboard
```

## Server contract this client expects
Errors: `{ "error": { "message": "...", "details": [{ "field": "email", "message": "..." }] } }`

| Method | Path | Notes |
|---|---|---|
| GET | `/events` | query: `q, location, from, to (ISO), include_past, page, limit` -> `{ data:[event], meta:{total,page,limit} }` |
| GET | `/events/locations` | `{ data:[string] }` |
| GET | `/events/:id` | `{ data: event + categories:[{id,name,price,total_seats,available_seats,held_seats}] }` |
| POST/PUT/DELETE | `/events`, `/events/:id` | admin (Bearer JWT). Body has `categories[]` |
| POST | `/bookings` | body: `event_id, category_id, name, email, mobile, quantity, socket_id, idempotency_key` -> `{ data:{ ticket_code, ... } }` (409 when seats are gone) |
| GET | `/bookings` | admin; rows include `event_title, category_name` |
| PATCH | `/bookings/:id/cancel` | admin |
| GET | `/tickets/:code` | `{ data:{ ticket_code,status,checked_in_at,name,quantity,total_amount,booking_date,event_title,location,event_date,category_name } }` |
| POST | `/tickets/:code/verify` | admin; 409 if cancelled or already used |
| POST | `/auth/login` | `{ token }` |

Event rows also carry `tickets_sold` and `revenue` (admin table).

## Socket.IO contract
Server -> all: `seats:update` `{ event_id, available_seats, held_seats, categories:[{id,available_seats,held_seats}] }`, `events:changed`
Client -> server: `hold:set` `{eventId,categoryId,quantity}` (ack `{ok, expiresAt(ms), message}`), `hold:release`
Server -> one client: `hold:expired`

## Landing page vs the Summitra reference
Same section flow (hero, about + countdown, media band, content grid, pricing tiers, FAQ, CTA, footer), with its own look: ticket-stub cards, parallax stubs in the hero, live data instead of static copy.
