(function () {
  "use strict";
  const list = document.getElementById("qa-list");
  const loading = document.getElementById("qa-loading");
  const error = document.getElementById("qa-error");
  const errorText = document.getElementById("qa-error-text");
  const retry = document.getElementById("qa-retry");
  const empty = document.getElementById("qa-empty");

  function showState(state) {
    loading.hidden = state !== "loading";
    error.hidden = state !== "error";
    empty.hidden = state !== "empty";
    list.hidden = state !== "ready";
  }

  function card(item, index) {
    const article = document.createElement("article");
    article.className = "qa-card";
    article.dataset.odId = `qa-card-${index + 1}`;
    const top = document.createElement("div"); top.className = "qa-card-top";
    const indexLabel = document.createElement("span"); indexLabel.className = "qa-index"; indexLabel.textContent = `0${index + 1}`; top.append(indexLabel);
    if (item.special) { const special = document.createElement("span"); special.className = "qa-special"; special.textContent = item.special; top.append(special); }
    const title = document.createElement("h2"); title.textContent = item.name || "";
    const detail = document.createElement("p"); detail.className = "qa-detail"; detail.textContent = item.detail || "";
    const meta = document.createElement("dl"); meta.className = "qa-meta";
    const metaItem = (label, value) => { const wrap = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = label; dd.textContent = value == null || value === "" ? "—" : String(value); wrap.append(dt, dd); return wrap; };
    meta.append(metaItem("ราคา", item.price), metaItem("กำหนดส่ง", item.due));
    article.append(top, title, detail, meta);
    return article;
  }

  async function loadPackages() {
    showState("loading");
    try {
      const response = await fetch("/api/q-and-a", { headers: { Accept: "application/json" } });
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
