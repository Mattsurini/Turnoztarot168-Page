import { NextResponse } from "next/server";
import { getBooking, updateBooking } from "../../../../lib/queue-store";

export async function GET(_request, { params }) {
  const booking = await getBooking((await params).bookingCode);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ booking }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request, { params }) {
  try {
    const bookingCode = (await params).bookingCode;
    if (!(await getBooking(bookingCode))) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    const body = await request.json();
    const allowedStatuses = ["รอตรวจสอบ", "รับคิวแล้ว", "กำลังอ่าน", "ส่งผลแล้ว", "ปิดงาน", "พักคิว", "ยกเลิก"];
    if (body.status && !allowedStatuses.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    const booking = await updateBooking(bookingCode, body);
    return NextResponse.json({ booking });
  } catch (error) {
    console.error("queue PATCH failed", error);
    return NextResponse.json({ error: "Unable to update booking" }, { status: 500 });
  }
}
