import test from "node:test";
import assert from "node:assert/strict";
import { publicReadingStatus } from "../lib/public-status.js";

const select = (name) => ({ type: "select", select: { name } });
const status = (name) => ({ type: "status", status: { name } });

test("public reading status uses Queue Status instead of generic Notion Status", () => {
  const result = publicReadingStatus({ properties: { "Queue Status": select("รอตรวจสอบ"), Status: status("Not started") } });
  assert.equal(result.status, "รอตรวจสอบ");
});
