import { NextResponse } from "next/server";
import { checkCallAvailability, createBooking, listBookings, markBookingNotificationSent, updateBookingNotification } from "../../../lib/queue-store";
import { isBangkokFutureSlot } from "../../../lib/call-slots";
import { notifyHanbiQueueCreated } from "../../../lib/hanbi-notify";
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
    let notification = { sent: false, skipped: true };
    try {
      await updateBookingNotification(booking, "sending");
      notification = await notifyHanbiQueueCreated(booking);
      if (notification.sent) {
        await markBookingNotificationSent(booking);
        booking.notificationSent = true;
        notification.outboxMarked = true;
      }
    } catch (notificationError) {
      await updateBookingNotification(booking, "failed").catch((stateError) => console.error("Unable to persist Hanbi failure state", stateError));
      console.error("Hanbi queue notification failed", notificationError);
      notification = { sent: false, skipped: false, reason: "Hanbi notification failed" };
    }
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
