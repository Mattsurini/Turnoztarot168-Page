/**
 * Public Deep Reading adapter.
 * GET /api/deep-reading
 */
const fs = require("fs");
const path = require("path");

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";
const DATA_SOURCE_ID = "2719f48c-6de7-4237-accf-d4631836de18";
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const ENV_FILE = path.join(PROJECT_ROOT, ".env");

function loadEnv() {
  const values = {};
  if (!fs.existsSync(ENV_FILE)) return values;
  for (const rawLine of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    if (key !== "NOTION_API_KEY") continue;
    values[key] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

const PROJECT_ENV = loadEnv();
function apiKey() { return process.env.NOTION_API_KEY || PROJECT_ENV.NOTION_API_KEY || ""; }

function valueOf(property) {
  if (!property) return null;
  if (property.type === "title") return property.title.map((item) => item.plain_text || "").join("").trim() || null;
  if (property.type === "rich_text") return property.rich_text.map((item) => item.plain_text || "").join("").trim() || null;
  if (property.type === "select" || property.type === "status") return property[property.type]?.name || null;
  if (property.type === "number") return property.number ?? null;
  if (property.type === "multi_select") return property.multi_select.map((item) => item.name || "").filter(Boolean);
  if (property.type === "date") return property.date?.start || null;
  return null;
}

function publicPackage(page) {
  const properties = page.properties || {};
  return {
    name: valueOf(properties.Name),
    special: valueOf(properties.Special),
    price: valueOf(properties.Price),
    detail: valueOf(properties.Detail),
    due: valueOf(properties.Due),
    tags: valueOf(properties.Tags) || [],
  };
}

async function queryPackages() {
  const key = apiKey();
  if (!key) throw new Error("Missing Notion API configuration");
  const response = await fetch(`${NOTION_API}/data_sources/${DATA_SOURCE_ID}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ page_size: 100 }),
  });
  if (!response.ok) throw new Error(`Notion request failed: ${response.status}`);
  const payload = await response.json();
  return (payload.results || [])
    .map(publicPackage)
    .filter((item) => item.name);
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
  try {
    const items = await queryPackages();
    return sendJson(res, 200, { items });
  } catch (error) {
    return sendJson(res, 500, { error: "ไม่สามารถโหลดแพ็กเกจ Deep Reading ได้ในขณะนี้" });
  }
};
