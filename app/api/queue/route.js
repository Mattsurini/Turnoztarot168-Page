import { NextResponse } from "next/server";
import { createBooking, listBookings } from "../../../lib/queue-store";
import { notifyHanbiQueueCreated } from "../../../lib/hanbi-notify";

const required = ["packageName", "serviceMode", "displayName", "contact", "question"];

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
    if (!input.consent) return NextResponse.json({ error: "Consent is required" }, { status: 400 });
    if (input.serviceMode === "call" && (!input.appointmentDate || !input.appointmentTime)) {
      return NextResponse.json({ error: "Call requires appointment date and time" }, { status: 400 });
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
    console.error("queue POST failed", error);
    return NextResponse.json({ error: "Unable to save booking" }, { status: 500 });
  }
}
