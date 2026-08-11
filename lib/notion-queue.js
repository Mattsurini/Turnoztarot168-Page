import { callSlotsOverlap } from "./call-slots";
import { estimatedDeliveryDate } from "./delivery-rules";
import { collectNotionPages } from "./notion-pagination";
import { generateBookingCode, bookingCodeFromNotionPageId, isManagedBookingCode } from "./booking-code";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";
const allowedStatuses = ["รอตรวจสอบ", "รับคิวแล้ว", "กำลังอ่าน", "ส่งผลแล้ว", "ปิดงาน", "พักคิว", "ยกเลิก"];
let dataSourcePromise;

function env(name) {
  return process.env[name];
}

function headers() {
  if (!env("NOTION_API_KEY")) throw new Error("Missing NOTION_API_KEY");
  return {
    Authorization: `Bearer ${env("NOTION_API_KEY")}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

async function readingDataSourceId() {
  if (!dataSourcePromise) {
    dataSourcePromise = (async () => {
      if (env("NOTION_READING_DATA_SOURCE_ID")) return env("NOTION_READING_DATA_SOURCE_ID");
      if (!env("NOTION_READING_DB_ID")) throw new Error("Missing NOTION_READING_DB_ID");
      const response = await fetch(`${NOTION_API}/databases/${env("NOTION_READING_DB_ID")}`, { headers: headers(), cache: "no-store" });
      if (!response.ok) throw new Error(`Notion database failed: ${response.status}`);
      const database = await response.json();
      const id = database.data_sources?.[0]?.id;
      if (!id) throw new Error("Missing reading data source");
      return id;
    })();
  }
  return dataSourcePromise;
}

function text(value) {
  return [{ type: "text", text: { content: String(value ?? "") } }];
}
function rich(value) { return { rich_text: text(value) }; }
function title(value) { return { title: text(value) }; }
function multi(values) {
  const items = Array.isArray(values) ? values : [values];
  return { multi_select: items.filter(Boolean).map((name) => ({ name: String(name) })) };
}
function date(value) { return value ? { date: { start: value } } : { date: null }; }
function number(value) { return { number: value == null ? null : Number(value) }; }
function select(value) { return { select: value ? { name: value } : null }; }
function status(value) { return { status: { name: value } }; }

function value(property) {
  if (!property) return null;
  if (property.type === "title") return property.title?.map((x) => x.plain_text || "").join("").trim() || null;
  if (property.type === "rich_text") return property.rich_text?.map((x) => x.plain_text || "").join("").trim() || null;
  if (property.type === "multi_select") return property.multi_select?.map((x) => x.name).filter(Boolean) || [];
  if (property.type === "number") return property.number ?? null;
  if (property.type === "date") return property.date?.start || null;
  if (property.type === "select" || property.type === "status") return property[property.type]?.name || null;
  return null;
}

function rowToBooking(page) {
  if (!page) return null;
  const p = page.properties || {};
  const packageNames = value(p["Package Name"]) || [];
  const addons = value(p["Add-ons"]) || [];
  const queueStatus = value(p["Queue Status"]) || "รอตรวจสอบ";
  return {
    id: page.id,
    bookingCode: value(p["Booking Code"]),
    packageName: packageNames.join(", "),
    packagePrice: value(p["Package Price"]),
    serviceMode: value(p["Service Mode"]) || (packageNames.some((x) => x.toLowerCase().includes("call")) ? "call" : "async"),
    displayName: value(p["Display Name"]) || "",
    contact: value(p["Contact"]) || "",
    question: value(p["Question Context"]) || "",
    deliveryType: value(p["Delivery Type"]) || "ข้อความ",
    addons: addons.join(", "),
    appointmentDate: value(p["Appointment Date"]),
    appointmentTime: value(p["Appointment Time"]),
    queueNumber: value(p["Queue Number"]),
    queueAcceptedDate: value(p["Queue Accepted Date"]),
    estimatedDeliveryDate: value(p["Delivery Date"]),
    deliveredDate: value(p["Delivered Date"]),
    status: queueStatus,
    publicNote: value(p["Public Note"]) || "",
    internalNote: value(p["Internal Note"]) || "",
    consent: true,
    createdAt: page.created_time,
    updatedAt: value(p["Last Updated"]) || page.last_edited_time,
  };
}

function propertiesForBooking(input, bookingCode, queueNumber, createdAt) {
  const serviceMode = input.serviceMode === "call" ? "call" : "async";
  const deliveryDate = serviceMode === "async" ? (input.estimatedDeliveryDate || estimatedDeliveryDate(input, createdAt)) : null;
  return {
    "Booking Code": title(bookingCode),
    "Display Name": rich(input.displayName),
    "Contact": rich(input.contact),
    "Question Context": rich(input.question),
    "Package Name": multi(input.packageName),
    "Package Price": number(input.packagePrice),
    "Service Mode": select(serviceMode),
    "Delivery Type": select(input.deliveryType),
    "Appointment Date": date(serviceMode === "call" ? input.appointmentDate : null),
    "Appointment Time": rich(serviceMode === "call" ? input.appointmentTime : ""),
    "Add-ons": multi(input.addons),
    "Platform": multi("Line OA"),
    "Queue Number": number(queueNumber),
    "Queue Status": select("รอตรวจสอบ"),
    "Status": status("Not started"),
    "Public Note": rich(""),
    "Internal Note": rich(`Service Mode: ${serviceMode}\nDelivery Type: ${input.deliveryType}`),
    "Last Updated": date(createdAt.toISOString()),
    "Delivery Date": date(deliveryDate),
    "Queue Accepted Date": date(null),
  };
}

async function query(filter) {
  const ds = await readingDataSourceId();
  return collectNotionPages(async (cursor) => {
    const response = await fetch(`${NOTION_API}/data_sources/${ds}/query`, {
      method: "POST", headers: headers(), cache: "no-store",
      body: JSON.stringify({ page_size: 100, ...(filter ? { filter } : {}), ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    if (!response.ok) throw new Error(`Notion queue query failed: ${response.status}`);
    return response.json();
  });
}

function managedFilter(statusFilter = "") {
  const filters = [{ property: "Booking Code", title: { starts_with: "BR-" } }];
  if (statusFilter) filters.push({ property: "Queue Status", select: { equals: statusFilter } });
  return filters.length === 1 ? filters[0] : { and: filters };
}

async function queryCallBookings(appointmentDate) {
  const pages = await query({
    and: [
      { property: "Booking Code", title: { starts_with: "BR-" } },
      { property: "Service Mode", select: { equals: "call" } },
      { property: "Appointment Date", date: { equals: appointmentDate } },
      { property: "Queue Status", select: { does_not_equal: "ยกเลิก" } },
    ],
  });
  return pages.map(rowToBooking);
}

export async function checkNotionCallAvailability(requested) {
  const bookings = await queryCallBookings(requested.appointmentDate);
  const conflict = bookings.find((booking) => callSlotsOverlap(booking, requested));
  return { available: !conflict, conflict: conflict ? { appointmentDate: conflict.appointmentDate, appointmentTime: conflict.appointmentTime, packageName: conflict.packageName } : null };
}

export async function createNotionBooking(input) {
  const existing = await query(managedFilter());
  const queueNumbers = existing.map((page) => value(page.properties?.["Queue Number"])).filter(Number.isFinite);
  const queueNumber = input.serviceMode === "async" ? Math.max(0, ...queueNumbers) + 1 : null;
  const existingCodes = new Set(existing.map((page) => value(page.properties?.["Booking Code"])).filter(Boolean));
  let bookingCode;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateBookingCode();
    if (!existingCodes.has(candidate)) { bookingCode = candidate; break; }
  }
  if (!bookingCode) throw new Error("Unable to generate a unique booking code");
  const createdAt = new Date();
  const ds = await readingDataSourceId();
  const response = await fetch(`${NOTION_API}/pages`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ parent: { data_source_id: ds }, properties: propertiesForBooking(input, bookingCode, queueNumber, createdAt) }),
  });
  if (!response.ok) throw new Error(`Notion queue create failed: ${response.status}`);
  const provisionalPage = await response.json();
  const finalBookingCode = bookingCodeFromNotionPageId(provisionalPage.id, createdAt);
  const finalizeResponse = await fetch(`${NOTION_API}/pages/${provisionalPage.id}`, {
    method: "PATCH", headers: headers(),
    body: JSON.stringify({ properties: { "Booking Code": title(finalBookingCode) } }),
  });
  if (!finalizeResponse.ok) {
    await fetch(`${NOTION_API}/pages/${provisionalPage.id}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ archived: true }) }).catch(() => null);
    throw new Error(`Unable to finalize unique booking code: ${finalizeResponse.status}`);
  }
  const created = rowToBooking(await finalizeResponse.json());
  if (input.serviceMode === "call") {
    const overlapping = (await queryCallBookings(input.appointmentDate))
      .filter((booking) => booking.id !== created.id && callSlotsOverlap(booking, created));
    if (overlapping.length) {
      const winner = [created, ...overlapping].sort((a, b) => {
        const timeOrder = String(a.createdAt).localeCompare(String(b.createdAt));
        return timeOrder || String(a.id).localeCompare(String(b.id));
      })[0];
      if (winner.id !== created.id) {
        const archiveResponse = await fetch(`${NOTION_API}/pages/${created.id}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ archived: true }) });
        if (!archiveResponse.ok) throw new Error(`Unable to archive conflicting Call booking: ${archiveResponse.status}`);
        const conflictError = new Error("Call slot unavailable");
        conflictError.code = "CALL_SLOT_UNAVAILABLE";
        throw conflictError;
      }
    }
  }
  return created;
}

export async function listNotionBookings(statusFilter = "") {
  const pages = await query(managedFilter(statusFilter));
  return pages.map(rowToBooking).filter((booking) => isManagedBookingCode(booking.bookingCode)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getNotionBooking(bookingCode) {
  if (!isManagedBookingCode(bookingCode)) return null;
  const pages = await query({ property: "Booking Code", title: { equals: bookingCode } });
  return rowToBooking(pages[0]);
}

export async function updateNotionBooking(bookingCode, input) {
  if (!isManagedBookingCode(bookingCode)) return null;
  const pages = await query({ property: "Booking Code", title: { equals: bookingCode } });
  const page = pages[0];
  if (!page) return null;
  const properties = { "Last Updated": date(new Date().toISOString()) };
  if (input.status) {
    if (!allowedStatuses.includes(input.status)) throw new Error("Invalid status");
    properties["Queue Status"] = select(input.status);
    properties.Status = status(["ปิดงาน", "ส่งผลแล้ว"].includes(input.status) ? "Done" : input.status === "รอตรวจสอบ" ? "Not started" : "In progress");
  }
  const dateMap = { queueAcceptedDate: "Queue Accepted Date", estimatedDeliveryDate: "Delivery Date", deliveredDate: "Delivered Date" };
  for (const [key, propertyName] of Object.entries(dateMap)) if (Object.hasOwn(input, key)) properties[propertyName] = date(input[key]);
  if (Object.hasOwn(input, "publicNote")) properties["Public Note"] = rich(input.publicNote);
  if (Object.hasOwn(input, "internalNote")) properties["Internal Note"] = rich(input.internalNote);
  const response = await fetch(`${NOTION_API}/pages/${page.id}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ properties }) });
  if (!response.ok) throw new Error(`Notion queue update failed: ${response.status}`);
  return rowToBooking(await response.json());
}
