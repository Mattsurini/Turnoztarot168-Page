/** Turboztarot168 Reading Status frontend — calls the server-side adapter only. */
(function () {
  "use strict";

  const API_URL = "/api/reading-status";
  const FIELD_LABELS = {
    bookingCode: "รหัสจอง",
    displayName: "ชื่อที่แสดง",
    packageName: "แพ็กเกจ",
    status: "สถานะ",
    queueAcceptedDate: "วันที่รับเข้าคิว",
    deliveryDate: "กำหนดส่ง",
    lastUpdated: "อัปเดตล่าสุด",
    publicNote: "หมายเหตุ",
  };
  const form = document.getElementById("status-form");
  const input = document.getElementById("booking-code");
  const resultCard = document.getElementById("result-card");
  const resultFields = document.getElementById("result-fields");
  const errorMsg = document.getElementById("error-msg");
  const loadingEl = document.getElementById("loading");

  function showLoading() {
    loadingEl.hidden = false;
    resultCard.hidden = true;
    errorMsg.hidden = true;
  }

  function showError(message) {
    loadingEl.hidden = true;
    resultCard.hidden = true;
    errorMsg.hidden = false;
    errorMsg.textContent = message;
  }

  function showResult(data) {
    loadingEl.hidden = true;
    errorMsg.hidden = true;
    resultFields.replaceChildren();
    Object.entries(FIELD_LABELS).forEach(([key, label]) => {
      const value = data[key];
      if (value === null || value === undefined || value === "") return;
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = Array.isArray(value) ? value.join(", ") : String(value);
      resultFields.append(dt, dd);
    });
    resultCard.hidden = false;
  }

  async function lookup(code) {
    showLoading();
    try {
      const response = await fetch(`${API_URL}?bookingCode=${encodeURIComponent(code)}`, { method: "GET", headers: { Accept: "application/json" } });
      const data = await response.json();
      if (response.status === 404) return showError("ไม่พบ Booking Code นี้ — กรุณาตรวจสอบรหัสอีกครั้ง หรือติดต่อ Turboztarot168 ทาง LINE OA");
      if (!response.ok) return showError(data.error || "ไม่สามารถตรวจสอบสถานะได้ในขณะนี้");
      showResult(data);
    } catch (error) {
      showError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ — กรุณาลองใหม่ภายหลัง");
    }
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const code = input.value.trim();
    if (!code) return showError("กรุณากรอก Booking Code");
    lookup(code);
  });

  const initialCode = new URLSearchParams(window.location.search).get("bookingCode");
  if (initialCode) { input.value = initialCode; lookup(initialCode.trim()); }
})();
