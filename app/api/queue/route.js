import { NextResponse } from "next/server";
import { checkCallAvailability, createBooking, listBookings } from "../../../lib/queue-store";
import { isBangkokFutureSlot } from "../../../lib/call-slots";
import { notifyHanbiQueueCreated } from "../../../lib/hanbi-notify";

const required = ["packageName", "serviceMode", "displayName", "contact"];

function clean(value) { return typeof value === "string" ? value.trim() : ""; }

export async function GET(request) {
  if (process.env.VERCEL === "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const status = new URL(request.url).searchParams.get("status") || "";
  const items = await listBookings(status);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const input = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, key === "consent" ? Boolean(value) : clean(value)]));
    const missing = required.filter((key) => !input[key]);
    if (missing.length) return NextResponse.json({ error: `Missing fields: ${missing.join(", ")}` }, { status: 400 });
    if (!['call', 'async'].includes(input.serviceMode)) return NextResponse.json({ error: "Invalid service mode" }, { status: 400 });
    if (input.serviceMode === "async" && !input.question) return NextResponse.json({ error: "กรุณากรอกหัวข้อหรือคำถามที่ต้องการดู" }, { status: 400 });
    if (!input.consent) return NextResponse.json({ error: "Consent is required" }, { status: 400 });
    if (input.serviceMode === "call") {
      if (!input.appointmentDate || !input.appointmentTime) {
        return NextResponse.json({ error: "กรุณาเลือกวันและเวลาสำหรับ Call" }, { status: 400 });
      }
      if (!isBangkokFutureSlot(input.appointmentDate, input.appointmentTime)) {
        return NextResponse.json({ error: "กรุณาเลือกวันและเวลาในอนาคต" }, { status: 400 });
      }
      const availability = await checkCallAvailability(input);
      if (!availability.available) {
        return NextResponse.json({ error: "เวลานี้มีคิว Call แล้ว กรุณาเลือกเวลาใหม่", code: "CALL_SLOT_UNAVAILABLE" }, { status: 409 });
      }
      input.question = "ขอนัด Call";
    }
    const booking = await createBooking(input);
    let notification = { sent: false, skipped: true };
    try {
      notification = await notifyHanbiQueueCreated(booking);
    } catch (notificationError) {
      console.error("Hanbi queue notification failed", notificationError);
      notification = { sent: false, skipped: false, reason: "Hanbi notification failed" };
    }
    return NextResponse.json({ booking, notification }, { status: 201 });
  } catch (error) {
    if (error?.code === "CALL_SLOT_UNAVAILABLE") {
      return NextResponse.json({ error: "เวลานี้มีคิว Call แล้ว กรุณาเลือกเวลาใหม่", code: error.code }, { status: 409 });
    }
    console.error("queue POST failed", error);
    return NextResponse.json({ error: "Unable to save booking" }, { status: 500 });
  }
}
