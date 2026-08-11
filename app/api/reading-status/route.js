import { json, queryReadingStatus, publicReadingStatus } from "../../../lib/notion";

export const runtime = "nodejs";

export async function GET(request) {
  const code = request.nextUrl.searchParams.get("bookingCode")?.trim() || "";
  if (!code) return json({ error: "กรุณากรอก Booking Code" }, 400);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(code)) {
    return json({ error: "รูปแบบ Booking Code ไม่ถูกต้อง" }, 400);
  }
  try {
    const page = await queryReadingStatus(code);
    if (!page) return json({ error: "ไม่พบ Booking Code นี้" }, 404);
    return json(publicReadingStatus(page));
  } catch {
    return json({ error: "ไม่สามารถตรวจสอบสถานะได้ในขณะนี้" }, 500);
  }
}
