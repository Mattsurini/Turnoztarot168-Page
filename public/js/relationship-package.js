(function () {
  "use strict";
  const list = document.getElementById("relationship-list");
  const loading = document.getElementById("relationship-loading");
  const error = document.getElementById("relationship-error");
  const errorText = document.getElementById("relationship-error-text");
  const retry = document.getElementById("relationship-retry");
  const empty = document.getElementById("relationship-empty");

  function showState(state) {
    loading.hidden = state !== "loading";
    error.hidden = state !== "error";
    empty.hidden = state !== "empty";
    list.hidden = state !== "ready";
  }

  function card(item, index) {
    const article = document.createElement("article");
    article.className = "relationship-card";
    article.dataset.odId = `relationship-card-${index + 1}`;
    const top = document.createElement("div"); top.className = "relationship-card-top";
    const indexLabel = document.createElement("span"); indexLabel.className = "relationship-index"; indexLabel.textContent = `0${index + 1}`; top.append(indexLabel);
    if (item.special) { const special = document.createElement("span"); special.className = "relationship-special"; special.textContent = item.special; top.append(special); }
    const title = document.createElement("h2"); title.textContent = item.name || "";
    const detail = document.createElement("p"); detail.className = "relationship-detail"; detail.textContent = item.detail || "";
    const meta = document.createElement("dl"); meta.className = "relationship-meta";
    const metaItem = (label, value) => { const wrap = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = label; dd.textContent = value == null || value === "" ? "—" : String(value); wrap.append(dt, dd); return wrap; };
    meta.append(metaItem("ราคา", item.price), metaItem("กำหนดส่ง", item.due));
    article.append(top, title, detail, meta);
    return article;
  }

  async function loadPackages() {
    showState("loading");
    try {
      const response = await fetch("/api/relationship-package", { headers: { Accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "API error");
      if (!Array.isArray(payload.items) || payload.items.length === 0) return showState("empty");
      list.replaceChildren(...payload.items.map(card));
      showState("ready");
    } catch (requestError) {
      errorText.textContent = "ยังโหลดแพ็กเกจไม่ได้ กรุณาลองใหม่อีกครั้ง";
      showState("error");
    }
  }

  retry?.addEventListener("click", loadPackages);
  loadPackages();
})();
