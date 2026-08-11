import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { callSlotsOverlap } from "./call-slots";
import { estimatedDeliveryDate } from "./delivery-rules";

const dbPath = process.env.QUEUE_DB_PATH || path.join(process.cwd(), "data", "reading-queue.sqlite");
let db;

function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new DatabaseSync(dbPath);
    db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_code TEXT NOT NULL UNIQUE,
        package_name TEXT NOT NULL,
        service_mode TEXT NOT NULL CHECK (service_mode IN ('call', 'async')),
        display_name TEXT NOT NULL,
        contact TEXT NOT NULL,
        question TEXT NOT NULL,
        delivery_type TEXT NOT NULL,
        addons TEXT,
        appointment_date TEXT,
        appointment_time TEXT,
        queue_number INTEGER,
        queue_accepted_date TEXT,
        estimated_delivery_date TEXT,
        delivered_date TEXT,
        status TEXT NOT NULL DEFAULT 'รอตรวจสอบ',
        public_note TEXT,
        internal_note TEXT,
        consent INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
    `);
  }
  return db;
}

function now() { return new Date().toISOString(); }
function code() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `BR-${date}-${Math.floor(100 + Math.random() * 900)}`;
}
function nextQueueNumber(database) {
  return database.prepare("SELECT COALESCE(MAX(queue_number), 0) + 1 AS next FROM bookings WHERE service_mode = 'async'").get().next;
}
function rowToBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    bookingCode: row.booking_code,
    packageName: row.package_name,
    serviceMode: row.service_mode,
    displayName: row.display_name,
    contact: row.contact,
    question: row.question,
    deliveryType: row.delivery_type,
    addons: row.addons || "",
    appointmentDate: row.appointment_date || null,
    appointmentTime: row.appointment_time || null,
    queueNumber: row.queue_number,
    queueAcceptedDate: row.queue_accepted_date || null,
    estimatedDeliveryDate: row.estimated_delivery_date || null,
    deliveredDate: row.delivered_date || null,
    status: row.status,
    publicNote: row.public_note || "",
    internalNote: row.internal_note || "",
    consent: Boolean(row.consent),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createBooking(input) {
  const database = getDb();
  const created = now();
  const serviceMode = input.serviceMode;
  const queueNumber = serviceMode === "async" ? nextQueueNumber(database) : null;
  const bookingCode = code();
  const queueAcceptedDate = null;
  const deliveryDate = serviceMode === "async" ? (input.estimatedDeliveryDate || estimatedDeliveryDate(input, created)) : null;
  database.prepare(`
    INSERT INTO bookings (
      booking_code, package_name, service_mode, display_name, contact, question,
      delivery_type, addons, appointment_date, appointment_time, queue_number,
      queue_accepted_date, estimated_delivery_date, status, consent, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    bookingCode, input.packageName, serviceMode, input.displayName, input.contact,
    input.question, input.deliveryType || "", input.addons || null,
    serviceMode === "call" ? input.appointmentDate : null,
    serviceMode === "call" ? input.appointmentTime : null,
    queueNumber, queueAcceptedDate, deliveryDate, "รอตรวจสอบ", 1, created, created,
  );
  return rowToBooking(database.prepare("SELECT * FROM bookings WHERE booking_code = ?").get(bookingCode));
}

export function checkLocalCallAvailability(requested) {
  const rows = getDb().prepare("SELECT * FROM bookings WHERE service_mode = 'call' AND appointment_date = ? AND status != 'ยกเลิก'").all(requested.appointmentDate);
  const conflict = rows.map(rowToBooking).find((booking) => callSlotsOverlap(booking, requested));
  return { available: !conflict, conflict: conflict ? { appointmentDate: conflict.appointmentDate, appointmentTime: conflict.appointmentTime, packageName: conflict.packageName } : null };
}

export function listBookings(status = "") {
  const database = getDb();
  const rows = status
    ? database.prepare("SELECT * FROM bookings WHERE status = ? ORDER BY created_at DESC").all(status)
    : database.prepare("SELECT * FROM bookings ORDER BY created_at DESC").all();
  return rows.map(rowToBooking);
}

export function getBooking(bookingCode) {
  return rowToBooking(getDb().prepare("SELECT * FROM bookings WHERE booking_code = ?").get(bookingCode));
}

export function updateBooking(bookingCode, input) {
  const database = getDb();
  const allowed = ["status", "queueAcceptedDate", "estimatedDeliveryDate", "deliveredDate", "publicNote", "internalNote", "appointmentDate", "appointmentTime"];
  const fields = [];
  const values = [];
  const columns = {
    status: "status", queueAcceptedDate: "queue_accepted_date", estimatedDeliveryDate: "estimated_delivery_date",
    deliveredDate: "delivered_date", publicNote: "public_note", internalNote: "internal_note",
    appointmentDate: "appointment_date", appointmentTime: "appointment_time",
  };
  for (const key of allowed) {
    if (Object.hasOwn(input, key)) { fields.push(`${columns[key]} = ?`); values.push(input[key] || null); }
  }
  if (!fields.length) return getBooking(bookingCode);
  fields.push("updated_at = ?"); values.push(now(), bookingCode);
  database.prepare(`UPDATE bookings SET ${fields.join(", ")} WHERE booking_code = ?`).run(...values);
  return getBooking(bookingCode);
}

export { dbPath };
