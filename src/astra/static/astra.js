function fmtProvider(p) {
  if (!p) return "—";
  const map = { oracle: "Oracle", aws: "AWS", azure: "Azure" };
  return map[p] || p;
}

function renderAtina(items) {
  const ul = document.getElementById("atina_log");
  if (!ul) return;
  ul.innerHTML = "";
  (items || []).forEach((row) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.innerHTML = `<span class="tag tag--atina">Atina</span> <code>${row.batch_code || ""}</code> ${row.summary || ""}`;
    const right = document.createElement("div");
    right.textContent = row.created_at ? String(row.created_at).replace("T", " ").slice(0, 19) : "";
    right.style.color = "#8b98a8";
    li.appendChild(left);
    li.appendChild(right);
    ul.appendChild(li);
  });
}

function renderLog(items) {
  const ul = document.getElementById("log");
  ul.innerHTML = "";
  (items || []).forEach((row) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.innerHTML = `<span class="tag">${fmtProvider(row.provider)}</span> ${row.message || ""}`;
    const right = document.createElement("div");
    right.textContent = `−${Number(row.cost_rsd).toFixed(2)} RSD`;
    right.style.color = "#8b98a8";
    li.appendChild(left);
    li.appendChild(right);
    ul.appendChild(li);
  });
}

async function tick() {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    if (!res.ok) throw new Error("status " + res.status);
    const d = await res.json();
    document.getElementById("remaining").textContent = `${d.remaining_rsd.toFixed(2)} RSD`;
    document.getElementById("initial").textContent = d.initial_budget_rsd.toFixed(2);
    document.getElementById("rcount").textContent = String(d.resource_count);
    document.getElementById("lastp").textContent = fmtProvider(d.last_provider);
    renderLog(d.recent_forge_log);
    const ac = document.getElementById("atina_count");
    const ap = document.getElementById("atina_pending");
    if (ac) ac.textContent = String(d.atina_supply_count ?? 0);
    if (ap) ap.textContent = String(d.atina_pending_resources ?? 0);
    renderAtina(d.recent_atina_supply);
  } catch (e) {
    document.getElementById("remaining").textContent = "Greška veze";
    console.error(e);
  }
}

tick();
setInterval(tick, 2000);
