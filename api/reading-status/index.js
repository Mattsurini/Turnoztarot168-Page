/**
 * BooM Reading Status — server-side Notion adapter.
 * Public endpoint: GET /api/reading-status?bookingCode=TEST-BR-0001
 */

const fs = require("fs");
const path = require("path");

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const ENV_FILE = path.join(PROJECT_ROOT, ".env");

function loadProjectEnv() {
  const values = {};
  if (!fs.existsSync(ENV_FILE)) return values;
  for (const rawLine of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key === "NOTION_API_KEY" || key === "NOTION_READING_DB_ID") values[key] = value;
  }
  return values;
}

const PROJECT_ENV = loadProjectEnv();

function configValue(name) {
  return process.env[name] || PROJECT_ENV[name] || "";
}

function textValue(property) {
  if (!property) return null;
  if (property.type === "title") return property.title.map((item) => item.plain_text || "").join("").trim() || null;
  if (property.type === "rich_text") return property.rich_text.map((item) => item.plain_text || "").join("").trim() || null;
  if (property.type === "select" || property.type === "status") return property[property.type]?.name || null;
  if (property.type === "multi_select") return property.multi_select.map((item) => item.name || "").filter(Boolean).join(", ") || null;
  if (property.type === "date") return property.date?.start || null;
  if (property.type === "number") return property.number ?? null;
  return null;
}

function publicRecord(page) {
  const properties = page.properties || {};
  const value = (name) => textValue(properties[name]);
  return {
    bookingCode: value("Booking Code"),
    displayName: value("Display Name"),
    packageName: value("Package Name"),
    status: value("Status"),
    queueNumber: value("Queue Number"),
    queueAcceptedDate: value("Queue Accepted Date"),
    deliveryDate: value("Delivery Date"),
    lastUpdated: value("Last Updated"),
    publicNote: value("Public Note"),
  };
}

async function queryBooking(bookingCode) {
  const apiKey = configValue("NOTION_API_KEY");
  const databaseId = configValue("NOTION_READING_DB_ID");
  if (!apiKey || !databaseId) throw new Error("Missing server configuration");

  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
  const databaseResponse = await fetch(`${NOTION_API}/databases/${databaseId}`, { headers: authHeaders });
  if (!databaseResponse.ok) throw new Error(`Notion database request failed: ${databaseResponse.status}`);
  const database = await databaseResponse.json();
  const dataSourceId = database.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error("Notion data source is unavailable");

  const response = await fetch(`${NOTION_API}/data_sources/${dataSourceId}/query`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      filter: { property: "Booking Code", title: { equals: bookingCode } },
      page_size: 1,
    }),
  });

  if (!response.ok) throw new Error(`Notion request failed: ${response.status}`);
  const payload = await response.json();
  return payload.results?.[0] || null;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });

  const bookingCode = String(req.query?.bookingCode || "").trim();
  if (!bookingCode) return sendJson(res, 400, { error: "กรุณากรอก Booking Code" });

  try {
    const page = await queryBooking(bookingCode);
    if (!page) return sendJson(res, 404, { error: "ไม่พบ Booking Code นี้" });
    return sendJson(res, 200, publicRecord(page));
  } catch (error) {
    return sendJson(res, 500, { error: "ไม่สามารถตรวจสอบสถานะได้ในขณะนี้" });
  }
};
