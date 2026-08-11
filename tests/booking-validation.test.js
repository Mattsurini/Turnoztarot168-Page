import test from "node:test";
import assert from "node:assert/strict";
import { validateBookingInput } from "../lib/booking-validation.js";

const qa = { name: "1 คำถาม", kind: "q-and-a" };

test("server derives package kind and service mode from catalog", () => {
  const input = validateBookingInput({ packageName: "1 คำถาม", serviceMode: "call", displayName: "BooM", contact: "@boom", question: "ถาม", deliveryType: "ข้อความ", consent: true }, qa);
  assert.equal(input.packageKind, "q-and-a");
  assert.equal(input.serviceMode, "async");
});

test("consent must be the boolean true", () => {
  assert.throws(() => validateBookingInput({ packageName: "1 คำถาม", displayName: "x", contact: "x", question: "x", consent: "false" }, qa), /Consent/);
});

test("unknown packages and oversized fields are rejected", () => {
  assert.throws(() => validateBookingInput({ packageName: "fake", displayName: "x", contact: "x", question: "x", consent: true }, null), /package/i);
  assert.throws(() => validateBookingInput({ packageName: "1 คำถาม", displayName: "x".repeat(121), contact: "x", question: "x", consent: true }, qa), /displayName/);
});
