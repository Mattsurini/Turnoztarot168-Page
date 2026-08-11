import { packageResponse, json } from "../../../lib/notion";

export const runtime = "nodejs";

export async function GET() {
  try { return await packageResponse("relationship-package"); }
  catch { return json({ error: "ไม่สามารถโหลดแพ็กเกจ Relationship Package ได้ในขณะนี้" }, 500); }
}
