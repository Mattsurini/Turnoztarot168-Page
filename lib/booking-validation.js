const LIMITS = { packageName: 200, packageId: 64, displayName: 120, contact: 200, question: 2000, deliveryType: 30, addons: 500, appointmentDate: 10, appointmentTime: 5 };
const DELIVERY_TYPES = new Set(["ข้อความ", "เสียง", "วิดีโอ"]);

function invalid(message) { const error = new Error(message); error.code = "INVALID_BOOKING"; throw error; }

function text(body, key, required = false) {
  const value = typeof body?.[key] === "string" ? body[key].trim() : "";
  if (required && !value) invalid(`Missing field: ${key}`);
  if (value.length > LIMITS[key]) invalid(`${key} is too long`);
  return value;
}

export function validateBookingInput(body, catalogEntry) {
  if (!catalogEntry?.id || !catalogEntry?.name || !catalogEntry?.kind || catalogEntry.name !== text(body, "packageName", true) || catalogEntry.id !== text(body, "packageId", true)) invalid("Invalid package");
  if (body?.consent !== true) invalid("Consent is required");
  const serviceMode = catalogEntry.kind === "call-pack" ? "call" : "async";
  const input = {
    packageName: catalogEntry.name,
    packageId: catalogEntry.id,
    packagePrice: Number.isFinite(catalogEntry.price) ? catalogEntry.price : null,
    packageKind: catalogEntry.kind,
    serviceMode,
    displayName: text(body, "displayName", true),
    contact: text(body, "contact", true),
    question: text(body, "question", serviceMode === "async"),
    deliveryType: text(body, "deliveryType"),
    addons: text(body, "addons"),
    appointmentDate: text(body, "appointmentDate"),
    appointmentTime: text(body, "appointmentTime"),
    consent: true,
  };
  if (serviceMode === "async" && !DELIVERY_TYPES.has(input.deliveryType)) invalid("Invalid delivery type");
  if (serviceMode === "call") {
    input.question = "ขอนัด Call";
    input.deliveryType = "";
    input.addons = "";
  }
  return input;
}
