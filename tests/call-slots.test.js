import test from "node:test";
import assert from "node:assert/strict";
import { callDurationMinutes, callSlotsOverlap, isBangkokFutureSlot } from "../lib/call-slots.js";

test("reads Call duration from package name", () => {
  assert.equal(callDurationMinutes("Voice Call (No Face) 10 Min"), 10);
  assert.equal(callDurationMinutes("Vedio Call (Card) 30 Min"), 30);
  assert.equal(callDurationMinutes("Call without duration"), 30);
});

test("detects overlap but allows an adjacent slot", () => {
  const existing = { packageName: "Vedio Call (Card) 30 Min", appointmentDate: "2099-01-02", appointmentTime: "10:00" };
  assert.equal(callSlotsOverlap(existing, { packageName: "Voice Call (No Face) 30 Min", appointmentDate: "2099-01-02", appointmentTime: "09:50" }), true);
  assert.equal(callSlotsOverlap(existing, { packageName: "Voice Call (No Face) 30 Min", appointmentDate: "2099-01-02", appointmentTime: "10:20" }), true);
  assert.equal(callSlotsOverlap(existing, { packageName: "Voice Call (No Face) 30 Min", appointmentDate: "2099-01-02", appointmentTime: "10:30" }), false);
});

test("does not overlap on different dates", () => {
  assert.equal(callSlotsOverlap(
    { packageName: "Call 30 Min", appointmentDate: "2099-01-02", appointmentTime: "10:00" },
    { packageName: "Call 30 Min", appointmentDate: "2099-01-03", appointmentTime: "10:00" },
  ), false);
});

test("validates a future Bangkok appointment", () => {
  assert.equal(isBangkokFutureSlot("2099-01-02", "10:00"), true);
  assert.equal(isBangkokFutureSlot("2020-01-02", "10:00"), false);
  assert.equal(isBangkokFutureSlot("bad", "10:00"), false);
});
