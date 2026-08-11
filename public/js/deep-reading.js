(function () {
  "use strict";
  const list = document.getElementById("deep-reading-list");
  const loading = document.getElementById("deep-reading-loading");
  const error = document.getElementById("deep-reading-error");
  const errorText = document.getElementById("deep-reading-error-text");
  const retry = document.getElementById("deep-reading-retry");
  const empty = document.getElementById("deep-reading-empty");

  function showState(state) {
    loading.hidden = state !== "loading";
    error.hidden = state !== "error";
    empty.hidden = state !== "empty";
    list.hidden = state !== "ready";
  }

  function card(item, index) {
    const article = document.createElement("article");
    article.className = "deep-reading-card";
    article.dataset.odId = `deep-reading-card-${index + 1}`;
    const top = document.createElement("div"); top.className = "deep-reading-card-top";
    const indexLabel = document.createElement("span"); indexLabel.className = "deep-reading-index"; indexLabel.textContent = `0${index + 1}`; top.append(indexLabel);
    if (item.special) { const special = document.createElement("span"); special.className = "deep-reading-special"; special.textContent = item.special; top.append(special); }
    const title = document.createElement("h2"); title.textContent = item.name || "";
    const detail = document.createElement("p"); detail.className = "deep-reading-detail"; detail.textContent = item.detail || "";
    const meta = document.createElement("dl"); meta.className = "deep-reading-meta";
    const metaItem = (label, value) => { const wrap = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = label; dd.textContent = value == null || value === "" ? "—" : String(value); wrap.append(dt, dd); return wrap; };
    meta.append(metaItem("ราคา", item.price), metaItem("กำหนดส่ง", item.due));
    article.append(top, title, detail, meta);
    return article;
  }

  async function loadPackages() {
    showState("loading");
    try {
      const response = await fetch("/api/deep-reading", { headers: { Accept: "application/json" } });
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
