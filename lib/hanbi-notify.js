import crypto from "node:crypto";

const webhookUrl = process.env.HANBI_QUEUE_WEBHOOK_URL;
const webhookSecret = process.env.HANBI_QUEUE_WEBHOOK_SECRET;

export async function notifyHanbiQueueCreated(booking) {
  if (!webhookUrl || !webhookSecret) {
    return { sent: false, skipped: true, reason: "Hanbi webhook is not configured" };
  }

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

    if (!response.ok) {
      throw new Error(`Hanbi webhook returned HTTP ${response.status}`);
    }

    return { sent: true };
  } finally {
    clearTimeout(timeout);
  }
}
