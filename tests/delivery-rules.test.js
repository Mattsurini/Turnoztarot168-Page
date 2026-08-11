import test from "node:test";
import assert from "node:assert/strict";
import { bangkokDatePlusDays, deliveryRuleDays, estimatedDeliveryDate } from "../lib/delivery-rules.js";

test("Q&A Pack is due two calendar days after intake", () => {
  assert.equal(deliveryRuleDays({ packageKind: "q-and-a", packageName: "แพ็กใหม่", serviceMode: "async" }), 2);
  assert.equal(estimatedDeliveryDate({ packageName: "1 คำถาม", serviceMode: "async" }, "2026-08-11T15:41:00Z"), "2026-08-13");
});

test("Relationship package rules match the approved turnaround", () => {
  const rules = new Map([
    ["About Soulmate", 2],
    ["แฟนคนถัดไป", 3],
    ["เนื้อคู่ของคุณ", 3],
    ["4 คำถามความรัก", 2],
  ]);
  for (const [packageName, days] of rules) {
    assert.equal(deliveryRuleDays({ packageName, serviceMode: "async" }), days);
  }
});

test("Special Pack rules match the approved turnaround", () => {
  const rules = new Map([
    ["ไพ่เล่าเรื่อง X ….", 3],
    ["พื้นดวงแบบปังๆ", 3],
    ["อยากรู้แต่ไม่อยากถาม", 2],
  ]);
  for (const [packageName, days] of rules) {
    assert.equal(deliveryRuleDays({ packageName, serviceMode: "async" }), days);
  }
});

test("Deep Reading is due three calendar days after intake", () => {
  assert.equal(deliveryRuleDays({ packageKind: "deep-reading", packageName: "แพ็ก Deep Reading ใหม่", serviceMode: "async" }), 3);
  assert.equal(deliveryRuleDays({ packageName: "เจาะลึกแบบจุกๆ", serviceMode: "async" }), 3);
  assert.equal(estimatedDeliveryDate({ packageKind: "deep-reading", packageName: "เจาะลึกแบบจุกๆ", serviceMode: "async" }, "2026-08-11T18:30:00Z"), "2026-08-15");
});

test("Bangkok date is used across UTC day boundary", () => {
  assert.equal(bangkokDatePlusDays("2026-08-11T18:30:00Z", 2), "2026-08-14");
});

test("Call and unmatched packages do not receive an automatic delivery date", () => {
  assert.equal(deliveryRuleDays({ packageKind: "q-and-a", serviceMode: "call" }), null);
  assert.equal(estimatedDeliveryDate({ packageName: "แพ็กอื่น", serviceMode: "async" }, "2026-08-11T12:00:00Z"), null);
});
