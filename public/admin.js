/* VSPARK admin panel - login, list, search, filter, verify, delete, export. */
const $ = (id) => document.getElementById(id);
const views = { login: $("loginView"), dash: $("dashView") };

let token = sessionStorage.getItem("vsparkAdminToken");
let registrations = [];

// ---------- API helper ----------
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 && path !== "/api/admin/login") logout();
  return res;
}

// ---------- Auth ----------
function logout() {
  token = null;
  sessionStorage.removeItem("vsparkAdminToken");
  views.dash.hidden = true;
  views.login.hidden = false;
  $("logoutBtn").hidden = true;
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("loginError").hidden = true;
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: $("username").value, password: $("password").value }),
  });
  const data = await res.json();
  if (!res.ok) {
    $("loginError").textContent = data.error;
    $("loginError").hidden = false;
    return;
  }
  token = data.token;
  sessionStorage.setItem("vsparkAdminToken", token);
  showDashboard();
});

$("logoutBtn").addEventListener("click", logout);

// ---------- Dashboard ----------
async function showDashboard() {
  const res = await api("/api/admin/registrations");
  if (!res.ok) return;
  registrations = await res.json();
  views.login.hidden = true;
  views.dash.hidden = false;
  $("logoutBtn").hidden = false;
  renderInstituteFilter();
  render();
}

function renderInstituteFilter() {
  const names = [...new Set(registrations.flatMap((r) => r.members.map((m) => m.institute)))].sort();
  const current = $("instituteFilter").value;
  $("instituteFilter").innerHTML = '<option value="">All institutes</option>' +
    names.map((n) => `<option>${escapeHtml(n)}</option>`).join("");
  $("instituteFilter").value = current;
}

function renderStats() {
  const participants = registrations.reduce((sum, r) => sum + r.members.length, 0);
  const verified = registrations.filter((r) => r.paymentVerified).length;
  const stats = [
    [registrations.length, "Teams"],
    [participants, "Participants"],
    [verified, "Payments verified"],
    [registrations.length - verified, "Payments pending"],
    [`PKR ${(verified * 1000).toLocaleString()}`, "Verified collection"],
  ];
  $("stats").innerHTML = stats.map(([v, l]) => `<div class="stat"><strong>${v}</strong><span>${l}</span></div>`).join("");
}

function filtered() {
  const q = $("search").value.toLowerCase().trim();
  const institute = $("instituteFilter").value;
  const payment = $("paymentFilter").value;

  return registrations.filter((r) => {
    const text = [r.id, r.teamName, r.email, r.phone, r.transactionId,
      ...r.members.flatMap((m) => [m.name, m.regNo])].join(" ").toLowerCase();
    return (!q || text.includes(q)) &&
      (!institute || r.members.some((m) => m.institute === institute)) &&
      (!payment || (payment === "verified") === Boolean(r.paymentVerified));
  });
}

function render() {
  renderStats();
  const list = filtered();
  $("empty").hidden = list.length > 0;
  $("rows").innerHTML = list.slice().reverse().map(rowHtml).join("");
}

function rowHtml(r) {
  const members = r.members.map((m) => `
    <div class="member">
      <strong>${escapeHtml(m.name)}</strong> <code>${escapeHtml(m.regNo)}</code>
      <small>${escapeHtml(m.program || "")} · ${escapeHtml(m.institute || "")}</small>
    </div>`).join("");
  const date = new Date(r.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return `<tr>
    <td><code>${r.id}</code></td>
    <td>${r.teamName ? `<div class="team">${escapeHtml(r.teamName)}</div>` : ""}${members}</td>
    <td>${escapeHtml(r.email)}<br /><small>${escapeHtml(r.phone)}</small></td>
    <td>${escapeHtml(r.paymentMethod)}<br /><small>${escapeHtml(r.transactionId)}</small><br />
      <button class="pill ${r.paymentVerified ? "ok" : "wait"}" data-verify="${r.id}">
        ${r.paymentVerified ? "Verified" : "Pending"}</button></td>
    <td><small>${date}</small></td>
    <td><button class="link-btn danger" data-delete="${r.id}">Delete</button></td>
  </tr>`;
}

// ---------- Actions ----------
$("rows").addEventListener("click", async (e) => {
  const verifyId = e.target.dataset.verify;
  const deleteId = e.target.dataset.delete;

  if (verifyId) {
    const res = await api(`/api/admin/registrations/${verifyId}/verify`, { method: "PATCH" });
    if (res.ok) {
      const updated = await res.json();
      registrations = registrations.map((r) => (r.id === verifyId ? updated : r));
      render();
    }
  }
  if (deleteId && confirm(`Delete registration ${deleteId}? This can't be undone.`)) {
    const res = await api(`/api/admin/registrations/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      registrations = registrations.filter((r) => r.id !== deleteId);
      renderInstituteFilter();
      render();
    }
  }
});

$("exportBtn").addEventListener("click", async () => {
  const res = await api("/api/admin/export.csv");
  if (!res.ok) return;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(await res.blob());
  link.download = "vspark-registrations.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

["search", "instituteFilter", "paymentFilter"].forEach((id) => $(id).addEventListener("input", render));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

if (token) showDashboard();
