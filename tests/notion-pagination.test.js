import test from "node:test";
import assert from "node:assert/strict";
import { collectNotionPages } from "../lib/notion-pagination.js";

test("collectNotionPages follows next_cursor until complete", async () => {
  const cursors = [];
  const pages = await collectNotionPages(async (cursor) => {
    cursors.push(cursor);
    return cursor ? { results: [{ id: 2 }], has_more: false, next_cursor: null } : { results: [{ id: 1 }], has_more: true, next_cursor: "next" };
  });
  assert.deepEqual(cursors, [null, "next"]);
  assert.deepEqual(pages.map((x) => x.id), [1, 2]);
});
