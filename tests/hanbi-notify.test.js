import test from "node:test";
import assert from "node:assert/strict";
import { formatHanbiQueueMessage } from "../lib/hanbi-notify.js";

test("Hanbi queue notification includes operational fields without queue number", () => {
  const text = formatHanbiQueueMessage({
    bookingCode: "BR-260812-0123456789ABCDEF0123456789ABCDEF",
    packageName: "Vedio Call (Card) 30 Min",
    packagePrice: 666,
    displayName: "Production E2E",
    contact: "@production-e2e",
    serviceMode: "call",
    appointmentDate: "2026-08-13",
    appointmentTime: "23:50",
    queueNumber: 1001,
  });
  assert.match(text, /666 บาท/);
  assert.match(text, /วันนัด: 2026-08-13/);
  assert.match(text, /เวลานัด: 23:50/);
  assert.doesNotMatch(text, /Queue Number|ลำดับคิว|1001/);
});
