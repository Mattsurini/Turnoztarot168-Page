const WORKER_URL = process.env.D1_WORKER_URL || "https://boom-reading-queue.bannarat-par.workers.dev";

async function request(path, options = {}) {
  const response = await fetch(`${WORKER_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `D1 Worker failed: ${response.status}`);
    error.code = body.code;
    error.status = response.status;
    throw error;
  }
  return body;
}

export function createD1Booking(input) {
  return request("/api/queue", { method: "POST", body: JSON.stringify(input) }).then((body) => ({
    ...body.booking,
    notificationStatus: "pending",
    notificationSent: false,
  }));
}
export function listD1Bookings(status = "") { return request(`/api/queue${status ? `?status=${encodeURIComponent(status)}` : ""}`).then((body) => body.items); }
export function updateD1Booking(bookingCode, input) { return request(`/api/queue/${encodeURIComponent(bookingCode)}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function getD1Status(queueCode) { return request(`/api/reading-status?queueCode=${encodeURIComponent(queueCode)}`); }
