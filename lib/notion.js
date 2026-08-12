import { NextResponse } from "next/server";
import { collectNotionPages } from "./notion-pagination";
export { publicReadingStatus } from "./public-status";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";

const DATA_SOURCES = {
  "q-and-a": process.env.NOTION_QA_DATA_SOURCE_ID || "37d60f08-01b5-808d-8cab-000b326872a3",
  "relationship-package": process.env.NOTION_RELATIONSHIP_DATA_SOURCE_ID || "37d60f08-01b5-81db-ab71-000b6f3650b1",
  "special-pack": process.env.NOTION_SPECIAL_DATA_SOURCE_ID || "37d60f08-01b5-8124-94ae-000b8909ffd6",
  "deep-reading": process.env.NOTION_DEEP_READING_DATA_SOURCE_ID || "2719f48c-6de7-4237-accf-d4631836de18",
  "call-pack": process.env.NOTION_CALL_DATA_SOURCE_ID || "37d60f08-01b5-81b7-8c3b-000b9e7244d7",
};

function notionHeaders() {
  const key = process.env.NOTION_API_KEY;
  if (!key) throw new Error("Missing NOTION_API_KEY");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

export function propertyValue(property) {
  if (!property) return null;
  if (property.type === "title") return property.title.map((x) => x.plain_text || "").join("").trim() || null;
  if (property.type === "rich_text") return property.rich_text.map((x) => x.plain_text || "").join("").trim() || null;
  if (property.type === "number") return property.number ?? null;
  if (property.type === "select" || property.type === "status") return property[property.type]?.name || null;
  if (property.type === "multi_select") return property.multi_select.map((x) => x.name || "").filter(Boolean);
  if (property.type === "date") return property.date?.start || null;
  return null;
}

export async function queryDataSource(kind) {
  const dataSourceId = DATA_SOURCES[kind];
  if (!dataSourceId) throw new Error(`Unknown package data source: ${kind}`);
  return collectNotionPages(async (cursor) => {
    const response = await fetch(`${NOTION_API}/data_sources/${dataSourceId}/query`, {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Notion query failed: ${response.status}`);
    return response.json();
  });
}

export async function resolveCatalogPackage(packageName, requestedKind, requestedId) {
  const name = String(packageName || "").trim();
  const kind = String(requestedKind || "").trim();
  const id = String(requestedId || "").trim();
  if (!name || !id || !DATA_SOURCES[kind]) return null;
  const pages = await queryDataSource(kind);
  const match = pages.map(publicPackage).find((item) => item.id === id && item.name === name);
  return match ? { id: match.id, name: match.name, price: match.price, kind } : null;
}

export function publicPackage(page) {
  const p = page.properties || {};
  return {
    id: page.id,
    name: propertyValue(p.Name),
    index: propertyValue(p.Index),
    special: propertyValue(p.Special),
    price: propertyValue(p.Price),
    detail: propertyValue(p.Detail),
    due: propertyValue(p.Due),
    tags: propertyValue(p.Tags) || [],
  };
}

export function json(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function packageResponse(kind) {
  const pages = await queryDataSource(kind);
  const items = pages
    .map(publicPackage)
    .filter((item) => item.name && !(kind === "q-and-a" && item.name === "เจาะลึกแบบจุกๆ"));
  return json({ items });
}

export async function queryReadingStatus(code) {
  const databaseId = process.env.NOTION_READING_DB_ID;
  if (!databaseId) throw new Error("Missing NOTION_READING_DB_ID");
  const databaseResponse = await fetch(`${NOTION_API}/databases/${databaseId}`, {
    headers: notionHeaders(),
    cache: "no-store",
  });
  if (!databaseResponse.ok) throw new Error(`Notion database failed: ${databaseResponse.status}`);
  const database = await databaseResponse.json();
  const dataSourceId = database.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error("Missing reading data source");
  const response = await fetch(`${NOTION_API}/data_sources/${dataSourceId}/query`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: /^BR-\d{4}$/.test(code)
        ? { property: "Queue Number", number: { equals: Number(code.slice(3)) } }
        : { property: "Booking Code", title: { equals: code } },
      page_size: 1,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Notion status query failed: ${response.status}`);
  const payload = await response.json();
  return payload.results?.[0] || null;
}
