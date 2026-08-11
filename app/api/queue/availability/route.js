import { NextResponse } from "next/server";
import { checkCallAvailability } from "../../../../lib/queue-store";
import { callDurationMinutes, isBangkokFutureSlot } from "../../../../lib/call-slots";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const appointmentDate = clean(params.get("date"));
    const appointmentTime = clean(params.get("time"));
    const packageName = clean(params.get("package"));
    if (!appointmentDate || !appointmentTime || !packageName) {
      return NextResponse.json({ error: "กรุณาเลือกแพ็กเกจ วัน และเวลา" }, { status: 400 });
    }
    if (!isBangkokFutureSlot(appointmentDate, appointmentTime)) {
      return NextResponse.json({ error: "กรุณาเลือกวันและเวลาในอนาคต" }, { status: 400 });
    }
    const result = await checkCallAvailability({ appointmentDate, appointmentTime, packageName });
    return NextResponse.json({
      available: result.available,
      durationMinutes: callDurationMinutes(packageName),
      message: result.available ? "วันและเวลานี้ยังว่าง" : "เวลานี้มีคิว Call แล้ว กรุณาเลือกเวลาใหม่",
    }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("call availability GET failed", error);
    return NextResponse.json({ error: "ตรวจสอบเวลานัดไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
