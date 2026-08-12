-- Boom Reading D1 schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS queue_counter (
  name TEXT PRIMARY KEY NOT NULL,
  value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0)
);
INSERT OR IGNORE INTO queue_counter (name, value) VALUES ('async', 0);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY NOT NULL,
  booking_code TEXT NOT NULL UNIQUE,
  queue_number INTEGER UNIQUE,
  package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  package_price REAL NOT NULL,
  package_kind TEXT NOT NULL,
  service_mode TEXT NOT NULL CHECK (service_mode IN ('async', 'call')),
  display_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  question TEXT NOT NULL,
  delivery_type TEXT NOT NULL,
  addons TEXT NOT NULL DEFAULT '',
  appointment_date TEXT,
  appointment_time TEXT,
  queue_accepted_date TEXT,
  estimated_delivery_date TEXT,
  delivered_date TEXT,
  status TEXT NOT NULL DEFAULT 'รอตรวจสอบ',
  public_note TEXT NOT NULL DEFAULT '',
  internal_note TEXT NOT NULL DEFAULT '',
  consent INTEGER NOT NULL CHECK (consent = 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_queue_number ON bookings(queue_number);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings(status, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_call_slot ON bookings(service_mode, appointment_date, appointment_time);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sending', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  lease_until TEXT,
  sent_at TEXT,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_delivery ON notification_outbox(state, lease_until, created_at);
