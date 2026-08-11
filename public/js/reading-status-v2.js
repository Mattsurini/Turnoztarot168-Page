(function () {
  "use strict";

  const API_URL = "/api/reading-status";
  const DEMO_DATA = {
    "BKM-0001": { "Booking Code": "BKM-0001", Package: "Q&A Pack", Status: "กำลังเข้าคิว", "Queue Number": 12, "Received Date": "2026-08-10", "Estimated Delivery": "ภายใน 3–5 วันทำการ", "Last Updated": "2026-08-10", "Public Note": "ได้รับคำถามแล้ว กำลังจัดคิวอ่าน" },
    "BKM-0002": { "Booking Code": "BKM-0002", Package: "Relationship Pack", Status: "กำลังอ่าน", "Queue Number": 4, "Received Date": "2026-08-08", "Estimated Delivery": "ภายใน 1–2 วันทำการ", "Last Updated": "2026-08-11", "Public Note": "อยู่ระหว่างจัดทำคำทำนาย" }
  };
  const labels = { "Booking Code": "รหัสจอง", Package: "แพ็กเกจ", Status: "สถานะ", "Queue Number": "ลำดับคิว", "Received Date": "วันที่ได้รับคำถาม", "Estimated Delivery": "กำหนดส่งโดยประมาณ", "Last Updated": "อัปเดตล่าสุด", "Public Note": "หมายเหตุ" };
  const form = document.getElementById("status-form"), input = document.getElementById("booking-code"), loading = document.getElementById("loading"), message = document.getElementById("message"), card = document.getElementById("result-card"), fields = document.getElementById("result-fields");

  function render(data, demo) {
    fields.replaceChildren();
    Object.entries(labels).forEach(([key, label]) => {
      if (data[key] === undefined || data[key] === null || data[key] === "") return;
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = String(data[key]);
      fields.append(dt, dd);
    });
    card.hidden = false; loading.hidden = true; message.hidden = true;
    if (demo) { message.textContent = "กำลังแสดงข้อมูลตัวอย่างสำหรับทดสอบหน้าเว็บ"; message.className = "message ok"; message.hidden = false; }
  }
  function fail(text) { loading.hidden = true; card.hidden = true; message.textContent = text; message.className = "message"; message.hidden = false; }
  async function lookup(rawCode) {
    const code = rawCode.trim().toUpperCase(); loading.hidden = false; card.hidden = true; message.hidden = true;
    try {
      const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (!res.ok) throw new Error("API unavailable");
      const json = await res.json();
      if (!json.found) return fail(json.message || "ไม่พบ Booking Code นี้");
      render(json.data, false);
    } catch (error) {
      if (DEMO_DATA[code]) return render(DEMO_DATA[code], true);
      fail("ยังเชื่อมต่อระบบจริงไม่ได้ และไม่พบโค้ดตัวอย่างนี้ ลอง BKM-0001 หรือ BKM-0002");
    }
  }
  form.addEventListener("submit", (event) => { event.preventDefault(); if (input.value.trim()) lookup(input.value); });
  const initialCode = new URLSearchParams(location.search).get("code"); if (initialCode) { input.value = initialCode; lookup(initialCode); }
})();
