import test from "node:test";
import assert from "node:assert/strict";
import { bangkokDatePlusDays, deliveryRuleDays, estimatedDeliveryDate } from "../lib/delivery-rules.js";

test("Q&A Pack is due two calendar days after intake", () => {
  assert.equal(deliveryRuleDays({ packageKind: "q-and-a", packageName: "แพ็กใหม่", serviceMode: "async" }), 2);
  assert.equal(estimatedDeliveryDate({ packageName: "1 คำถาม", serviceMode: "async" }, "2026-08-11T15:41:00Z"), "2026-08-13");
});

test("เนื้อคู่ของคุณ is due three calendar days after intake", () => {
  assert.equal(deliveryRuleDays({ packageName: "เนื้อคู่ของคุณ", serviceMode: "async" }), 3);
  assert.equal(estimatedDeliveryDate({ packageName: "เนื้อคู่ของคุณ", serviceMode: "async" }, "2026-08-11T18:30:00Z"), "2026-08-15");
});

test("Bangkok date is used across UTC day boundary", () => {
  assert.equal(bangkokDatePlusDays("2026-08-11T18:30:00Z", 2), "2026-08-14");
});

test("Call and unmatched packages do not receive an automatic delivery date", () => {
  assert.equal(deliveryRuleDays({ packageKind: "q-and-a", serviceMode: "call" }), null);
  assert.equal(estimatedDeliveryDate({ packageName: "แพ็กอื่น", serviceMode: "async" }, "2026-08-11T12:00:00Z"), null);
});
