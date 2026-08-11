const QA_PACKAGE_NAMES = new Set([
  "โชคลาภ และ การเสี่ยงทาย",
  "5 คำถาม",
  "3 คำถาม",
  "2 คำถาม",
  "1 คำถาม",
]);

const PACKAGE_DELIVERY_DAYS = new Map([
  ["About Soulmate", 2],
  ["แฟนคนถัดไป", 3],
  ["เนื้อคู่ของคุณ", 3],
  ["4 คำถามความรัก", 2],
  ["ไพ่เล่าเรื่อง X ….", 3],
  ["พื้นดวงแบบปังๆ", 3],
  ["อยากรู้แต่ไม่อยากถาม", 2],
  ["เจาะลึกแบบจุกๆ", 3],
]);

export function deliveryRuleDays({ packageName = "", packageKind = "", serviceMode = "async" } = {}) {
  if (serviceMode === "call") return null;
  const name = String(packageName).trim();
  if (packageKind === "q-and-a" || QA_PACKAGE_NAMES.has(name)) return 2;
  if (packageKind === "deep-reading") return 3;
  return PACKAGE_DELIVERY_DAYS.get(name) ?? null;
}

export function bangkokDatePlusDays(createdAt, days) {
  if (!Number.isInteger(days) || days < 0) return null;
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  const bangkok = new Date(created.getTime() + 7 * 60 * 60 * 1000);
  const result = new Date(Date.UTC(
    bangkok.getUTCFullYear(),
    bangkok.getUTCMonth(),
    bangkok.getUTCDate() + days,
  ));
  return result.toISOString().slice(0, 10);
}

export function estimatedDeliveryDate(input, createdAt = new Date()) {
  const days = deliveryRuleDays(input);
  return days == null ? null : bangkokDatePlusDays(createdAt, days);
}
