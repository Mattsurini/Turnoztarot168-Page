import { packageResponse, json } from "../../../lib/notion";

export const runtime = "nodejs";

export async function GET() {
  try { return await packageResponse("q-and-a"); }
  catch { return json({ error: "ไม่สามารถโหลดแพ็กเกจ Q&A ได้ในขณะนี้" }, 500); }
}
