import crypto from "node:crypto";

const webhookUrl = process.env.HANBI_QUEUE_WEBHOOK_URL;
const webhookSecret = process.env.HANBI_QUEUE_WEBHOOK_SECRET;
const telegramBotToken = process.env.HANBI_TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.BOOM_QUEUE_TELEGRAM_CHAT_ID;

export function formatHanbiQueueMessage(booking) {
  const price = Number.isFinite(booking?.packagePrice)
    ? `${Number(booking.packagePrice).toLocaleString("th-TH")} บาท`
    : "-";
  const lines = [
    "🔔 มีคำขอรับคิวใหม่",
    "",
    `Booking: ${booking?.bookingCode || "-"}`,
    `คิว: ${booking?.queueCode || (booking?.serviceMode === "call" ? "Call นัดเวลา" : "-")}`,
    `แพ็กเกจ: ${booking?.packageName || "-"}`,
    `ราคา: ${price}`,
    `ชื่อ: ${booking?.displayName || "-"}`,
    `LINE: ${booking?.contact || "-"}`,
    `โหมด: ${booking?.serviceMode || "-"}`,
  ];
  if (booking?.serviceMode === "call") {
    lines.push(`วันนัด: ${booking?.appointmentDate || "-"}`, `เวลานัด: ${booking?.appointmentTime || "-"}`);
  } else {
    lines.push(`รูปแบบ: ${booking?.deliveryType || "-"}`);
  }
  lines.push("สถานะ: รอตรวจสอบ", "", "จัดการคิว: Reading Queue Database ใน Notion");
  return lines.join("\n");
}

async function sendTelegram(booking) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegramChatId, text: formatHanbiQueueMessage(booking) }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Telegram returned HTTP ${response.status}`);
    const result = await response.json();
    if (!result?.ok) throw new Error("Telegram rejected the notification");
    return { sent: true, channel: "telegram" };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendWebhook(booking) {
  const payload = JSON.stringify({ event_type: "queue.created", booking });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Signature-V2": signature,
      },
      body: payload,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Hanbi webhook returned HTTP ${response.status}`);
    return { sent: true, channel: "webhook" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function notifyHanbiQueueCreated(booking) {
  if (telegramBotToken && telegramChatId) return sendTelegram(booking);
  if (webhookUrl && webhookSecret) return sendWebhook(booking);
  return { sent: false, skipped: true, reason: "Hanbi notification is not configured" };
}
