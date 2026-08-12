import { json, queryReadingStatus, publicReadingStatus } from "../../../lib/notion";
import { getD1Status } from "../../../lib/d1-client";

export const runtime = "nodejs";

export async function GET(request) {
  const code = (request.nextUrl.searchParams.get("queueCode") || request.nextUrl.searchParams.get("bookingCode"))?.trim() || "";
  if (!code) return json({ error: "กรุณากรอกรหัสคิว" }, 400);
  if (!/^(?:BR-\d{4}|BR-\d{6}-[A-F0-9]{32}|BR-\d{6}-\d{3})$/.test(code)) {
    return json({ error: "รูปแบบรหัสคิวไม่ถูกต้อง" }, 400);
  }
  try {
    if (process.env.QUEUE_BACKEND === "d1") return json(await getD1Status(code));
    const page = await queryReadingStatus(code);
    if (!page) return json({ error: "ไม่พบ Booking Code นี้" }, 404);
    return json(publicReadingStatus(page));
  } catch {
    return json({ error: "ไม่สามารถตรวจสอบสถานะได้ในขณะนี้" }, 500);
  }
}
