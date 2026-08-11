import { packageResponse, json } from "../../../lib/notion";

export const runtime = "nodejs";

export async function GET() {
  try { return await packageResponse("special-pack"); }
  catch { return json({ error: "ไม่สามารถโหลดแพ็กเกจ Special Pack ได้ในขณะนี้" }, 500); }
}
