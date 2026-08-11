import test from "node:test";
import assert from "node:assert/strict";
import { publicBookingConfirmation, publicReadingStatus } from "../lib/public-status.js";

const select = (name) => ({ type: "select", select: { name } });
const status = (name) => ({ type: "status", status: { name } });

test("public reading status uses Queue Status instead of generic Notion Status", () => {
  const result = publicReadingStatus({ properties: { "Queue Status": select("รอตรวจสอบ"), Status: status("Not started") } });
  assert.equal(result.status, "รอตรวจสอบ");
});

test("public booking confirmation excludes internal and customer fields", () => {
  const result = publicBookingConfirmation({
    bookingCode: "BR-260812-0123456789ABCDEF0123456789ABCDEF",
    packageName: "1 คำถาม",
    packagePrice: 49,
    serviceMode: "async",
    status: "รอตรวจสอบ",
    estimatedDeliveryDate: "2026-08-14",
    displayName: "Private Name",
    contact: "@private",
    question: "private question",
    queueNumber: 1001,
    internalNote: "private",
  });
  assert.equal(result.bookingCode, "BR-260812-0123456789ABCDEF0123456789ABCDEF");
  assert.equal(result.packagePrice, 49);
  for (const field of ["displayName", "contact", "question", "queueNumber", "internalNote"])
    assert.equal(Object.hasOwn(result, field), false);
});
