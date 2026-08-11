import { queryDataSource, publicPackage, json } from "../../../lib/notion";

export const runtime = "nodejs";

const sources = [
  ["q-and-a", "Q&A Pack"],
  ["relationship-package", "Relationship Pack"],
  ["special-pack", "Special Pack"],
  ["deep-reading", "Deep Reading"],
  ["call-pack", "Call Pack"],
];

export async function GET() {
  try {
    const groups = await Promise.all(sources.map(async ([kind, label]) => {
      const pages = await queryDataSource(kind);
      return {
        kind,
        label,
        items: pages.map(publicPackage).filter((item) => item.name && !(kind === "q-and-a" && item.name === "เจาะลึกแบบจุกๆ")),
      };
    }));
    return json({ groups });
  } catch (error) {
    console.error("packages GET failed", error);
    return json({ error: "ไม่สามารถโหลดรายการแพ็กเกจได้ในขณะนี้" }, 500);
  }
}
