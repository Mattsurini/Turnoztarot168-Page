const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const cors = { "access-control-allow-origin": "https://boom-reading.vercel.app", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" };
const iso = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const code = () => `BR-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${crypto.randomUUID().replaceAll('-','').toUpperCase()}`;
const queueCode = n => n == null ? null : `BR-${String(n).padStart(4, '0')}`;

async function createBooking(request, env) {
  const input = await request.json();
  const required = ['packageId','packageName','packageKind','displayName','contact','question'];
  if (required.some(k => typeof input[k] !== 'string' || !input[k].trim()) || input.consent !== true) return json({ error: 'ข้อมูลจองไม่ครบหรือยังไม่ยอมรับข้อตกลง' }, 400, cors);
  const serviceMode = input.packageKind === 'call' ? 'call' : 'async';
  const now = iso(); const bookingId = id(); const bookingCode = code();
  let queueNumber = null;
  try {
    if (serviceMode === 'async') {
      await env.DB.prepare("UPDATE queue_counter SET value = value + 1 WHERE name = 'async'").run();
      queueNumber = (await env.DB.prepare("SELECT value FROM queue_counter WHERE name = 'async'").first()).value;
    }
    await env.DB.prepare(`INSERT INTO bookings (id,booking_code,queue_number,package_id,package_name,package_price,package_kind,service_mode,display_name,contact,question,delivery_type,addons,appointment_date,appointment_time,estimated_delivery_date,status,consent,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(bookingId,bookingCode,queueNumber,input.packageId,input.packageName,Number(input.packagePrice || 0),input.packageKind,serviceMode,input.displayName,input.contact,input.question,input.deliveryType || 'ข้อความ',input.addons || '',input.appointmentDate || null,input.appointmentTime || null,input.estimatedDeliveryDate || null,'รอตรวจสอบ',1,now,now).run();
    await env.DB.prepare(`INSERT INTO notification_outbox (id,booking_id,state,created_at,updated_at) VALUES (?,?, 'pending', ?, ?)`).bind(id(), bookingId, now, now).run();
    return json({ booking: { queueCode: queueCode(queueNumber), packageName: input.packageName, packagePrice: Number(input.packagePrice || 0), serviceMode, status: 'รอตรวจสอบ', appointmentDate: input.appointmentDate || null, appointmentTime: input.appointmentTime || null, estimatedDeliveryDate: input.estimatedDeliveryDate || null }, notification: { sent: false, queued: true, channel: 'd1-outbox' } }, 201, cors);
  } catch (error) { return json({ error: 'บันทึกคิวไม่สำเร็จ', detail: String(error.message || error) }, 500, cors); }
}
async function status(request, env) {
  const q = new URL(request.url).searchParams.get('queueCode') || '';
  const n = /^BR-(\d{4})$/.exec(q);
  if (!n) return json({ error: 'รูปแบบรหัสคิวไม่ถูกต้อง' }, 400, cors);
  const row = await env.DB.prepare(`SELECT queue_number AS queueNumber, package_name AS packageName, service_mode AS serviceMode, status, queue_accepted_date AS queueAcceptedDate, estimated_delivery_date AS deliveryDate, updated_at AS lastUpdated, public_note AS publicNote FROM bookings WHERE queue_number = ? LIMIT 1`).bind(Number(n[1])).first();
  if (!row) return json({ error: 'ไม่พบรหัสคิวนี้' }, 404, cors);
  return json({ ...row, queueCode: queueCode(row.queueNumber) }, 200, cors);
}
export default { async fetch(request, env) { if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors }); try { const url = new URL(request.url); if (url.pathname === '/health') return json({ status: 'ok', backend: 'd1' }, 200, cors); if (url.pathname === '/api/queue' && request.method === 'POST') return createBooking(request, env); if (url.pathname === '/api/reading-status' && request.method === 'GET') return status(request, env); if (url.pathname === '/api/status' && request.method === 'GET') return status(request, env); return json({ error: 'Not found' }, 404, cors); } catch (error) { return json({ error: 'Worker error' }, 500, cors); } } };
