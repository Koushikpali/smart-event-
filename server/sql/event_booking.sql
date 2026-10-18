-- =====================================================================
-- Smart Event Booking System - MySQL schema + demo data
-- Run:  mysql -u root -p < sql/event_booking.sql      (or: npm run db:init)
-- Works on MySQL 8.0.16+ and MariaDB 10.5+ (CHECK constraints are enforced).
--
-- [PDF]  = required by the assignment
-- [EXT]  = my extension (explained in README)
-- WARNING: this script DROPS and recreates the tables (clean demo reset).
-- =====================================================================
CREATE DATABASE IF NOT EXISTS event_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE event_booking;

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS ticket_categories;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS admins;

-- [PDF] events -------------------------------------------------------
CREATE TABLE events (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  title           VARCHAR(150)  NOT NULL,
  description     TEXT          NOT NULL,
  location        VARCHAR(255)  NOT NULL,
  `date`          DATETIME      NOT NULL,                 -- stored in UTC
  total_seats     INT           NOT NULL,
  available_seats INT           NOT NULL,
  price           DECIMAL(10,2) NOT NULL,                 -- [EXT] "from" price = cheapest category
  img             VARCHAR(500)  NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_events_date (`date`),
  INDEX idx_events_location (location),
  CONSTRAINT chk_events_seats CHECK (total_seats >= 0 AND available_seats >= 0 AND available_seats <= total_seats),
  CONSTRAINT chk_events_price CHECK (price >= 0)
) ENGINE=InnoDB;

-- [EXT] ticket_categories: PDF asks for "ticket categories with dynamic pricing"
-- but its schema only has one price per event. One event -> many categories.
CREATE TABLE ticket_categories (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  event_id        INT UNSIGNED  NOT NULL,
  name            VARCHAR(60)   NOT NULL,
  price           DECIMAL(10,2) NOT NULL,
  total_seats     INT           NOT NULL,
  available_seats INT           NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_category_name (event_id, name),
  CONSTRAINT fk_category_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT chk_cat_seats CHECK (total_seats > 0 AND available_seats >= 0 AND available_seats <= total_seats),
  CONSTRAINT chk_cat_price CHECK (price >= 0)
) ENGINE=InnoDB;

-- [PDF] bookings (+ [EXT] columns marked) -------------------------------
CREATE TABLE bookings (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  event_id        INT UNSIGNED  NOT NULL,
  category_id     INT UNSIGNED  NOT NULL,                 -- [EXT]
  name            VARCHAR(100)  NOT NULL,
  email           VARCHAR(150)  NOT NULL,
  mobile          VARCHAR(20)   NOT NULL,
  quantity        INT           NOT NULL,
  total_amount    DECIMAL(10,2) NOT NULL,
  booking_date    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status          ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  ticket_code     CHAR(36)      NOT NULL,                 -- [EXT] random UUID encoded in the QR
  checked_in_at   DATETIME      NULL,                     -- [EXT] set once at the gate (anti-reuse)
  idempotency_key VARCHAR(64)   NULL,                     -- [EXT] makes double-submits harmless
  PRIMARY KEY (id),
  UNIQUE KEY uq_ticket_code (ticket_code),
  UNIQUE KEY uq_idempotency (idempotency_key),
  INDEX idx_bookings_event (event_id),
  INDEX idx_bookings_email (email),
  CONSTRAINT fk_booking_event    FOREIGN KEY (event_id)    REFERENCES events(id)            ON DELETE RESTRICT,
  CONSTRAINT fk_booking_category FOREIGN KEY (category_id) REFERENCES ticket_categories(id) ON DELETE RESTRICT,
  CONSTRAINT chk_booking_qty CHECK (quantity > 0 AND quantity <= 10),
  CONSTRAINT chk_booking_amount CHECK (total_amount >= 0)
) ENGINE=InnoDB;

-- [EXT] admins (the first admin is created by the server from .env on startup)
CREATE TABLE admins (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Demo data (dates are relative to the day you run this script)
-- events.total_seats = sum of its categories' seats; events.price = cheapest category
-- ---------------------------------------------------------------------
INSERT INTO events (id, title, description, location, `date`, total_seats, available_seats, price, img) VALUES
(1, 'Neon Nights Music Festival',
 'Three stages, twelve acts and one long night. Electronic, indie and live bands from sunset to sunrise, with food trucks and a late-night chill zone. VIP gets a private viewing deck; Backstage includes an artist meet-and-greet.',
 'Jio World Garden, Mumbai', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 12 DAY), '18:00:00'), 500, 500, 1499.00,
 'https://picsum.photos/seed/neon-nights/1200/800'),
(2, 'Build Fast Hackathon 2026',
 '24 hours to ship something real. Bring a team (or find one on the day), pick a track, and demo to a panel of founders and engineers. Meals, mentors and caffeine included.',
 'Tech Park Convention Hall, Bengaluru', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 20 DAY), '09:00:00'), 250, 250, 299.00,
 'https://picsum.photos/seed/build-fast/1200/800'),
(3, 'Future of AI Summit',
 'A one-day summit on agents, retrieval, evaluation and shipping AI products. Talks from practitioners, a live build-off, and a hallway track that is actually useful.',
 'Bharat Mandapam, Delhi', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 28 DAY), '10:00:00'), 400, 400, 2499.00,
 'https://picsum.photos/seed/ai-summit/1200/800'),
(4, 'Sunset Jazz on the Terrace',
 'A quiet evening of live jazz above the beach. Three sets, small plates and cocktails. Lounge tickets include reserved sofa seating near the stage.',
 'Vagator Cliff Terrace, Goa', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 6 DAY), '17:30:00'), 100, 100, 999.00,
 'https://picsum.photos/seed/sunset-jazz/1200/800'),
(5, 'Startup Pitch Night',
 'Eight early-stage startups get five minutes each in front of investors and a live audience. Vote for the crowd favourite and stay for the networking hour.',
 'The Hive Coworking, Pune', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '18:30:00'), 120, 120, 199.00,
 'https://picsum.photos/seed/pitch-night/1200/800'),
(6, 'Design Systems Workshop',
 'A hands-on, full-day workshop on building and maintaining a design system: tokens, components, documentation and governance. Laptop required. Small group, so seats go fast.',
 'T-Hub Annex, Hyderabad', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 9 DAY), '10:00:00'), 40, 3, 1299.00,
 'https://picsum.photos/seed/design-systems/1200/800');

INSERT INTO ticket_categories (event_id, name, price, total_seats, available_seats) VALUES
(1, 'General',   1499.00, 350, 350),
(1, 'VIP',       3999.00, 120, 120),
(1, 'Backstage', 7999.00,  30,  30),
(2, 'Student',    299.00, 150, 150),
(2, 'Professional', 799.00, 100, 100),
(3, 'Standard',  2499.00, 300, 300),
(3, 'Premium',   5999.00, 100, 100),
(4, 'General',    999.00,  80,  80),
(4, 'Lounge',    2499.00,  20,  20),
(5, 'General',    199.00, 120, 120),
(6, 'Workshop seat', 1299.00, 40, 3);
