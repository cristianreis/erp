const metalTypes = ["Ferro fundido", "Aco carbono", "Aco inox", "Aluminio", "Bronze", "Latao", "Outro"];

const statusLabel = {
  open: "Solicitado",
  confirmed: "Confirmado",
  partial: "Recebido parcial",
  complete: "Recebido completo",
  delayed: "Atrasado",
  canceled: "Cancelado",
};

const statusClass = {
  open: "status-open",
  confirmed: "status-production",
  partial: "status-partial",
  complete: "status-complete",
  delayed: "status-delayed",
  canceled: "status-canceled",
};

let state = {
  settings: {},
  suppliers: [],
  products: [],
  requests: [],
  users: [],
};
let activeView = "dashboard";
let selectedRequestId = null;
let calendarMode = "week";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || "Falha na operacao");
  }
  return response.json();
}

async function post(path, payload) {
  return api(path, { method: "POST", body: JSON.stringify(payload) });
}

async function loadState() {
  state = await api("/api/state");
  render();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value, amount) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(value) {
  const date = parseDate(value);
  date.setDate(date.getDate() - date.getDay());
  return date.toISOString().slice(0, 10);
}

function startOfMonth(value) {
  const date = parseDate(value);
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonth(value) {
  const date = parseDate(value);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function diffDays(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / 86400000);
}

function formatDate(value) {
  if (!value) return "-";
  return parseDate(value).toLocaleDateString("pt-BR");
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatWeight(value) {
  return `${formatNumber(value, 1)} kg`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusDescription(status) {
  const text = {
    open: "Solicitacao criada, aguardando confirmacao ou andamento.",
    confirmed: "Fornecedor confirmou a solicitacao ou esta produzindo.",
    partial: "Parte da quantidade solicitada ja foi recebida.",
    complete: "Quantidade solicitada recebida integralmente.",
    delayed: "Previsao vencida com saldo pendente.",
    canceled: "Solicitacao cancelada.",
  };
  return text[status] || "";
}

function statusBadge(status) {
  return `<span class="status-badge ${statusClass[status] || "status-open"} info-tip" data-tip="${escapeHtml(statusDescription(status))}">${statusLabel[status] || status}</span>`;
}

function helpTip(text) {
  return `<span class="help-tip info-tip" tabindex="0" data-tip="${escapeHtml(text)}">i</span>`;
}

function viewTitle(view) {
  return {
    dashboard: "Dashboard",
    suppliers: "Fornecedores",
    products: "Produtos fundidos",
    orders: "Solicitacoes",
    calendar: "Calendario de recebimentos",
    orderDetail: "Detalhes da solicitacao",
    reports: "Relatorios",
    settings: "Configuracoes",
  }[view] || "Dashboard";
}

function setView(view, requestId = null) {
  activeView = view;
  selectedRequestId = requestId;
  $$(".view").forEach((element) => element.classList.toggle("active", element.id === view));
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("#pageTitle").textContent = viewTitle(view);
  $("#backButton").hidden = view === "dashboard";
  $(".sidebar").classList.remove("open");
  render();
}

function getRequest(id) {
  return state.requests.find((item) => Number(item.id) === Number(id));
}

function activeRequests() {
  return state.requests.filter((item) => !["complete", "canceled"].includes(item.metrics.status));
}

function render() {
  document.title = `${state.settings.company_name || "Controle de Fundidos"} | Solicitacoes`;
  $(".brand strong").textContent = state.settings.company_name || "Fundidos";
  $("#dbStatus").textContent = "SQLite conectado";
  $("#dbStatus").dataset.tone = "ok";
  $("#todayLabel").textContent = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  renderAlerts();
  renderFilters();
  renderDashboardFilters();

  if (activeView === "dashboard") renderDashboard();
  if (activeView === "suppliers") renderSuppliers();
  if (activeView === "products") renderProducts();
  if (activeView === "orders") renderOrders();
  if (activeView === "calendar") renderCalendar();
  if (activeView === "orderDetail") renderOrderDetail();
  if (activeView === "reports") renderReports();
  if (activeView === "settings") renderSettings();
}

function renderAlerts() {
  const alerts = [];
  const alertDays = Number(state.settings.alert_window_days || 3);
  state.requests.forEach((request) => {
    if (request.metrics.status === "delayed") {
      alerts.push({
        tone: "danger",
        id: request.id,
        title: `Solicitacao ${request.number} atrasada`,
        text: `${request.supplier_name} possui ${formatNumber(request.metrics.pending)} pendente.`,
      });
    }
    if (request.metrics.next_date) {
      const days = diffDays(todayISO(), request.metrics.next_date);
      if (days >= 0 && days <= alertDays && !["complete", "canceled"].includes(request.metrics.status)) {
        alerts.push({
          tone: "warning",
          id: request.id,
          title: `Recebimento proximo: ${request.number}`,
          text: `${formatDate(request.metrics.next_date)} - ${request.product_name}.`,
        });
      }
    }
    if (request.metrics.over_received) {
      alerts.push({
        tone: "danger",
        id: request.id,
        title: `Divergencia na solicitacao ${request.number}`,
        text: "Quantidade recebida maior que a solicitada.",
      });
    }
  });
  $("#alerts").innerHTML = alerts.slice(0, 5).map((alert) => `
    <article class="alert ${alert.tone === "danger" ? "danger" : ""}">
      <div><strong>${alert.title}</strong><span>${alert.text}</span></div>
      <button class="alert-action" data-request-open="${alert.id}" type="button">Abrir</button>
    </article>
  `).join("");
}

function renderDashboard() {
  const active = activeRequests();
  const delayed = state.requests.filter((item) => item.metrics.status === "delayed");
  const partial = state.requests.filter((item) => item.metrics.status === "partial");
  const today = todayISO();
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const pendingWeight = state.requests.reduce((total, item) => {
    return total + item.metrics.pending * Number(item.product_unit_weight || 0);
  }, 0);
  const countByDate = (start, end) => state.requests.filter((item) => {
    const date = item.metrics.next_date;
    return date && date >= start && date <= end && !["complete", "canceled"].includes(item.metrics.status);
  }).length;
  const metrics = [
    ["Solicitacoes abertas", active.length, "Com saldo a receber", "", "Solicitacoes ainda nao concluidas."],
    ["Atrasadas", delayed.length, "Fornecedor fora do prazo", delayed.length ? "danger" : "success", "Previsao vencida com saldo pendente."],
    ["Parciais", partial.length, "Recebidas incompletas", partial.length ? "warning" : "", "Ja houve recebimento, mas ainda existe saldo."],
    ["Receber hoje", countByDate(today, today), formatDate(today), "", "Recebimentos previstos para hoje."],
    ["Receber na semana", countByDate(weekStart, weekEnd), `${formatDate(weekStart)} a ${formatDate(weekEnd)}`, "", "Recebimentos previstos na semana atual."],
    ["Receber no mes", countByDate(monthStart, monthEnd), "Mes atual", "", "Recebimentos previstos no mes atual."],
    ["Peso pendente", formatWeight(pendingWeight), "Estimado", "", "Pendente multiplicado pelo peso unitario cadastrado."],
    ["Produtos cadastrados", state.products.length, "Disponiveis", "", "Produtos que podem ser usados em solicitacoes."],
  ];
  $("#metricsGrid").innerHTML = metrics.map(([label, value, hint, tone, tip]) => `
    <article class="metric-card ${tone}">
      <p>${label} ${helpTip(tip)}</p>
      <strong>${value}</strong>
      <span>${hint}</span>
    </article>
  `).join("");
  renderDashboardTracking();
  renderUpcoming();
  renderMetalBars();
  renderCritical();
}

function renderDashboardFilters() {
  const supplier = $("#dashSupplier");
  if (!supplier) return;
  const currentSupplier = supplier.value;
  const currentStatus = $("#dashStatus").value;
  supplier.innerHTML = `<option value="">Todos</option>${state.suppliers.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}`;
  $("#dashStatus").innerHTML = `<option value="">Todos</option>${Object.entries(statusLabel).map(([key, value]) => `<option value="${key}">${value}</option>`).join("")}`;
  supplier.value = currentSupplier;
  $("#dashStatus").value = currentStatus;
}

function dashboardRows() {
  const supplier = $("#dashSupplier")?.value || "";
  const status = $("#dashStatus")?.value || "";
  const start = $("#dashStartDate")?.value || "";
  const end = $("#dashEndDate")?.value || "";
  const delayed = $("#dashDelayed")?.checked || false;
  const openOnly = $("#dashOpenOnly")?.checked || false;
  return state.requests.filter((item) => {
    const date = item.metrics.next_date || "";
    if (supplier && String(item.supplier_id) !== supplier) return false;
    if (status && item.metrics.status !== status) return false;
    if (start && date < start) return false;
    if (end && date > end) return false;
    if (delayed && item.metrics.status !== "delayed") return false;
    if (openOnly && ["complete", "canceled"].includes(item.metrics.status)) return false;
    return true;
  });
}

function renderDashboardTracking() {
  const rows = dashboardRows();
  $("#dashboardTrackingBody").innerHTML = rows.length ? rows.map(requestRow).join("") :
    `<tr><td colspan="8" class="empty-state">Nenhuma solicitacao para acompanhar.</td></tr>`;
}

function requestRow(item) {
  return `
    <tr class="clickable-row" data-request-open="${item.id}">
      <td><strong>${escapeHtml(item.number)}</strong></td>
      <td>${escapeHtml(item.supplier_name)}</td>
      <td>${escapeHtml(item.product_name)}</td>
      <td>${formatNumber(item.total_qty)}</td>
      <td>${formatNumber(item.metrics.received)}</td>
      <td>${formatNumber(item.metrics.pending)}</td>
      <td>${formatDate(item.metrics.next_date)}</td>
      <td>${statusBadge(item.metrics.status)}</td>
    </tr>
  `;
}

function renderUpcoming() {
  const rows = state.requests
    .filter((item) => item.metrics.next_date && !["complete", "canceled"].includes(item.metrics.status))
    .sort((a, b) => a.metrics.next_date.localeCompare(b.metrics.next_date))
    .slice(0, 6);
  $("#upcomingList").innerHTML = rows.length ? rows.map((item) => `
    <article class="list-item clickable-row" data-request-open="${item.id}">
      <div>
        <strong>${formatDate(item.metrics.next_date)} - ${escapeHtml(item.number)}</strong>
        <span>${escapeHtml(item.supplier_name)} - ${escapeHtml(item.product_name)} - pendente ${formatNumber(item.metrics.pending)}</span>
      </div>
      ${statusBadge(item.metrics.status)}
    </article>
  `).join("") : `<div class="empty-state">Nenhum recebimento previsto.</div>`;
}

function renderMetalBars() {
  const totals = {};
  state.requests.forEach((item) => {
    totals[item.metal] = (totals[item.metal] || 0) + item.metrics.pending * Number(item.product_unit_weight || 0);
  });
  const rows = Object.entries(totals).filter(([, value]) => value > 0);
  const max = Math.max(...rows.map(([, value]) => value), 1);
  $("#metalBars").innerHTML = rows.length ? rows.map(([metal, value]) => `
    <div class="bar-row">
      <header><span>${escapeHtml(metal)}</span><span>${formatWeight(value)}</span></header>
      <div class="bar-track"><div class="bar-fill" style="width:${(value / max) * 100}%"></div></div>
    </div>
  `).join("") : `<div class="empty-state">Nenhuma pendencia por metal.</div>`;
}

function renderCritical() {
  const rows = state.requests.filter((item) => {
    return item.metrics.status === "delayed" || item.metrics.status === "partial" || item.metrics.next_date === todayISO();
  });
  $("#criticalOrdersBody").innerHTML = rows.length ? rows.slice(0, 6).map((item) => `
    <article class="list-item clickable-row" data-request-open="${item.id}">
      <div>
        <strong>${escapeHtml(item.number)} - ${escapeHtml(item.supplier_name)}</strong>
        <span>${escapeHtml(item.product_name)} - previsao ${formatDate(item.metrics.next_date)} - pendente ${formatNumber(item.metrics.pending)}</span>
      </div>
      ${statusBadge(item.metrics.status)}
    </article>
  `).join("") : `<div class="empty-state">Nenhuma solicitacao critica.</div>`;
}

function renderSuppliers() {
  $("#suppliersGrid").innerHTML = state.suppliers.length ? state.suppliers.map((supplier) => {
    const requests = state.requests.filter((item) => Number(item.supplier_id) === Number(supplier.id));
    const open = requests.filter((item) => !["complete", "canceled"].includes(item.metrics.status));
    const delayed = requests.filter((item) => item.metrics.status === "delayed");
    const next = open.filter((item) => item.metrics.next_date).sort((a, b) => a.metrics.next_date.localeCompare(b.metrics.next_date))[0];
    return `
      <article class="entity-card">
        <div class="entity-card-header">
          <h3>${escapeHtml(supplier.name)}</h3>
          ${delayed.length ? `<span class="status-badge status-delayed">${delayed.length} atraso(s)</span>` : `<span class="status-badge status-open">${open.length} aberta(s)</span>`}
        </div>
        <dl>
          <div><dt>CNPJ / Codigo</dt><dd>${escapeHtml(supplier.document)}</dd></div>
          <div><dt>Contato</dt><dd>${escapeHtml(supplier.contact)}</dd></div>
          <div><dt>Telefone</dt><dd>${escapeHtml(supplier.phone)}</dd></div>
          <div><dt>E-mail</dt><dd>${escapeHtml(supplier.email)}</dd></div>
          <div><dt>Proximo recebimento ${helpTip("Menor data prevista entre solicitacoes abertas deste fornecedor.")}</dt><dd>${next ? `${formatDate(next.metrics.next_date)} - ${escapeHtml(next.product_name)}` : "-"}</dd></div>
          <div><dt>Observacoes</dt><dd>${escapeHtml(supplier.notes)}</dd></div>
        </dl>
        <button class="secondary-button table-action" data-supplier-track="${supplier.id}" type="button">Acompanhar</button>
      </article>
    `;
  }).join("") : `<div class="empty-state wide-empty">Nenhum fornecedor cadastrado.</div>`;
}

function renderProducts() {
  $("#productsBody").innerHTML = state.products.length ? state.products.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.code)}</strong></td>
      <td>${escapeHtml(item.name)}<br><span class="muted">${escapeHtml(item.description)}</span></td>
      <td><span class="metal-badge">${escapeHtml(item.metal)}</span></td>
      <td>${formatWeight(item.unit_weight)}</td>
      <td>${escapeHtml(item.unit)}</td>
      <td>${escapeHtml(item.technical_notes)}</td>
      <td><span class="muted">Salvo no banco</span></td>
    </tr>
  `).join("") : `<tr><td colspan="7" class="empty-state">Nenhum produto fundido cadastrado.</td></tr>`;
}

function renderFilters() {
  const supplier = $("#filterSupplier");
  if (!supplier) return;
  const current = {
    supplier: supplier.value,
    metal: $("#filterMetal").value,
    product: $("#filterProduct").value,
    status: $("#filterStatus").value,
  };
  supplier.innerHTML = `<option value="">Todos</option>${state.suppliers.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}`;
  $("#filterMetal").innerHTML = `<option value="">Todos</option>${metalTypes.map((item) => `<option value="${item}">${item}</option>`).join("")}`;
  $("#filterProduct").innerHTML = `<option value="">Todos</option>${state.products.map((item) => `<option value="${item.id}">${escapeHtml(item.code)} - ${escapeHtml(item.name)}</option>`).join("")}`;
  $("#filterStatus").innerHTML = `<option value="">Todos</option>${Object.entries(statusLabel).map(([key, value]) => `<option value="${key}">${value}</option>`).join("")}`;
  supplier.value = current.supplier;
  $("#filterMetal").value = current.metal;
  $("#filterProduct").value = current.product;
  $("#filterStatus").value = current.status;
}

function filteredRequests() {
  const supplier = $("#filterSupplier")?.value || "";
  const metal = $("#filterMetal")?.value || "";
  const product = $("#filterProduct")?.value || "";
  const status = $("#filterStatus")?.value || "";
  const date = $("#filterDate")?.value || "";
  const delayed = $("#filterDelayed")?.checked || false;
  const partial = $("#filterPartial")?.checked || false;
  const complete = $("#filterComplete")?.checked || false;
  return state.requests.filter((item) => {
    if (supplier && String(item.supplier_id) !== supplier) return false;
    if (metal && item.metal !== metal) return false;
    if (product && String(item.product_id) !== product) return false;
    if (status && item.metrics.status !== status) return false;
    if (date && item.metrics.next_date !== date) return false;
    if (delayed && item.metrics.status !== "delayed") return false;
    if (partial && item.metrics.status !== "partial") return false;
    if (complete && item.metrics.status !== "complete") return false;
    return true;
  });
}

function renderOrders() {
  const rows = filteredRequests();
  $("#ordersBody").innerHTML = rows.length ? rows.map(requestRow).join("") :
    `<tr><td colspan="9" class="empty-state">Nenhuma solicitacao encontrada.</td></tr>`;
}

function renderCalendar() {
  const today = todayISO();
  let start = today;
  let length = 1;
  if (calendarMode === "week") {
    start = startOfWeek(today);
    length = 7;
  }
  if (calendarMode === "month") {
    start = startOfMonth(today);
    length = diffDays(start, endOfMonth(today)) + 1;
  }
  const days = Array.from({ length }, (_, index) => addDays(start, index));
  const visible = state.requests.filter((item) => item.metrics.next_date && days.includes(item.metrics.next_date));
  const delayed = state.requests.filter((item) => item.metrics.status === "delayed");
  $("#calendarSummary").innerHTML = [
    ["Recebimentos no periodo", visible.length, "Previsoes"],
    ["Atrasadas", delayed.length, "Fora do prazo"],
    ["Saldo pendente", formatNumber(visible.reduce((sum, item) => sum + item.metrics.pending, 0)), "Quantidade"],
  ].map(([label, value, hint]) => `<article class="metric-card"><p>${label}</p><strong>${value}</strong><span>${hint}</span></article>`).join("");
  const delayedBlock = delayed.length && calendarMode !== "day" ? `
    <article class="calendar-day">
      <header><span>Atrasadas</span><span>${delayed.length}</span></header>
      ${delayed.map(calendarEvent).join("")}
    </article>
  ` : "";
  $("#calendarGrid").innerHTML = delayedBlock + days.map((day) => {
    const items = visible.filter((item) => item.metrics.next_date === day);
    return `
      <article class="calendar-day ${day === today ? "today" : ""}">
        <header><span>${formatDate(day)}</span><span>${items.length}</span></header>
        ${items.length ? items.map(calendarEvent).join("") : `<div class="muted">Sem recebimentos</div>`}
      </article>
    `;
  }).join("");
}

function calendarEvent(item) {
  const css = item.metrics.status === "delayed" ? "delayed" : item.metrics.status === "partial" ? "partial" : "";
  return `
    <button class="calendar-event ${css}" data-request-open="${item.id}" type="button">
      <strong>${escapeHtml(item.number)} - ${formatNumber(item.metrics.pending)} pend.</strong>
      <span>${escapeHtml(item.supplier_name)}</span>
      <span>${escapeHtml(item.product_name)}</span>
    </button>
  `;
}

function renderOrderDetail() {
  const item = getRequest(selectedRequestId) || state.requests[0];
  if (!item) {
    $("#orderDetailContent").innerHTML = `<div class="empty-state">Nenhuma solicitacao selecionada.</div>`;
    return;
  }
  selectedRequestId = item.id;
  $("#orderDetailContent").innerHTML = `
    <section class="detail-hero">
      <header>
        <div>
          <p class="eyebrow">Solicitacao ${escapeHtml(item.number)}</p>
          <h2>${escapeHtml(item.product_name)}</h2>
          <p class="muted">${escapeHtml(item.supplier_name)} - ${escapeHtml(item.metal)}</p>
        </div>
        ${statusBadge(item.metrics.status)}
      </header>
      <div class="data-grid">
        <div class="data-tile"><span>Solicitada</span><strong>${formatNumber(item.total_qty)} ${escapeHtml(item.product_unit)}</strong></div>
        <div class="data-tile"><span>Recebida</span><strong>${formatNumber(item.metrics.received)}</strong></div>
        <div class="data-tile"><span>Pendente</span><strong>${formatNumber(item.metrics.pending)}</strong></div>
        <div class="data-tile"><span>Previsao</span><strong>${formatDate(item.metrics.next_date)}</strong></div>
        <div class="data-tile"><span>Solicitante</span><strong>${escapeHtml(item.requester)}</strong></div>
        <div class="data-tile"><span>Retorno fornecedor</span><strong>${escapeHtml(item.supplier_confirmation)}</strong></div>
      </div>
      <div class="detail-actions" style="margin-top:14px">
        <button class="primary-button" data-delivery="${item.id}" type="button">Registrar recebimento</button>
        <button class="secondary-button" data-forecast="${item.id}" type="button">Atualizar previsao</button>
      </div>
    </section>
    <div class="detail-layout">
      <section class="panel">
        <div class="panel-header"><div><h2>Recebimentos</h2><p>Historico de previsoes e entradas.</p></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Prevista</th><th>Real</th><th>Prev.</th><th>Receb.</th><th>NF</th><th>Responsavel</th><th>Tipo</th></tr></thead>
            <tbody>
              ${item.deliveries.length ? item.deliveries.map((delivery) => `
                <tr>
                  <td>${formatDate(delivery.planned_date)}</td>
                  <td>${formatDate(delivery.actual_date)}</td>
                  <td>${formatNumber(delivery.planned_qty)}</td>
                  <td>${formatNumber(delivery.received_qty)}</td>
                  <td>${escapeHtml(delivery.invoice)}</td>
                  <td>${escapeHtml(delivery.receiver)}</td>
                  <td>${delivery.is_final ? "Final" : "Parcial"}</td>
                </tr>
              `).join("") : `<tr><td colspan="7" class="empty-state">Nenhum recebimento registrado.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><div><h2>Observacoes</h2><p>Dados registrados na solicitacao.</p></div></div>
        <div class="timeline">
          <article class="timeline-item"><strong>Solicitada em ${formatDate(item.request_date)}</strong><span>${escapeHtml(item.notes)}</span></article>
          <article class="timeline-item"><strong>Enviada ao fornecedor</strong><span>${formatDate(item.sent_date)} - ${escapeHtml(item.supplier_confirmation)}</span></article>
        </div>
      </section>
    </div>
  `;
}

function renderReports() {
  $("#reportConsolidatedBody").innerHTML = state.requests.length ? state.requests.map(requestRow).join("") :
    `<tr><td colspan="9" class="empty-state">Nenhuma solicitacao para relatorio.</td></tr>`;
  const bySupplier = state.suppliers.map((supplier) => {
    const requests = state.requests.filter((item) => item.supplier_id === supplier.id);
    const pending = requests.reduce((sum, item) => sum + item.metrics.pending, 0);
    return [supplier.name, requests.length, formatNumber(pending)];
  });
  const delayed = state.requests.filter((item) => item.metrics.status === "delayed").map((item) => [item.number, item.supplier_name, formatDate(item.metrics.next_date)]);
  $("#reportsGrid").innerHTML = [
    reportTable("Solicitacoes por fornecedor", ["Fornecedor", "Solic.", "Pendente"], bySupplier),
    reportTable("Solicitacoes atrasadas", ["Solic.", "Fornecedor", "Previsao"], delayed),
  ].join("");
}

function reportTable(title, headers, rows) {
  return `
    <article class="report-card">
      <h3>${title}</h3>
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.length ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}" class="empty-state">Sem dados</td></tr>`}</tbody>
      </table>
    </article>
  `;
}

function renderSettings() {
  const settings = state.settings;
  const pending = activeRequests();
  const delayed = state.requests.filter((item) => item.metrics.status === "delayed");
  $("#settingsGrid").innerHTML = `
    <section class="settings-card settings-card-wide">
      <div class="panel-header"><div><h2>Preferencias de operacao</h2><p>Padroes aplicados nos cadastros e alertas. ${helpTip("Esses campos alimentam novas solicitacoes e a exportacao.")}</p></div></div>
      <form id="settingsForm" class="settings-form">
        <label>Nome do controle<input name="company_name" value="${escapeHtml(settings.company_name)}" /></label>
        <label>Solicitante padrao<input name="default_requester" value="${escapeHtml(settings.default_requester)}" /></label>
        <label>Responsavel pelo recebimento<input name="default_receiver" value="${escapeHtml(settings.default_receiver)}" /></label>
        <label>Unidade padrao<input name="default_unit" value="${escapeHtml(settings.default_unit)}" /></label>
        <label>Dias de alerta<input name="alert_window_days" type="number" min="0" value="${escapeHtml(settings.alert_window_days)}" /></label>
        <div class="settings-actions"><button class="primary-button" type="submit">Salvar configuracoes</button></div>
      </form>
    </section>
    <section class="settings-card">
      <h3>Banco de dados</h3>
      <div class="settings-stats">
        <div><span>Arquivo</span><strong>fundidos.db</strong></div>
        <div><span>Fornecedores</span><strong>${state.suppliers.length}</strong></div>
        <div><span>Produtos</span><strong>${state.products.length}</strong></div>
        <div><span>Solicitacoes abertas</span><strong>${pending.length}</strong></div>
        <div><span>Atrasadas</span><strong>${delayed.length}</strong></div>
      </div>
      <a class="secondary-button export-link" href="/api/export/excel">Exportar Excel</a>
    </section>
    <section class="settings-card">
      <h3>Regras automaticas</h3>
      <ul class="rule-list">
        <li>Saldo pendente apos a previsao gera status atrasado.</li>
        <li>Recebimento menor que o total gera status parcial.</li>
        <li>Recebimento igual ou maior que o total gera status completo.</li>
        <li>Produto define automaticamente o tipo de metal da solicitacao.</li>
      </ul>
    </section>
    <section class="settings-card settings-card-wide">
      <h3>Legenda de status</h3>
      <div class="status-legend">${Object.keys(statusLabel).map((key) => `<div>${statusBadge(key)}<span>${statusDescription(key)}</span></div>`).join("")}</div>
    </section>
  `;
}

function openModal(config) {
  $("#modalTitle").textContent = config.title;
  $("#modalEyebrow").textContent = config.eyebrow || "Cadastro";
  $("#modalFields").innerHTML = config.fields.map(fieldTemplate).join("");
  $("#modalForm").onsubmit = async (event) => {
    event.preventDefault();
    try {
      await config.onSave(Object.fromEntries(new FormData(event.currentTarget).entries()));
      closeModal();
      await loadState();
    } catch (error) {
      alert(error.message);
    }
  };
  $("#modalBackdrop").hidden = false;
  $("#modal").showModal();
}

function closeModal() {
  $("#modal").close();
  $("#modalBackdrop").hidden = true;
  $("#modalForm").reset();
}

function fieldTemplate(field) {
  const required = field.required ? "required" : "";
  const full = field.full ? "full" : "";
  const value = field.value ?? "";
  if (field.type === "hidden") {
    return `<input name="${field.name}" type="hidden" value="${escapeHtml(value)}" />`;
  }
  if (field.type === "select") {
    return `
      <label class="${full}">${field.label}
        <select name="${field.name}" ${required}>
          ${(field.options || []).map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        </select>
      </label>
    `;
  }
  if (field.type === "textarea") {
    return `<label class="${full}">${field.label}<textarea name="${field.name}" ${required}>${escapeHtml(value)}</textarea></label>`;
  }
  return `<label class="${full}">${field.label}<input name="${field.name}" type="${field.type || "text"}" value="${escapeHtml(value)}" ${required} ${field.step ? `step="${field.step}"` : ""} /></label>`;
}

function openSupplierModal() {
  openModal({
    title: "Novo fornecedor",
    fields: [
      { name: "name", label: "Nome do fornecedor", required: true },
      { name: "document", label: "CNPJ ou codigo interno" },
      { name: "contact", label: "Contato" },
      { name: "phone", label: "Telefone / WhatsApp" },
      { name: "email", label: "E-mail", type: "email" },
      { name: "notes", label: "Observacoes", type: "textarea", full: true },
    ],
    onSave: (data) => post("/api/suppliers", data),
  });
}

function openProductModal() {
  openModal({
    title: "Novo produto fundido",
    fields: [
      { name: "code", label: "Codigo do produto", required: true },
      { name: "name", label: "Nome do produto", required: true },
      { name: "description", label: "Descricao", full: true },
      { name: "metal", label: "Tipo de metal", type: "select", options: metalTypes.map((item) => ({ value: item, label: item })) },
      { name: "unit_weight", label: "Peso unitario", type: "number", step: "0.01" },
      { name: "unit", label: "Unidade", value: state.settings.default_unit || "pc" },
      { name: "technical_notes", label: "Observacoes tecnicas", type: "textarea", full: true },
    ],
    onSave: (data) => post("/api/products", data),
  });
}

function openRequestModal() {
  if (!state.suppliers.length || !state.products.length) {
    alert("Cadastre ao menos um fornecedor e um produto antes de criar a solicitacao.");
    return;
  }
  openModal({
    title: "Nova solicitacao",
    eyebrow: "Pedido ao fornecedor",
    fields: [
      { name: "number", label: "Numero da solicitacao", required: true },
      { name: "supplier_id", label: "Fornecedor", type: "select", options: state.suppliers.map((item) => ({ value: item.id, label: item.name })) },
      { name: "product_id", label: "Produto fundido", type: "select", options: state.products.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` })) },
      { name: "total_qty", label: "Quantidade solicitada", type: "number", required: true },
      { name: "request_date", label: "Data da solicitacao", type: "date", value: todayISO(), required: true },
      { name: "sent_date", label: "Data de envio ao fornecedor", type: "date", value: todayISO() },
      { name: "supplier_forecast_date", label: "Previsao de recebimento", type: "date" },
      { name: "requester", label: "Solicitante", value: state.settings.default_requester || "Compras" },
      { name: "supplier_confirmation", label: "Retorno do fornecedor", full: true },
      { name: "status_manual", label: "Situacao inicial", type: "select", options: [{ value: "open", label: "Solicitado" }, { value: "confirmed", label: "Confirmado" }, { value: "canceled", label: "Cancelado" }] },
      { name: "notes", label: "Observacoes", type: "textarea", full: true },
    ],
    onSave: (data) => post("/api/requests", data),
  });
}

function openDeliveryModal(requestId) {
  const request = getRequest(requestId);
  openModal({
    title: `Registrar recebimento ${request.number}`,
    fields: [
      { name: "request_id", label: "Solicitacao", value: requestId, type: "hidden" },
      { name: "planned_date", label: "Data prevista", type: "date", value: request.metrics.next_date || todayISO() },
      { name: "actual_date", label: "Data real", type: "date", value: todayISO(), required: true },
      { name: "planned_qty", label: "Quantidade prevista", type: "number", value: request.metrics.pending },
      { name: "received_qty", label: "Quantidade recebida", type: "number", value: request.metrics.pending, required: true },
      { name: "invoice", label: "Nota fiscal" },
      { name: "receiver", label: "Responsavel", value: state.settings.default_receiver || "Recebimento" },
      { name: "is_final", label: "Tipo", type: "select", options: [{ value: "", label: "Parcial" }, { value: "1", label: "Final" }] },
      { name: "notes", label: "Observacoes", type: "textarea", full: true },
    ],
    onSave: (data) => post("/api/deliveries", { ...data, is_final: Boolean(data.is_final) }),
  });
}

function openForecastModal(requestId) {
  const request = getRequest(requestId);
  openModal({
    title: `Atualizar previsao ${request.number}`,
    fields: [
      { name: "request_id", label: "Solicitacao", value: requestId, type: "hidden" },
      { name: "planned_date", label: "Nova previsao", type: "date", value: request.metrics.next_date || todayISO(), required: true },
      { name: "planned_qty", label: "Quantidade prevista", type: "number", value: request.metrics.pending, required: true },
      { name: "supplier_confirmation", label: "Retorno do fornecedor", value: request.supplier_confirmation || "", full: true },
      { name: "notes", label: "Observacoes", type: "textarea", full: true },
    ],
    onSave: (data) => post("/api/forecast", data),
  });
}

async function saveSettings(form) {
  await post("/api/settings", Object.fromEntries(new FormData(form).entries()));
  await loadState();
}

function bindEvents() {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  $("#menuButton").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
  $("#backButton").addEventListener("click", () => setView(activeView === "orderDetail" ? "orders" : "dashboard"));
  $("#newSupplierButton").addEventListener("click", openSupplierModal);
  $("#newProductButton").addEventListener("click", openProductModal);
  $("#newOrderButton").addEventListener("click", openRequestModal);
  $("#newOrderButtonAlt").addEventListener("click", openRequestModal);
  $("#resetDataButton").addEventListener("click", () => alert("Limpeza direta foi removida nesta versao. Os dados estao em fundidos.db; faca backup antes de qualquer manutencao."));
  $("#closeModalButton").addEventListener("click", closeModal);
  $("#cancelModalButton").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", (event) => {
    if (event.target.id === "modalBackdrop") closeModal();
  });
  $("#exportExcelButton").addEventListener("click", () => {
    window.location.href = "/api/export/excel";
  });
  ["filterSupplier", "filterMetal", "filterProduct", "filterStatus", "filterDate", "filterDelayed", "filterPartial", "filterComplete"].forEach((id) => {
    $(`#${id}`).addEventListener("change", renderOrders);
  });
  ["dashSupplier", "dashStatus", "dashStartDate", "dashEndDate", "dashDelayed", "dashOpenOnly"].forEach((id) => {
    $(`#${id}`).addEventListener("change", renderDashboard);
  });
  $$("[data-calendar-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      calendarMode = button.dataset.calendarMode;
      $$("[data-calendar-mode]").forEach((item) => item.classList.toggle("active", item === button));
      renderCalendar();
    });
  });
  document.body.addEventListener("click", (event) => {
    const open = event.target.closest("[data-request-open]");
    if (open) return setView("orderDetail", open.dataset.requestOpen);
    const supplier = event.target.closest("[data-supplier-track]");
    if (supplier) {
      setView("orders");
      $("#filterSupplier").value = supplier.dataset.supplierTrack;
      renderOrders();
      return;
    }
    const delivery = event.target.closest("[data-delivery]");
    if (delivery) return openDeliveryModal(delivery.dataset.delivery);
    const forecast = event.target.closest("[data-forecast]");
    if (forecast) return openForecastModal(forecast.dataset.forecast);
  });
  document.body.addEventListener("submit", async (event) => {
    if (event.target.id !== "settingsForm") return;
    event.preventDefault();
    await saveSettings(event.target);
  });
}

bindEvents();
loadState().catch((error) => {
  $("#dbStatus").textContent = "Erro no backend";
  $("#dbStatus").dataset.tone = "error";
  alert(`Nao foi possivel carregar o banco: ${error.message}`);
});
