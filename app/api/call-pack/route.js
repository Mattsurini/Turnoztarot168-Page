import { packageResponse, json } from "../../../lib/notion";

export const runtime = "nodejs";

export async function GET() {
  try { return await packageResponse("call-pack"); }
  catch { return json({ error: "ไม่สามารถโหลดแพ็กเกจ Call Pack ได้ในขณะนี้" }, 500); }
}
