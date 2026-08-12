const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const cors = { "access-control-allow-origin": "https://boom-reading.vercel.app", "access-control-allow-methods": "GET,POST,PATCH,OPTIONS", "access-control-allow-headers": "content-type" };
const iso = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const bookingCode = () => `BR-${new Date().toISOString().slice(2,10).replaceAll('-', '')}-${crypto.randomUUID().replaceAll('-', '').toUpperCase()}`;
const queueCode = (n) => n == null ? null : `BR-${String(n).padStart(4, '0')}`;
const allowedStatuses = ['รอตรวจสอบ','รับคิวแล้ว','กำลังอ่าน','ส่งผลแล้ว','ปิดงาน','พักคิว','ยกเลิก'];

async function createBooking(request, env) {
  const input = await request.json();
  const required = ['packageId','packageName','packageKind','displayName','contact','question'];
  if (required.some((key) => typeof input[key] !== 'string' || !input[key].trim()) || input.consent !== true)
    return json({ error: 'ข้อมูลจองไม่ครบหรือยังไม่ยอมรับข้อตกลง' }, 400, cors);

  const serviceMode = input.serviceMode === 'call' ? 'call' : 'async';
  const now = iso(); const rowId = id(); const code = bookingCode(); let number = null;

  try {
    if (serviceMode === 'async') {
      await env.DB.prepare("UPDATE queue_counter SET value = value + 1 WHERE name = 'async'").run();
      number = (await env.DB.prepare("SELECT value FROM queue_counter WHERE name = 'async'").first()).value;
    }
    await env.DB.prepare(`INSERT INTO bookings (id,booking_code,queue_number,package_id,package_name,package_price,package_kind,service_mode,display_name,contact,question,delivery_type,addons,appointment_date,appointment_time,estimated_delivery_date,status,consent,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(rowId, code, number, input.packageId, input.packageName, Number(input.packagePrice || 0), input.packageKind, serviceMode, input.displayName, input.contact, input.question, input.deliveryType || 'ข้อความ', input.addons || '', input.appointmentDate || null, input.appointmentTime || null, input.estimatedDeliveryDate || null, 'รอตรวจสอบ', 1, now, now).run();
    await env.DB.prepare(`INSERT INTO notification_outbox (id,booking_id,state,created_at,updated_at) VALUES (?,?, 'pending', ?, ?)`)
      .bind(id(), rowId, now, now).run();
    return json({ booking: { queueCode: queueCode(number), packageName: input.packageName, packagePrice: Number(input.packagePrice || 0), serviceMode, status: 'รอตรวจสอบ', appointmentDate: input.appointmentDate || null, appointmentTime: input.appointmentTime || null, estimatedDeliveryDate: input.estimatedDeliveryDate || null }, notification: { sent: false, queued: true, channel: 'd1-outbox' } }, 201, cors);
  } catch (error) {
    return json({ error: 'บันทึกคิวไม่สำเร็จ', detail: String(error.message || error) }, 500, cors);
  }
}

async function status(request, env) {
  const match = /^BR-(\d{4})$/.exec(new URL(request.url).searchParams.get('queueCode') || '');
  if (!match) return json({ error: 'รูปแบบรหัสคิวไม่ถูกต้อง' }, 400, cors);
  const row = await env.DB.prepare(`SELECT queue_number AS queueNumber, package_name AS packageName, service_mode AS serviceMode, status, queue_accepted_date AS queueAcceptedDate, estimated_delivery_date AS deliveryDate, updated_at AS lastUpdated, public_note AS publicNote FROM bookings WHERE queue_number = ? LIMIT 1`).bind(Number(match[1])).first();
  return row ? json({ ...row, queueCode: queueCode(row.queueNumber) }, 200, cors) : json({ error: 'ไม่พบรหัสคิวนี้' }, 404, cors);
}

async function list(request, env) {
  const statusFilter = new URL(request.url).searchParams.get('status') || '';
  const query = statusFilter ? 'SELECT * FROM bookings WHERE status = ? ORDER BY created_at DESC' : 'SELECT * FROM bookings ORDER BY created_at DESC';
  const result = await env.DB.prepare(query).bind(...(statusFilter ? [statusFilter] : [])).all();
  return json({ items: result.results.map((row) => ({ id: row.id, bookingCode: row.booking_code, queueNumber: row.queue_number, queueCode: queueCode(row.queue_number), packageName: row.package_name, packagePrice: row.package_price, serviceMode: row.service_mode, displayName: row.display_name, contact: row.contact, question: row.question, appointmentDate: row.appointment_date, appointmentTime: row.appointment_time, estimatedDeliveryDate: row.estimated_delivery_date, status: row.status, publicNote: row.public_note, createdAt: row.created_at, updatedAt: row.updated_at })) }, 200, cors);
}

async function update(request, env) {
  const code = decodeURIComponent(new URL(request.url).pathname.split('/').pop() || ''); const input = await request.json();
  if (!allowedStatuses.includes(input.status)) return json({ error: 'สถานะไม่ถูกต้อง' }, 400, cors);
  const result = await env.DB.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE booking_code = ?').bind(input.status, iso(), code).run();
  return result.meta.changes ? json({ ok: true }, 200, cors) : json({ error: 'ไม่พบรายการคิว' }, 404, cors);
}

export default { async fetch(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try { const path = new URL(request.url).pathname;
    if (path === '/health') return json({ status: 'ok', backend: 'd1' }, 200, cors);
    if (path === '/api/queue' && request.method === 'POST') return createBooking(request, env);
    if (path === '/api/queue' && request.method === 'GET') return list(request, env);
    if (path.startsWith('/api/queue/') && request.method === 'PATCH') return update(request, env);
    if ((path === '/api/reading-status' || path === '/api/status') && request.method === 'GET') return status(request, env);
    return json({ error: 'Not found' }, 404, cors);
  } catch (error) { return json({ error: 'Worker error' }, 500, cors); }
} };
