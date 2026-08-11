import { packageResponse, json } from "../../../lib/notion";

export const runtime = "nodejs";

export async function GET() {
  try { return await packageResponse("deep-reading"); }
  catch { return json({ error: "ไม่สามารถโหลดแพ็กเกจ Deep Reading ได้ในขณะนี้" }, 500); }
}
