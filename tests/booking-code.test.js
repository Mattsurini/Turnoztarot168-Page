import test from "node:test";
import assert from "node:assert/strict";
import { generateBookingCode, bookingCodeFromNotionPageId, isModernBookingCode, isManagedBookingCode } from "../lib/booking-code.js";

test("booking code uses Bangkok date and a high-entropy token", () => {
  const code = generateBookingCode(new Date("2026-08-11T18:30:00Z"), () => Buffer.from("0123456789abcdef0123456789abcdef", "hex"));
  assert.equal(code, "BR-260812-0123456789ABCDEF0123456789ABCDEF");
  assert.equal(isModernBookingCode(code), true);
});

test("Notion page ID deterministically creates a unique final code", () => {
  const code = bookingCodeFromNotionPageId("01234567-89ab-cdef-0123-456789abcdef", new Date("2026-08-11T18:30:00Z"));
  assert.equal(code, "BR-260812-0123456789ABCDEF0123456789ABCDEF");
});

test("legacy titles and old three-digit codes are not modern booking codes", () => {
  assert.equal(isModernBookingCode("K.client"), false);
  assert.equal(isModernBookingCode("BR-260811-168"), false);
});
