import { NextResponse } from "next/server";
import { checkCallAvailability, createBooking, listBookings } from "../../../lib/queue-store";
import { createD1Booking } from "../../../lib/d1-client";
import { isBangkokFutureSlot } from "../../../lib/call-slots";

import { resolveCatalogPackage } from "../../../lib/notion";
import { validateBookingInput } from "../../../lib/booking-validation";
import { publicBookingConfirmation } from "../../../lib/public-status";

export async function GET(request) {
  const status = new URL(request.url).searchParams.get("status") || "";
  const items = await listBookings(status);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (process.env.QUEUE_BACKEND === "d1") {
      const booking = await createD1Booking(body);
      return NextResponse.json({ booking: publicBookingConfirmation(booking), notification: { sent: false, queued: true, channel: "d1-outbox" } }, { status: 201 });
    }
    const catalogEntry = await resolveCatalogPackage(body?.packageName, body?.packageKind, body?.packageId);
    const input = validateBookingInput(body, catalogEntry);
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
    const notification = { sent: false, queued: true, channel: "hanbi-outbox" };
    return NextResponse.json({ booking: publicBookingConfirmation(booking), notification }, { status: 201 });
  } catch (error) {
    if (error?.code === "INVALID_BOOKING") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.code === "CALL_SLOT_UNAVAILABLE") {
      return NextResponse.json({ error: "เวลานี้มีคิว Call แล้ว กรุณาเลือกเวลาใหม่", code: error.code }, { status: 409 });
    }
    console.error("queue POST failed", error);
    return NextResponse.json({ error: "Unable to save booking" }, { status: 500 });
  }
}
