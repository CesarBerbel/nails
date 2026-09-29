/* =========================================================
   Painel da Helen — estatísticas, stock de vernizes e paleta
   ========================================================= */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const db = () => Backend.client;

const STAGES = ["Sem registo", "Entrou no site", "Chegou ao estúdio / onboarding", "Montou uma unha", "Clicou “Quero esta!”", "Começou a marcação", "Enviou pelo WhatsApp"];
const ONB_STEPS = ["", "Nome", "Serviço", "Tom de pele", "Formato", "Cor", "Acabamento", "Resultado (concluiu)"];
const ONB_ACTIONS = { book: "Marcou com o design", save: "Guardou nas unhas dela", studio: "Foi afinar no estúdio" };
const ONB_ORIGINS = { convite: "Convite da primeira visita", hero: "Botão “Criar a minha unha”", outro: "Outro" };
const STAGE_EVENTS = ["page_view", "view_studio", "onboarding_start", "design_customize", "design_choose", "booking_start", "booking_submit", "onboarding_complete"];
const EVENT_LABELS = {
  page_view: "Entrou no site", section_view: "Viu a seção", view_studio: "Chegou ao estúdio",
  design_customize: "Começou a montar uma unha", design_random: "Usou “Surpreende-me”", design_choose: "Clicou “Quero esta!”",
  design_save: "Guardou uma unha", design_delete: "Apagou uma unha guardada", save_prompt: "Tentou guardar sem conta",
  login_open: "Abriu o login", login: "Entrou com o Google", quiz_start: "Começou o quiz", quiz_complete: "Terminou o quiz",
  gallery_open: "Abriu uma inspiração", service_click: "Clicou num serviço", faq_open: "Abriu uma dúvida",
  booking_start: "Começou a marcação", booking_error: "Erro no formulário", booking_submit: "Enviou pelo WhatsApp",
  whatsapp_click: "Clicou no WhatsApp",
  onboarding_invite: "Viu o convite do onboarding", onboarding_invite_dismiss: "Recusou o convite",
  onboarding_start: "Começou o onboarding", onboarding_step: "Onboarding · passo", onboarding_close: "Fechou o onboarding",
  onboarding_complete: "Concluiu o onboarding", onboarding_action: "Onboarding · no fim",
};
const SECTION_LABELS = { inicio: "Topo", sobre: "Sobre", servicos: "Serviços", estudio: "Monta a tua unha", minhas: "As minhas unhas", quiz: "A tua vibe", galeria: "Inspirações", diferenciais: "O que me diferencia", duvidas: "Dúvidas", agendar: "Marcar" };
const DEVICE_LABELS = { celular: "Telemóvel", computador: "Computador", tablet: "Tablet", desconhecido: "Desconhecido" };

/* ---------- formatação ---------- */
const nf = new Intl.NumberFormat("pt-BR");
const n = (v) => nf.format(v || 0);
const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%`.replace(".", ",") : "0%");
const dur = (s) => {
  s = Math.round(s || 0);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${s % 60 ? (s % 60) + " s" : ""}`.trim() : `${Math.floor(m / 60)} h ${m % 60} min`;
};
const dateTime = (iso) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const timeOnly = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const dayShort = (d) => { const [, m, dd] = d.split("-"); return `${dd}/${m}`; };
const esc = escapeHtml;
const designText = (d) => d && d.shape ? `${d.color_name || d.color} · ${SHAPES[d.shape]?.label || d.shape} · ${FINISHES[d.finish] || d.finish}${d.accent ? " · coração" : ""}` : "";
const similarity = (d) => d < 3 ? "cor idêntica" : d < 7 ? "cor bem parecida" : d < 12 ? "cor parecida" : "cor diferente — confira";
const ICON_EDIT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>`;

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 3000);
}
function fail(err, msg = "Algo deu errado.") {
  console.error(err);
  toast(`${msg} ${err?.message || ""}`.trim());
}

/* ---------- estado ---------- */
let range = { from: null, to: null };
let dash = null;
let polishes = [];
let paletteRows = [];
let started = false;

/* ---------- dica (tooltip) ---------- */
function setupTooltip() {
  const tip = $("#tip");
  const show = (el) => {
    tip.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = el.dataset.tipV;
    tip.append(strong);
    (el.dataset.tipL || "").split("\n").filter(Boolean).forEach((line) => {
      const s = document.createElement("span");
      s.textContent = line;
      tip.append(s);
    });
    const r = el.getBoundingClientRect();
    tip.hidden = false;
    const x = Math.min(Math.max(r.left + r.width / 2, 140), innerWidth - 140);
    tip.style.left = x + "px";
    tip.style.top = Math.max(r.top, 70) + "px";
  };
  const hide = () => { tip.hidden = true; };
  document.addEventListener("pointerover", (e) => { const el = e.target.closest("[data-tip-v]"); el ? show(el) : hide(); });
  document.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip-v]"); if (el) show(el); });
  document.addEventListener("focusout", hide);
  addEventListener("scroll", hide, { passive: true });
}
const tipAttrs = (value, label) => `data-tip-v="${esc(value)}" data-tip-l="${esc(label)}"`;

/* ---------- gráficos ---------- */
/** Escala com marcas redondas (0, 10, 20, 30…). */
function niceScale(v) {
  if (v <= 4) return { max: 4, step: 1 };
  const raw = v / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  return { max: Math.ceil(v / step) * step, step };
}

/** Colunas por dia (uma série: visitantes únicos). */
function renderDaily() {
  const el = $("#dailyChart");
  const days = dash?.daily || [];
  if (!days.length) { el.innerHTML = `<p class="empty">Sem dados no período.</p>`; return; }
  const W = Math.max(320, el.clientWidth), H = 230;
  const m = { l: 36, r: 6, t: 12, b: 26 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const { max, step } = niceScale(Math.max(...days.map((d) => d.visitors)));
  const band = pw / days.length;
  const cw = Math.max(2, Math.min(24, band - 2, band * 0.72));
  const y = (v) => m.t + ph - (v / max) * ph;
  const every = Math.ceil(days.length / Math.max(1, Math.floor(pw / 58)));

  let out = "";
  for (let v = 0; v <= max; v += step) {
    const yy = y(v);
    out += `<line class="${v ? "gridline" : "baseline"}" x1="${m.l}" x2="${W - m.r}" y1="${yy}" y2="${yy}"/>`;
    out += `<text class="tick" x="${m.l - 8}" y="${yy + 4}" text-anchor="end">${n(v)}</text>`;
  }
  days.forEach((d, i) => {
    const cx = m.l + band * i + band / 2;
    const h = (d.visitors / max) * ph;
    const x0 = cx - cw / 2, y0 = m.t + ph - h, r = Math.min(4, cw / 2, h);
    const label = `${new Date(d.day + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}\n${n(d.sessions)} visitas · ${n(d.bookings)} marcações`;
    out += `<rect class="hit" x="${m.l + band * i}" y="${m.t}" width="${band}" height="${ph}" tabindex="0" ${tipAttrs(`${n(d.visitors)} visitantes`, label)}/>`;
    if (h > 0) out += `<path class="col" d="M${x0},${m.t + ph} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + cw - r} Q${x0 + cw},${y0} ${x0 + cw},${y0 + r} V${m.t + ph} Z"/>`;
    else out += `<g class="col"></g>`;
    if (i % every === 0) out += `<text class="tick" x="${cx}" y="${H - 6}" text-anchor="middle">${dayShort(d.day)}</text>`;
  });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitantes únicos por dia">${out}</svg>`;
}

/** Lista de barras horizontais (uma série). */
function barList(el, rows, { unit = "", empty = "Sem dados no período." } = {}) {
  if (!rows.length) { el.innerHTML = `<p class="empty">${empty}</p>`; return; }
  const max = Math.max(...rows.map((r) => r.value), 1);
  el.innerHTML = `<div class="bars">${rows.map((r) => `
    <div class="bar" tabindex="0" ${tipAttrs(`${n(r.value)}${unit}`, [r.label, r.tip].filter(Boolean).join("\n"))}>
      <div class="bar__label">${r.dot ? `<i class="dot" style="--c:${r.dot}"></i>` : ""}<span>${esc(r.label)}</span></div>
      <div class="bar__track"><div class="bar__fill" style="width:${(r.value / max) * 100}%"></div></div>
      <div class="bar__value">${n(r.value)}${r.small ? `<small>${esc(r.small)}</small>` : ""}</div>
    </div>`).join("")}</div>`;
}

/* ---------- visão geral ---------- */
function renderOverview() {
  const k = dash.kpis;
  const tiles = [
    { label: "Visitantes únicos", value: n(k.visitors), sub: `${n(k.new_visitors)} novos no período`, hero: true },
    { label: "Visitas", value: n(k.sessions), sub: k.visitors ? `${(k.sessions / k.visitors).toFixed(1).replace(".", ",")} por visitante` : "" },
    { label: "Marcações enviadas", value: n(k.bookings), sub: `${pct(k.booked_sessions, k.sessions)} das visitas` },
    { label: "Tempo médio", value: dur(k.avg_duration), sub: "por visita" },
    { label: "Registos com Google", value: n(k.signups), sub: `${n(k.logged_visitors)} visitaram com sessão iniciada` },
    { label: "Onboarding concluído", value: n(k.onb_completed ?? dash.onboarding?.completed), sub: `de ${n(dash.onboarding?.started)} que começaram` },
  ];
  $("#kpis").innerHTML = tiles.map((t) => `
    <div class="tile${t.hero ? " tile--hero" : ""}">
      <div class="tile__label">${t.label}</div>
      <div class="tile__value">${t.value}</div>
      <div class="tile__sub">${t.sub}</div>
    </div>`).join("");

  $("#dailySub").textContent = `Visitantes únicos por dia · passa o rato por cima para ver visitas e marcações`;
  renderDaily();

  barList($("#sources"), dash.sources.map((s) => ({ label: s.key, value: s.sessions, tip: `${n(s.booked)} enviaram marcação`, small: s.booked ? `· ${n(s.booked)} marc.` : "" })), { unit: " visitas" });
  barList($("#devices"), dash.devices.map((s) => ({ label: DEVICE_LABELS[s.key] || s.key, value: s.sessions, tip: `${n(s.booked)} enviaram marcação` })), { unit: " visitas" });
  const order = Object.keys(SECTION_LABELS);
  barList($("#sections"), [...dash.sections]
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
    .map((s) => ({ label: SECTION_LABELS[s.key] || s.key, value: s.sessions, tip: pct(s.sessions, k.sessions) + " das visitas" })), { unit: " visitas" });
}

/* ---------- jornada ---------- */
function renderJourney() {
  const f = dash.funnel;
  const total = f[0]?.sessions || 0;
  if (!total) {
    $("#funnel").innerHTML = `<p class="empty">Sem visitas no período.</p>`;
  } else {
    $("#funnel").innerHTML = `<div class="funnel">${f.map((s, i) => {
      const prev = i ? f[i - 1].sessions : s.sessions;
      const lost = prev - s.sessions;
      return `
      <div class="funnel__row" tabindex="0" ${tipAttrs(`${n(s.sessions)} visitas`, `${STAGES[s.stage]}\n${pct(s.sessions, total)} de quem entrou${i ? `\n${n(lost)} pararam na etapa anterior` : ""}`)}>
        <span class="funnel__n">${s.stage}</span>
        <span class="funnel__label">${STAGES[s.stage]}</span>
        <div class="funnel__track"><div class="funnel__fill" style="width:${(s.sessions / total) * 100}%"></div></div>
        <div class="funnel__val"><strong>${n(s.sessions)}</strong><small>${pct(s.sessions, total)}${i && lost ? ` · <span class="drop">−${pct(lost, prev)}</span>` : ""}</small></div>
      </div>`;
    }).join("")}</div>`;
  }

  barList($("#stops"), dash.stops
    .filter((s) => s.stage > 0)
    .map((s) => ({ label: s.stage === 6 ? "Foi até ao fim (enviou)" : STAGES[s.stage], value: s.sessions, tip: pct(s.sessions, total) + " das visitas" })), { unit: " visitas" });

  barList($("#interactions"), dash.interactions.map((s) => ({
    label: EVENT_LABELS[s.key] || s.key, value: s.count, small: `· ${n(s.sessions)}`, tip: `${n(s.sessions)} visitas diferentes`,
  })), { unit: " vezes" });
}

/* ---------- onboarding ---------- */
function renderOnboarding() {
  const o = dash.onboarding || {};
  const started = o.started || 0;
  const tiles = [
    { label: "Começaram o onboarding", value: n(started), sub: `${pct(started, dash.kpis.sessions)} das visitas`, hero: true },
    { label: "Concluíram", value: n(o.completed), sub: `${pct(o.completed, started)} de quem começou` },
    { label: "Desistiram a meio", value: n(Math.max(0, started - (o.completed || 0))), sub: "fecharam antes do resultado" },
    { label: "Viram o convite", value: n(o.invited), sub: `${n(o.dismissed)} disseram “agora não”` },
    { label: "Marcaram no fim", value: n((o.actions || []).find((a) => a.key === "book")?.sessions), sub: "com o design do onboarding" },
  ];
  $("#onbKpis").innerHTML = tiles.map((t) => `
    <div class="tile${t.hero ? " tile--hero" : ""}">
      <div class="tile__label">${t.label}</div>
      <div class="tile__value">${t.value}</div>
      <div class="tile__sub">${t.sub}</div>
    </div>`).join("");

  const steps = o.steps || [];
  const first = steps[0]?.sessions || 0;
  $("#onbFunnel").innerHTML = first ? `<div class="funnel">${steps.map((s, i) => {
    const prev = i ? steps[i - 1].sessions : s.sessions;
    const lost = prev - s.sessions;
    return `
      <div class="funnel__row" tabindex="0" ${tipAttrs(`${n(s.sessions)} visitas`, `${ONB_STEPS[s.step]}\n${pct(s.sessions, first)} de quem começou${i ? `\n${n(lost)} desistiram no passo anterior` : ""}`)}>
        <span class="funnel__n">${s.step}</span>
        <span class="funnel__label">${ONB_STEPS[s.step]}</span>
        <div class="funnel__track"><div class="funnel__fill" style="width:${(s.sessions / first) * 100}%"></div></div>
        <div class="funnel__val"><strong>${n(s.sessions)}</strong><small>${pct(s.sessions, first)}${i && lost ? ` · <span class="drop">−${pct(lost, prev)}</span>` : ""}</small></div>
      </div>`;
  }).join("")}</div>` : `<p class="empty">Ninguém começou o onboarding neste período.</p>`;

  barList($("#onbExits"), (o.exits || []).filter((x) => x.step).map((x) => ({ label: `No passo ${x.step} · ${ONB_STEPS[x.step] || ""}`, value: x.sessions, tip: pct(x.sessions, started) + " de quem começou" })), { unit: " visitas", empty: "Ninguém desistiu 🎉" });
  barList($("#onbActions"), (o.actions || []).map((x) => ({ label: ONB_ACTIONS[x.key] || x.key, value: x.sessions })), { unit: " visitas" });
  barList($("#onbOrigins"), (o.origins || []).map((x) => ({ label: ONB_ORIGINS[x.key] || x.key, value: x.sessions })), { unit: " visitas" });
  barList($("#onbServices"), (o.services || []).map((x) => ({ label: x.key, value: x.sessions })), { unit: " visitas" });
  barList($("#onbSkins"), (o.skins || []).map((x) => ({ label: `Tom ${SKINS.indexOf(x.key.toUpperCase()) + 1 || "?"}`, dot: x.key, value: x.sessions })), { unit: " visitas" });
}
function onbCell(s) {
  if (s.onb_done) return `<span class="badge badge--good">concluiu</span>`;
  if (s.onb_step) return `<span class="stage"><span class="stage__dots">${[1, 2, 3, 4, 5, 6].map((i) => `<i class="${i <= s.onb_step ? "on" : ""}"></i>`).join("")}</span><small>parou em ${ONB_STEPS[s.onb_step]}</small></span>`;
  return `<span class="muted">—</span>`;
}

/* ---------- unhas ---------- */
function stockBadge(qty, min) {
  if (qty == null) return "";
  if (qty <= 0) return `<span class="badge badge--crit">sem stock</span>`;
  if (qty < (min ?? 1)) return `<span class="badge badge--warn">stock baixo: ${n(qty)}</span>`;
  return `<span class="badge badge--good">${n(qty)} em stock</span>`;
}

function renderDesigns() {
  const combos = dash.combos;
  $("#combos").innerHTML = combos.length ? combos.map((c, i) => `
    <div class="combo" tabindex="0" ${tipAttrs(`${n(c.people)} pessoas`, `${designText(c)}\n${n(c.booked)} marcaram`)}>
      <svg viewBox="0 0 520 380" aria-hidden="true">${handMarkup({ ...c, skin: SKINS[1] })}</svg>
      <h3><span class="rank-n">${i + 1}º</span>${esc(c.color_name || c.color)}</h3>
      <p>${esc(SHAPES[c.shape]?.label || c.shape)} · ${esc(FINISHES[c.finish] || c.finish)}${c.accent ? " · coração" : ""}</p>
      <p><strong>${n(c.people)}</strong> pessoas · ${n(c.booked)} marcaram</p>
    </div>`).join("") : `<p class="empty">Ninguém escolheu uma unha neste período ainda.</p>`;

  barList($("#shapes"), dash.shapes.map((s) => ({ label: SHAPES[s.key]?.label || s.key, value: s.people, small: `· ${n(s.booked)} marc.`, tip: `${n(s.booked)} marcaram` })), { unit: " pessoas" });
  barList($("#finishes"), dash.finishes.map((s) => ({ label: FINISHES[s.key] || s.key, value: s.people, small: `· ${n(s.booked)} marc.`, tip: `${n(s.booked)} marcaram` })), { unit: " pessoas" });

  const colors = dash.colors;
  const max = Math.max(1, ...colors.map((c) => c.people));
  const inStock = polishes.filter((p) => p.active && p.quantity > 0);
  $("#colors").innerHTML = colors.length ? colors.map((c) => {
    let polish;
    if (c.polish_label) {
      polish = `🧴 ${esc(c.polish_label)} ${stockBadge(c.polish_qty, c.polish_min)}`;
    } else if (c.palette_id) {
      polish = `<span class="badge badge--warn">sem verniz ligado</span> <button type="button" class="link-btn" data-goto="palette">ligar</button>`;
    } else {
      const near = inStock.length ? nearestColor(c.hex, inStock) : null;
      polish = `<span class="badge">cor exclusiva</span>${near ? ` <span>mais parecido: ${esc(near.brand)} · ${esc(near.name)} (${similarity(near.distance)})</span>` : ""}`;
    }
    return `
      <div class="color-row">
        <div class="bar__label"><i class="dot" style="--c:${c.hex}"></i><span>${esc(c.name || "Cor exclusiva")} <span class="muted">${esc(c.hex)}</span></span></div>
        <div class="bar__track" tabindex="0" ${tipAttrs(`${n(c.people)} pessoas`, `${c.name || c.hex}\n${n(c.booked)} marcaram`)}><div class="bar__fill" style="width:${(c.people / max) * 100}%"></div></div>
        <div class="bar__value">${n(c.people)}<small>· ${n(c.booked)} marc.</small></div>
        <div class="polish-tag">${polish}</div>
      </div>`;
  }).join("") : `<p class="empty">Sem cores escolhidas no período.</p>`;
}

/* ---------- visitantes ---------- */
function stageCell(stage) {
  return `<span class="stage"><span class="stage__dots">${[1, 2, 3, 4, 5, 6].map((i) => `<i class="${i <= stage ? "on" : ""}"></i>`).join("")}</span><small>${STAGES[stage] || ""}</small></span>`;
}
function whoCell(s) {
  if (s.user_email) {
    const img = s.user_avatar ? `<img src="${esc(s.user_avatar)}" alt="" referrerpolicy="no-referrer" />` : `<span class="ini">${esc((s.user_name || s.user_email)[0].toUpperCase())}</span>`;
    return `<div class="who">${img}<div>${esc(s.user_name || s.user_email)}<small>${esc(s.user_email)}${s.visits > 1 ? ` · ${s.visits}ª visita` : ""}</small></div></div>`;
  }
  return `<div class="who"><span class="ini">?</span><div>Visitante #${esc(s.visitor_id.slice(0, 5))}<small>${s.visits > 1 ? `voltou · ${s.visits} visitas` : "primeira visita"}</small></div></div>`;
}
let visitLimit = 30;
function renderVisitors() {
  const q = $("#visitSearch").value.trim().toLowerCase();
  const filter = $("#visitFilter").value;
  const rows = dash.sessions.filter((s) => {
    if (filter === "booked" && s.max_stage < 6) return false;
    if (filter === "designed" && (s.max_stage < 3 || s.max_stage >= 6)) return false;
    if (filter === "bounced" && s.max_stage > 1) return false;
    if (filter === "logged" && !s.user_email) return false;
    if (filter === "onb_quit" && !(s.onb_step && !s.onb_done)) return false;
    if (filter === "onb_done" && !s.onb_done) return false;
    if (!q) return true;
    return [s.user_name, s.user_email, s.source, s.device, s.visitor_id].some((v) => (v || "").toLowerCase().includes(q));
  });
  const shown = rows.slice(0, visitLimit);
  $("#visitsMore").hidden = rows.length <= visitLimit;
  $("#visitsMore").textContent = `Mostrar mais (${n(rows.length - visitLimit)} restantes)`;
  $("#visitsTable tbody").innerHTML = shown.length ? shown.map((s) => `
    <tr class="clickable" tabindex="0" data-sid="${s.session_id}">
      <td class="num">${dateTime(s.started_at)}</td>
      <td>${whoCell(s)}</td>
      <td>${esc(s.source)}</td>
      <td>${esc(DEVICE_LABELS[s.device] || s.device)}</td>
      <td class="num">${dur(s.duration)}</td>
      <td>${stageCell(s.max_stage)}</td>
      <td>${onbCell(s)}</td>
      <td>${s.design ? `<svg class="mini-hand" viewBox="0 0 520 380" role="img" aria-label="${esc(designText(s.design))}">${handMarkup({ ...s.design, skin: SKINS[1] })}</svg>` : `<span class="muted">—</span>`}</td>
    </tr>`).join("") : `<tr><td colspan="8" class="empty">Nenhuma visita encontrada.</td></tr>`;
}

async function openSession(sid) {
  const s = dash.sessions.find((x) => x.session_id === sid);
  if (!s) return;
  const drawer = $("#drawer");
  $("#drawerTitle").textContent = s.user_name || s.user_email || `Visitante #${s.visitor_id.slice(0, 5)}`;
  const body = $("#drawerBody");
  body.innerHTML = `
    <dl class="meta">
      <dt>Início</dt><dd>${new Date(s.started_at).toLocaleString("pt-BR")}</dd>
      <dt>Duração</dt><dd>${dur(s.duration)}</dd>
      <dt>Origem</dt><dd>${esc(s.source)}</dd>
      <dt>Aparelho</dt><dd>${esc(DEVICE_LABELS[s.device] || s.device)}</dd>
      <dt>Visitas</dt><dd>${s.visits > 1 ? `${s.visits} visitas deste navegador` : "primeira visita"}</dd>
      <dt>Chegou até</dt><dd>${stageCell(s.max_stage)}</dd>
      <dt>Onboarding</dt><dd>${onbCell(s)}</dd>
    </dl>
    ${s.design ? `<svg class="mini-hand" style="width:200px;margin-bottom:1rem" viewBox="0 0 520 380" aria-hidden="true">${handMarkup({ ...s.design, skin: SKINS[1] })}</svg>` : ""}
    <h2>O que fez</h2>
    <p class="muted">carregando…</p>`;
  drawer.hidden = false;
  $("#drawerClose").focus();

  const { data, error } = await db().from("events").select("created_at,name,props").eq("session_id", sid).order("created_at").limit(500);
  if (error) { fail(error, "Não foi possível carregar a visita."); return; }
  const describe = (e) => {
    const p = e.props || {};
    if (e.name === "section_view") return SECTION_LABELS[p.section] || p.section;
    if (e.name === "onboarding_step" || e.name === "onboarding_close") return `${p.step} · ${ONB_STEPS[p.step] || p.key}`;
    if (e.name === "onboarding_start") return ONB_ORIGINS[p.from] || p.from;
    if (e.name === "onboarding_action") return ONB_ACTIONS[p.action] || p.action;
    if (e.name === "onboarding_complete") return [designText(p), p.service, p.polish ? `🧴 ${p.polish}` : ""].filter(Boolean).join(" · ");
    if (e.name === "page_view") return [p.ref || p.utm_source ? `veio de ${p.utm_source || p.ref}` : "acesso direto", DEVICE_LABELS[p.device] || p.device, p.returning ? "já tinha visitado" : ""].filter(Boolean).join(" · ");
    if (p.shape) return [designText(p), p.polish ? `🧴 ${p.polish}` : "", p.service ? `serviço: ${p.service}` : "", p.vibe ? `vibe: ${p.vibe}` : "", p.name || ""].filter(Boolean).join(" · ");
    return p.service || p.q || p.where || p.from || p.missing || "";
  };
  $("p.muted:last-child", body).remove();
  const ul = document.createElement("ul");
  ul.className = "timeline";
  data.forEach((e) => {
    const li = document.createElement("li");
    if (STAGE_EVENTS.includes(e.name)) li.className = "key";
    const t = document.createElement("time");
    t.textContent = timeOnly(e.created_at);
    li.append(t, document.createTextNode(EVENT_LABELS[e.name] || e.name));
    const extra = describe(e);
    if (extra) {
      const sp = document.createElement("span");
      sp.className = "props";
      sp.textContent = extra;
      li.append(sp);
    }
    ul.append(li);
  });
  body.append(ul);
}

/* ---------- estoque ---------- */
async function loadStock() {
  const [p, c] = await Promise.all([
    db().from("polishes").select("*").order("brand").order("name"),
    db().from("palette_colors").select("*").order("sort").order("name"),
  ]);
  if (p.error) throw p.error;
  if (c.error) throw c.error;
  polishes = p.data;
  paletteRows = c.data;
}
const polishLabel = (p) => [p.brand, p.name, p.code].filter(Boolean).join(" · ");

function renderStockAlerts() {
  const low = polishes.filter((p) => p.active && p.quantity > 0 && p.quantity < p.min_quantity);
  const out = polishes.filter((p) => p.active && p.quantity <= 0);
  const linkedOut = paletteRows.filter((c) => c.active && out.some((p) => p.id === c.polish_id));
  const unlinked = paletteRows.filter((c) => c.active && !c.polish_id);
  const alerts = [];
  if (linkedOut.length) alerts.push(`<div class="alert alert--crit"><span>●</span><div><strong>Cores do site sem verniz em stock:</strong> ${linkedOut.map((c) => esc(c.name)).join(", ")}.</div></div>`);
  if (low.length) alerts.push(`<div class="alert"><span>▲</span><div><strong>Stock baixo:</strong> ${low.map((p) => `${esc(polishLabel(p))} (${p.quantity})`).join(", ")}.</div></div>`);
  if (out.length) alerts.push(`<div class="alert alert--crit"><span>●</span><div><strong>Acabaram:</strong> ${out.map((p) => esc(polishLabel(p))).join(", ")}.</div></div>`);
  if (unlinked.length) alerts.push(`<div class="alert"><span>▲</span><div><strong>${unlinked.length} ${unlinked.length > 1 ? "cores do site ainda não estão ligadas" : "cor do site ainda não está ligada"} a um verniz:</strong> ${unlinked.map((c) => esc(c.name)).join(", ")}. <button type="button" class="link-btn" data-goto="palette">Ligar agora</button></div></div>`);
  $("#stockAlerts").innerHTML = alerts.join("");
}

function renderStock() {
  renderStockAlerts();
  const q = $("#stockSearch").value.trim().toLowerCase();
  const rows = polishes.filter((p) => !q || [p.brand, p.name, p.code, p.finish, p.notes].some((v) => (v || "").toLowerCase().includes(q)));
  const units = polishes.reduce((s, p) => s + (p.active ? p.quantity : 0), 0);
  $("#stockSub").textContent = `${n(polishes.length)} vernizes registados · ${n(units)} unidades`;
  $("#stockTable tbody").innerHTML = rows.length ? rows.map((p) => {
    const linked = paletteRows.filter((c) => c.polish_id === p.id);
    return `
    <tr data-id="${p.id}" class="${p.active ? "" : "inactive"}">
      <td><span class="swatch-lg" style="--c:${p.hex}" title="${esc(p.hex)}"></span></td>
      <td><strong>${esc(p.brand)}</strong> · ${esc(p.name)}${p.code ? ` <span class="muted">${esc(p.code)}</span>` : ""}${p.notes ? `<div class="muted">${esc(p.notes)}</div>` : ""}</td>
      <td>${esc(p.finish || "—")}</td>
      <td>
        <span class="qty">
          <button type="button" class="icon-btn" data-act="dec" aria-label="Diminuir">−</button>
          <strong>${p.quantity}</strong>
          <button type="button" class="icon-btn" data-act="inc" aria-label="Aumentar">+</button>
        </span>
        ${p.quantity <= 0 ? `<span class="badge badge--crit">acabou</span>` : p.quantity < p.min_quantity ? `<span class="badge badge--warn">baixo</span>` : ""}
      </td>
      <td>${linked.length ? `<span class="chips">${linked.map((c) => `<span class="chip"><i class="dot" style="--c:${c.hex}"></i>${esc(c.name)}</span>`).join("")}</span>`
        : `<button type="button" class="link-btn" data-act="to-site">+ criar cor no site</button>`}</td>
      <td><div class="row-actions">
        <button type="button" class="icon-btn" data-act="edit" aria-label="Editar" title="Editar">${ICON_EDIT}</button>
        <button type="button" class="icon-btn danger" data-act="del" aria-label="Apagar" title="Apagar">${ICON_TRASH}</button>
      </div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="6" class="empty">${polishes.length ? "Nada encontrado." : "Ainda não há vernizes registados. Clica em “+ Novo verniz”."}</td></tr>`;
}

function openPolishDialog(p = null) {
  const dlg = $("#polishDialog"), f = $("#polishForm");
  f.reset();
  f.dataset.id = p?.id || "";
  $("#polishTitle").textContent = p ? "Editar verniz" : "Novo verniz";
  $("#polishError").textContent = "";
  const v = p || { hex: "#E8588A", quantity: 1, min_quantity: 1, active: true };
  ["brand", "name", "code", "finish", "notes"].forEach((k) => (f[k].value = v[k] || ""));
  f.hex.value = v.hex;
  f.hexText.value = v.hex.toUpperCase();
  f.quantity.value = v.quantity;
  f.min_quantity.value = v.min_quantity;
  f.active.checked = v.active;
  dlg.showModal();
  f.brand.focus();
}

async function savePolish(e) {
  e.preventDefault();
  const f = e.target;
  const hex = f.hexText.value.trim();
  if (!f.brand.value.trim() || !f.name.value.trim()) { $("#polishError").textContent = "Preencha a marca e o nome."; return; }
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) { $("#polishError").textContent = "Cor inválida. Use o formato #RRGGBB."; return; }
  const row = {
    brand: f.brand.value.trim(), name: f.name.value.trim(), code: f.code.value.trim() || null, finish: f.finish.value || null,
    hex: hex.toUpperCase(), quantity: Math.max(0, +f.quantity.value || 0), min_quantity: Math.max(0, +f.min_quantity.value || 0),
    active: f.active.checked, notes: f.notes.value.trim() || null,
  };
  const id = f.dataset.id;
  const { error } = id ? await db().from("polishes").update(row).eq("id", id) : await db().from("polishes").insert(row);
  if (error) { $("#polishError").textContent = error.message; return; }
  $("#polishDialog").close();
  toast(id ? "Verniz atualizado." : "Verniz registado ♥");
  await refreshStock();
}

async function refreshStock() {
  try { await loadStock(); } catch (err) { fail(err, "Não foi possível carregar o stock."); return; }
  renderStock();
  renderPalette();
}

function setupStock() {
  $("#newPolishBtn").addEventListener("click", () => openPolishDialog());
  $("#stockSearch").addEventListener("input", renderStock);
  const f = $("#polishForm");
  f.addEventListener("submit", savePolish);
  f.hex.addEventListener("input", () => (f.hexText.value = f.hex.value.toUpperCase()));
  f.hexText.addEventListener("input", () => { if (/^#[0-9a-fA-F]{6}$/.test(f.hexText.value)) f.hex.value = f.hexText.value; });
  $("[data-close]", f).addEventListener("click", () => $("#polishDialog").close());

  $("#stockTable").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const p = polishes.find((x) => x.id === btn.closest("tr").dataset.id);
    if (!p) return;
    const act = btn.dataset.act;
    if (act === "edit") openPolishDialog(p);
    if (act === "inc" || act === "dec") {
      const quantity = Math.max(0, p.quantity + (act === "inc" ? 1 : -1));
      if (quantity === p.quantity) return;
      p.quantity = quantity;
      renderStock();
      const { error } = await db().from("polishes").update({ quantity }).eq("id", p.id);
      if (error) { fail(error, "Não foi possível atualizar a quantidade."); refreshStock(); }
    }
    if (act === "del") {
      if (!confirm(`Apagar “${polishLabel(p)}” do stock? As cores do site ligadas a ele ficam sem verniz.`)) return;
      const { error } = await db().from("polishes").delete().eq("id", p.id);
      if (error) return fail(error, "Não foi possível apagar.");
      toast("Verniz apagado.");
      refreshStock();
    }
    if (act === "to-site") {
      const sort = Math.max(0, ...paletteRows.map((c) => c.sort)) + 1;
      const { error } = await db().from("palette_colors").insert({ name: p.name, hex: p.hex, sort, polish_id: p.id });
      if (error) return fail(error, "Não foi possível criar a cor.");
      toast(`“${p.name}” agora aparece no estúdio do site ♥`);
      refreshStock();
    }
  });
}

/* ---------- cores do site ---------- */
function renderPalette() {
  const opts = (sel) => `<option value="">— sem verniz ligado —</option>` + polishes.map((p) =>
    `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(polishLabel(p))} (${p.quantity} un.)${p.active ? "" : " · inativo"}</option>`).join("");
  $("#paletteList").innerHTML = paletteRows.length ? paletteRows.map((c) => {
    const p = polishes.find((x) => x.id === c.polish_id);
    let info;
    if (p) {
      info = `<i class="dot" style="--c:${p.hex}"></i> ${similarity(colorDistance(c.hex, p.hex))} ${stockBadge(p.quantity, p.min_quantity)}
        ${p.hex.toLowerCase() !== c.hex.toLowerCase() ? `<button type="button" class="link-btn" data-act="copy-hex">usar a cor do verniz</button>` : ""}`;
    } else {
      info = polishes.length ? `<button type="button" class="link-btn" data-act="suggest">sugerir o verniz mais parecido</button>` : `regista vernizes na aba Stock`;
    }
    return `
      <div class="pal-row${c.active ? "" : " off"}" data-id="${c.id}">
        <input type="color" value="${c.hex}" data-f="hex" aria-label="Cor" />
        <input type="text" value="${esc(c.name)}" data-f="name" maxlength="40" aria-label="Nome da cor" />
        <input type="number" value="${c.sort}" data-f="sort" aria-label="Ordem" title="Ordem no site" />
        <div class="pal-link">
          <select data-f="polish_id" aria-label="Verniz do stock">${opts(c.polish_id)}</select>
          <small>${info}</small>
        </div>
        <label class="switch"><input type="checkbox" data-f="active" ${c.active ? "checked" : ""} /> no site</label>
        <button type="button" class="icon-btn danger" data-act="del" aria-label="Apagar cor" title="Apagar cor">${ICON_TRASH}</button>
      </div>`;
  }).join("") : `<p class="empty">Nenhuma cor. Clica em “+ Nova cor”.</p>`;
}

async function updatePalette(id, patch) {
  const c = paletteRows.find((x) => x.id === id);
  Object.assign(c, patch);
  const { error } = await db().from("palette_colors").update(patch).eq("id", id);
  if (error) { fail(error, "Não foi possível guardar."); return refreshStock(); }
  toast("Guardado ✓");
  if ("sort" in patch) paletteRows.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  renderPalette();
  renderStock();
}

function setupPalette() {
  const list = $("#paletteList");
  list.addEventListener("change", (e) => {
    const el = e.target.closest("[data-f]");
    if (!el) return;
    const id = el.closest(".pal-row").dataset.id;
    const f = el.dataset.f;
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (f === "sort") v = parseInt(v, 10) || 0;
    if (f === "polish_id") v = v || null;
    if (f === "name" && !v.trim()) return renderPalette();
    if (f === "hex") v = v.toUpperCase();
    updatePalette(id, { [f]: typeof v === "string" ? v.trim() : v });
  });
  list.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest(".pal-row").dataset.id;
    const c = paletteRows.find((x) => x.id === id);
    if (btn.dataset.act === "suggest") {
      const near = nearestColor(c.hex, polishes.filter((p) => p.active));
      if (!near) return toast("Nenhum verniz ativo no stock.");
      if (confirm(`Ligar “${c.name}” a “${polishLabel(near)}”? (${similarity(near.distance)})`)) updatePalette(id, { polish_id: near.id });
    }
    if (btn.dataset.act === "copy-hex") {
      const p = polishes.find((x) => x.id === c.polish_id);
      updatePalette(id, { hex: p.hex.toUpperCase() });
    }
    if (btn.dataset.act === "del") {
      if (!confirm(`Apagar a cor “${c.name}” do site?`)) return;
      const { error } = await db().from("palette_colors").delete().eq("id", id);
      if (error) return fail(error, "Não foi possível apagar.");
      refreshStock();
    }
  });
  $("#newColorBtn").addEventListener("click", async () => {
    const sort = Math.max(0, ...paletteRows.map((c) => c.sort)) + 1;
    const { error } = await db().from("palette_colors").insert({ name: "Nova cor", hex: "#E8588A", sort });
    if (error) return fail(error, "Não foi possível criar a cor.");
    await refreshStock();
    const last = $$(".pal-row").pop();
    last?.querySelector('[data-f="name"]').select();
  });
}

/* ---------- clientes ---------- */
async function renderClients() {
  const [pr, sd] = await Promise.all([
    db().from("profiles").select("*").order("created_at", { ascending: false }),
    db().from("saved_designs").select("*").order("created_at"),
  ]);
  if (pr.error || sd.error) return fail(pr.error || sd.error, "Não foi possível carregar as clientes.");
  const byUser = {};
  sd.data.forEach((d) => (byUser[d.user_id] ||= []).push(d));
  $("#clientsSub").textContent = `${n(pr.data.length)} clientes com conta Google · ${n(sd.data.length)} unhas guardadas`;
  $("#clientsList").innerHTML = pr.data.length ? pr.data.map((p) => {
    const designs = byUser[p.id] || [];
    return `
      <div class="client">
        <div class="who">${p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" referrerpolicy="no-referrer" />` : `<span class="ini">${esc((p.full_name || p.email || "?")[0].toUpperCase())}</span>`}
          <div>${esc(p.full_name || p.email)}<small>${esc(p.email || "")} · desde ${new Date(p.created_at).toLocaleDateString("pt-BR")}</small></div>
        </div>
        <div class="muted">${designs.length} de ${CONFIG.maxSavedDesigns} unhas guardadas</div>
        ${designs.length ? `<div class="client__hands">${designs.map((d) => `<svg viewBox="0 0 520 380" role="img" aria-label="${esc(d.name || "")}" tabindex="0" ${tipAttrs(d.name || "Unha", designText({ ...d, color_name: d.color }))}>${handMarkup(d)}</svg>`).join("")}</div>` : ""}
      </div>`;
  }).join("") : `<p class="empty">Ainda não há clientes registadas.</p>`;
}

/* ---------- período e carregamento ---------- */
function toInputDate(d) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
function setPreset(days) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const from = new Date(today); from.setDate(from.getDate() - (days ? days - 1 : 0));
  const to = new Date(today); to.setDate(to.getDate() + 1);
  range = { from, to };
  $("#rangeFrom").value = toInputDate(from);
  $("#rangeTo").value = toInputDate(today);
  $$("#rangePresets button").forEach((b) => b.classList.toggle("active", +b.dataset.days === days));
}

async function loadDashboard() {
  const app = $("#app");
  app.classList.add("loading");
  $("#rangeStatus").textContent = "atualizando…";
  const { data, error } = await db().rpc("admin_dashboard", {
    // o período é calculado no fuso do navegador, então os dias do gráfico também
    p_from: range.from.toISOString(), p_to: range.to.toISOString(),
    p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || CONFIG.timezone,
  });
  app.classList.remove("loading");
  if (error) { $("#rangeStatus").textContent = ""; return fail(error, "Não foi possível carregar as estatísticas."); }
  dash = data;
  $("#rangeStatus").textContent = `atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  renderOverview();
  renderOnboarding();
  renderJourney();
  renderDesigns();
  renderVisitors();
}

function showTab(name) {
  $$("#tabs button").forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", String(on));
  });
  $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== name));
  $("#rangeBar").hidden = ["stock", "palette", "clients"].includes(name);
  if (name === "stock" || name === "palette") refreshStock();
  if (name === "clients") renderClients();
  if (name === "overview") renderDaily();
}

async function startApp() {
  if (started) return;
  started = true;
  $("#gate").hidden = true;
  $("#app").hidden = false;
  setupTooltip();
  setupStock();
  setupPalette();

  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (b) showTab(b.dataset.tab); });
  document.addEventListener("click", (e) => { const g = e.target.closest("[data-goto]"); if (g) showTab(g.dataset.goto); });

  $("#rangePresets").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    setPreset(+b.dataset.days);
    loadDashboard();
  });
  const custom = () => {
    const a = $("#rangeFrom").value, b = $("#rangeTo").value;
    if (!a || !b || a > b) return;
    const from = new Date(a + "T00:00"), to = new Date(b + "T00:00");
    to.setDate(to.getDate() + 1);
    range = { from, to };
    $$("#rangePresets button").forEach((x) => x.classList.remove("active"));
    loadDashboard();
  };
  $("#rangeFrom").addEventListener("change", custom);
  $("#rangeTo").addEventListener("change", custom);
  $("#refreshBtn").addEventListener("click", loadDashboard);

  $("#visitSearch").addEventListener("input", () => { visitLimit = 30; if (dash) renderVisitors(); });
  $("#visitFilter").addEventListener("change", () => { visitLimit = 30; if (dash) renderVisitors(); });
  $("#visitsMore").addEventListener("click", () => { visitLimit += 30; renderVisitors(); });
  const openRow = (e) => { const tr = e.target.closest("tr[data-sid]"); if (tr) openSession(tr.dataset.sid); };
  $("#visitsTable").addEventListener("click", openRow);
  $("#visitsTable").addEventListener("keydown", (e) => { if (e.key === "Enter") openRow(e); });
  const closeDrawer = () => ($("#drawer").hidden = true);
  $("#drawerClose").addEventListener("click", closeDrawer);
  $("#drawer").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeDrawer(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => dash && renderDaily(), 150); });

  setPreset(30);
  try { await loadStock(); } catch (err) { console.error(err); }
  loadDashboard();
}

/* ---------- acesso ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.title = `Painel · ${CONFIG.brand}`;
  $$(".js-brand").forEach((el) => (el.textContent = CONFIG.brand));

  if (!Backend.enabled) {
    $("#gateMsg").textContent = "Configure o Supabase em js/config.js para usar o painel (veja o README).";
    return;
  }
  $("#loginBtn").addEventListener("click", () => Backend.signInWithGoogle().catch((err) => fail(err, "Não foi possível entrar.")));
  $("#logoutBtn").addEventListener("click", async () => { await Backend.signOut(); location.reload(); });

  Backend.onAuth(async (user) => {
    const top = $("#topUser");
    if (!user) {
      top.hidden = true;
      $("#gate").hidden = false;
      $("#app").hidden = true;
      $("#loginBtn").hidden = false;
      $("#gateMsg").textContent = "Entra com a conta Google registada como administradora.";
      Backend.oneTap();
      return;
    }
    top.hidden = false;
    $("#topName").textContent = Backend.displayName(user);
    const avatar = user.user_metadata?.avatar_url;
    $("#topAvatar").hidden = !avatar;
    if (avatar) $("#topAvatar").src = avatar;

    const { data: ok, error } = await db().rpc("is_admin");
    if (error || !ok) {
      $("#loginBtn").hidden = true;
      $("#gateMsg").textContent = `A conta ${user.email} não tem acesso ao painel. É preciso registar este e-mail na tabela “admins” do Supabase.`;
      return;
    }
    startApp();
  });
});
