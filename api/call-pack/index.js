const fs = require("fs");
const path = require("path");
const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";
const DATA_SOURCE_ID = "37d60f08-01b5-81b7-8c3b-000b9e7244d7";
const PROJECT_ROOT = path.resolve(__dirname, "../..");
function key() {
  if (process.env.NOTION_API_KEY) return process.env.NOTION_API_KEY;
  const file = path.join(PROJECT_ROOT, ".env");
  if (!fs.existsSync(file)) return "";
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((x) => x.trim().startsWith("NOTION_API_KEY="));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "") : "";
}
function value(property) {
  if (!property) return null;
  if (property.type === "title") return property.title.map((x) => x.plain_text || "").join("").trim() || null;
  if (property.type === "rich_text") return property.rich_text.map((x) => x.plain_text || "").join("").trim() || null;
  if (property.type === "number") return property.number ?? null;
  if (property.type === "select" || property.type === "status") return property[property.type]?.name || null;
  if (property.type === "multi_select") return property.multi_select.map((x) => x.name).filter(Boolean);
  return null;
}
function send(res, status, body) { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); res.end(JSON.stringify(body)); }
module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
  try {
    const token = key(); if (!token) throw new Error("Missing API key");
    const response = await fetch(`${NOTION_API}/data_sources/${DATA_SOURCE_ID}/query`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Notion-Version": NOTION_VERSION }, body: JSON.stringify({ page_size: 100 }) });
    if (!response.ok) throw new Error(`Notion request failed: ${response.status}`);
    const payload = await response.json();
    const items = (payload.results || []).map((page) => { const p = page.properties || {}; return { name: value(p.Name), special: value(p.Special), price: value(p.Price), detail: value(p.Detail), due: value(p.Due), tags: value(p.Tags) || [] }; }).filter((item) => item.name);
    return send(res, 200, { items });
  } catch { return send(res, 500, { error: "ไม่สามารถโหลดแพ็กเกจ Call Pack ได้ในขณะนี้" }); }
};
