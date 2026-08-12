function propertyValue(property) {
  if (!property) return null;
  const value = property[property.type];
  if (property.type === "title" || property.type === "rich_text") return (value || []).map((x) => x.plain_text || "").join("").trim() || null;
  if (property.type === "number") return value ?? null;
  if (property.type === "select" || property.type === "status") return value?.name || null;
  if (property.type === "multi_select") return (value || []).map((x) => x.name || "").filter(Boolean);
  if (property.type === "date") return value?.start || null;
  return null;
}

function queueCode(queueNumber) {
  return Number.isFinite(queueNumber) ? `BR-${String(queueNumber).padStart(4, "0")}` : null;
}

export function publicReadingStatus(page) {
  const p = page.properties || {};
  const packageValue = propertyValue(p["Package Name"]);
  return {
    queueCode: queueCode(propertyValue(p["Queue Number"])),
    displayName: propertyValue(p["Display Name"]),
    packageName: Array.isArray(packageValue) ? packageValue.join(", ") : packageValue,
    status: propertyValue(p["Queue Status"]),
    queueAcceptedDate: propertyValue(p["Queue Accepted Date"]),
    deliveryDate: propertyValue(p["Delivery Date"]),
    lastUpdated: propertyValue(p["Last Updated"]),
    publicNote: propertyValue(p["Public Note"]),
  };
}

export function publicBookingConfirmation(booking) {
  return {
    queueCode: booking.queueCode || queueCode(booking.queueNumber),
    packageName: booking.packageName,
    packagePrice: booking.packagePrice ?? null,
    serviceMode: booking.serviceMode,
    status: booking.status,
    appointmentDate: booking.appointmentDate || null,
    appointmentTime: booking.appointmentTime || null,
    estimatedDeliveryDate: booking.estimatedDeliveryDate || null,
  };
}
