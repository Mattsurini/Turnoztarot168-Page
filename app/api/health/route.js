import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const checks = {
    app: "ok",
    notion: process.env.NOTION_API_KEY && (process.env.NOTION_READING_DB_ID || process.env.NOTION_READING_DATA_SOURCE_ID) ? "configured" : "missing",
  };
  const healthy = checks.notion === "configured";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
