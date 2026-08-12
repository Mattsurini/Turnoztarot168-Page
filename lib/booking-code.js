import { randomBytes } from "node:crypto";

function bangkokDateParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid booking date");
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return [shifted.getUTCFullYear() % 100, shifted.getUTCMonth() + 1, shifted.getUTCDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
}

export function generateBookingCode(createdAt = new Date(), bytes = randomBytes) {
  return `BR-${bangkokDateParts(createdAt)}-${bytes(16).toString("hex").toUpperCase()}`;
}

export function bookingCodeFromNotionPageId(pageId, createdAt = new Date()) {
  const token = String(pageId || "").replaceAll("-", "").toUpperCase();
  if (!/^[A-F0-9]{32}$/.test(token)) throw new Error("Invalid Notion page ID");
  return `BR-${bangkokDateParts(createdAt)}-${token}`;
}

export function isModernBookingCode(value) {
  return /^BR-\d{6}-[A-F0-9]{32}$/.test(String(value || ""));
}

export function isManagedBookingCode(value) {
  return /^BR-\d{6}-(?:\d{3}|[A-F0-9]{4}|[A-F0-9]{32})$/.test(String(value || ""));
}
