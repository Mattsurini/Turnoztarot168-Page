const QA_PACKAGE_NAMES = new Set([
  "โชคลาภ และ การเสี่ยงทาย",
  "5 คำถาม",
  "3 คำถาม",
  "2 คำถาม",
  "1 คำถาม",
]);

export function deliveryRuleDays({ packageName = "", packageKind = "", serviceMode = "async" } = {}) {
  if (serviceMode === "call") return null;
  const name = String(packageName).trim();
  if (name === "เนื้อคู่ของคุณ") return 3;
  if (packageKind === "q-and-a" || QA_PACKAGE_NAMES.has(name)) return 2;
  return null;
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
