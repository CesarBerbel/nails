/* =========================================================
   Helen Regiani Nails — interações do site
   (+ login Google, unhas guardadas, verniz do stock, onboarding e rastreamento)
   ========================================================= */

// idioma da página: a versão inglesa está em /en/ (<html lang="en">); L("texto pt", "english text")
const EN = document.documentElement.lang.startsWith("en");
const L = (pt, en) => (EN ? en : pt);

const SERVICE_CATS = EN
  ? { todos: "All", naturais: "Natural nails", fortalecimento: "Strengthening", extensao: "Extensions", nailart: "Nail Art" }
  : { todos: "Todos", naturais: "Unhas naturais", fortalecimento: "Fortalecimento", extensao: "Extensão", nailart: "Nail Art" };

// os serviços são guardados e registados pelo nome em português; o texto mostrado segue o idioma
const ADVICE = "Ainda não sei / quero aconselhamento";
const svcText = (s) => (EN && s.en ? s.en : s);
function serviceLabel(name) {
  if (name === ADVICE) return L(ADVICE, "Not sure yet / I'd like advice");
  const s = CONFIG.services.find((x) => x.name === name);
  return s ? svcText(s).name : name;
}
const shapeLabel = (k) => (EN ? SHAPES[k].en : SHAPES[k].label);
const finishLabel = (k) => (EN ? FINISHES_EN : FINISHES)[k];
// nomes das cores da paleta (editados no painel, em português)
const COLOR_EN = {
  "Rosa Helen": "Helen Pink", "Rosa bebé": "Baby pink", "Nude": "Nude", "Chocolate": "Chocolate", "Vermelho": "Red",
  "Vinho": "Burgundy", "Lilás": "Lilac", "Azul bebé": "Baby blue", "Menta": "Mint", "Branco": "White", "Preto": "Black", "Dourado": "Gold",
};

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const smooth = () => ({ behavior: reduceMotion ? "auto" : "smooth" });
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* modo privado */ } },
};

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 3200);
}

const whatsappConfigured = () => !/^(55|351)?0+$/.test(CONFIG.whatsapp);
function waUrl(text) {
  return `https://wa.me/${CONFIG.whatsapp}${text ? "?text=" + encodeURIComponent(text) : ""}`;
}
function openWhatsApp(text) {
  if (!whatsappConfigured()) {
    toast("Número do WhatsApp ainda não configurado (vê js/config.js).");
    console.info("Mensagem que seria enviada:\n\n" + text);
    return;
  }
  window.open(waUrl(text), "_blank", "noopener");
}

/* ---------- paleta e stock de vernizes ---------- */
let palette = DEFAULT_PALETTE;
let stockColors = [];

const paletteMatch = (hex) => palette.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || null;
function colorName(hex) {
  const name = paletteMatch(hex)?.name;
  return name ? (EN && COLOR_EN[name]) || name : L("Cor exclusiva", "Custom colour");
}

function designLabel(d) {
  return `${colorName(d.color)} · ${shapeLabel(d.shape)} · ${finishLabel(d.finish)}${d.accent ? L(" · com coração", " · with heart") : ""}`;
}

/** Verniz do stock para a cor: o ligado à cor da paleta ou, numa cor exclusiva, o mais parecido. */
function polishFor(d) {
  const p = paletteMatch(d.color);
  if (p?.polish_label) return { label: p.polish_label, exact: true, inStock: p.polish_in_stock };
  const near = !p && stockColors.length ? nearestColor(d.color, stockColors) : null;
  if (near && near.distance < 10) return { label: near.label, hex: near.hex, exact: false, inStock: true };
  return null;
}

/** Propriedades do design enviadas ao rastreamento. */
function designProps(d, extra = {}) {
  return {
    shape: d.shape, color: d.color.toLowerCase(), color_name: paletteMatch(d.color)?.name || "Cor exclusiva", finish: d.finish,
    accent: !!d.accent, palette_color_id: paletteMatch(d.color)?.id || null, polish: polishFor(d)?.label || null, ...extra,
  };
}

/** Texto "🧴 Verniz: …" de uma cor (HTML). */
function polishInfoHtml(d, { allowUse = false } = {}) {
  const polish = polishFor(d);
  if (!polish) {
    return stockColors.length && !paletteMatch(d.color) ? L("🧴 Cor exclusiva — a Helen encontra o tom mais próximo no atendimento.", "🧴 Custom colour — Helen will find the closest shade at your appointment.") : "";
  }
  if (polish.exact) return `🧴 ${L("Verniz", "Polish")}: <strong>${escapeHtml(polish.label)}</strong>${polish.inStock ? "" : ` <span class="muted">${L("(sob consulta)", "(on request)")}</span>`}`;
  return `🧴 ${L("O mais parecido que a Helen tem", "The closest one Helen has")}: <strong>${escapeHtml(polish.label)}</strong>${allowUse ? ` <button type="button" class="link js-use-polish" data-hex="${polish.hex}" style="--c:${polish.hex}">${L("usar esta cor", "use this colour")}</button>` : ""}`;
}

/* ---------- estado do estúdio ---------- */
const state = { shape: "amendoada", color: "#E8588A", finish: "brilho", accent: true, skin: SKINS[0] };
let bookedDesign = null;
let userTouchedStudio = false;

function markCustomized() {
  if (userTouchedStudio) return;
  userTouchedStudio = true;
  Track.once("design_customize");
}

function renderPolishInfo() {
  const el = $("#polishInfo");
  const html = polishInfoHtml(state, { allowUse: true });
  el.hidden = !html;
  el.innerHTML = html;
}

// a mão (foto com filtros) só é desenhada quando o estúdio se aproxima do ecrã
let studioReady = false;
function renderStudio(animate = true) {
  if (studioReady) $("#handSvg").innerHTML = handMarkup(state, { animate: animate && !reduceMotion });
  $("#designName").textContent = designLabel(state);
  $$("#shapeChips .chip").forEach((b) => b.classList.toggle("active", b.dataset.v === state.shape));
  $$("#finishChips .chip").forEach((b) => b.classList.toggle("active", b.dataset.v === state.finish));
  $$("#colorSwatches .swatch").forEach((b) => b.classList.toggle("active", b.dataset.v.toLowerCase() === state.color.toLowerCase()));
  $$("#skinSwatches .swatch").forEach((b) => b.classList.toggle("active", b.dataset.v === state.skin));
  $("#accentToggle").checked = state.accent;
  renderPolishInfo();
}

function setDesign(d, { scroll = false } = {}) {
  Object.assign(state, { shape: d.shape, color: d.color, finish: d.finish, accent: !!d.accent });
  if (d.skin) state.skin = d.skin;
  $("#customColor").value = state.color;
  renderStudio();
  if (scroll) $("#estudio").scrollIntoView(smooth());
}

const swatchesHtml = () => palette.map((c) =>
  `<button type="button" class="swatch" style="--c:${c.hex}" data-v="${c.hex}" title="${escapeHtml(colorName(c.hex))}" aria-label="${escapeHtml(colorName(c.hex))}"></button>`).join("");

function buildStudio() {
  const mkChips = (el, obj, key, label) => {
    el.innerHTML = Object.keys(obj).map((k) => `<button type="button" class="chip" data-v="${k}">${label(k)}</button>`).join("");
    el.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      state[key] = b.dataset.v;
      markCustomized();
      renderStudio();
    });
  };
  mkChips($("#shapeChips"), SHAPES, "shape", shapeLabel);
  mkChips($("#finishChips"), FINISHES, "finish", finishLabel);

  const colors = $("#colorSwatches");
  colors.innerHTML = swatchesHtml();
  colors.addEventListener("click", (e) => {
    const b = e.target.closest(".swatch");
    if (!b) return;
    state.color = b.dataset.v;
    $("#customColor").value = state.color;
    markCustomized();
    renderStudio();
  });
  $("#customColor").addEventListener("input", (e) => { state.color = e.target.value; markCustomized(); renderStudio(false); });
  $("#polishInfo").addEventListener("click", (e) => {
    const b = e.target.closest(".js-use-polish");
    if (!b) return;
    state.color = b.dataset.hex;
    $("#customColor").value = state.color;
    renderStudio();
  });

  const skins = $("#skinSwatches");
  skins.innerHTML = SKINS.map((h, i) => `<button type="button" class="swatch" style="--c:${h}" data-v="${h}" aria-label="${L("Tom de pele", "Skin tone")} ${i + 1}"></button>`).join("");
  skins.addEventListener("click", (e) => {
    const b = e.target.closest(".swatch");
    if (!b) return;
    state.skin = b.dataset.v;
    renderStudio(false);
  });

  $("#accentToggle").addEventListener("change", (e) => { state.accent = e.target.checked; markCustomized(); renderStudio(); });

  $("#randomBtn").addEventListener("click", (e) => {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    state.shape = pick(Object.keys(SHAPES));
    state.color = pick(palette).hex;
    state.finish = pick(Object.keys(FINISHES));
    state.accent = Math.random() > 0.5;
    $("#customColor").value = state.color;
    markCustomized();
    Track.track("design_random");
    renderStudio();
    burst(e.clientX, e.clientY, 10);
  });

  $("#saveDesignBtn").addEventListener("click", (e) => saveCurrentDesign(e));

  $("#sendDesignBtn").addEventListener("click", (e) => {
    chooseDesign({ ...state }, "estudio");
    burst(e.clientX, e.clientY, 14);
  });

  renderStudio(false);
  const lazy = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    lazy.disconnect();
    studioReady = true;
    renderStudio(false);
  }, { rootMargin: "600px 0px" });
  lazy.observe($("#estudio"));
}

function chooseDesign(d, source) {
  bookedDesign = { ...d };
  updateBookingSummary();
  Track.track("design_choose", designProps(d, { source }));
  toast(L("Design guardado na marcação ♥", "Design added to your booking ♥"));
  setTimeout(() => $("#agendar").scrollIntoView(smooth()), 350);
}

/* ---------- login e unhas guardadas ---------- */
let savedDesigns = [];
const PENDING_KEY = "nails_pending_save";

function openLogin() {
  if (!Backend.enabled) { toast("Login ainda não configurado (vê js/config.js)."); return; }
  $("#loginModal").hidden = false;
  $("#googleBtn").focus();
}
function closeLogin() { $("#loginModal").hidden = true; }

async function saveCurrentDesign(e) {
  if (!Backend.enabled) { toast("Login ainda não configurado (vê js/config.js)."); return false; }
  await Backend.init(); // a sessão pode ainda não ter sido lida
  if (!Backend.user) {
    // o login com o Google sai da página; o design fica guardado para gravar no regresso
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(state)); } catch { /* ignore */ }
    Track.track("save_prompt", designProps(state));
    openLogin();
    return false;
  }
  if (savedDesigns.length >= CONFIG.maxSavedDesigns) {
    toast(L(`Já tens ${CONFIG.maxSavedDesigns} unhas guardadas. Apaga uma para guardares esta.`, `You already have ${CONFIG.maxSavedDesigns} saved designs. Delete one to save this one.`));
    $("#minhas").scrollIntoView(smooth());
    return false;
  }
  const btn = $("#saveDesignBtn");
  btn.disabled = true;
  try {
    const row = await Backend.saveDesign({
      ...state,
      name: `${colorName(state.color)} ${shapeLabel(state.shape).toLowerCase()}`,
      palette_color_id: paletteMatch(state.color)?.id,
    });
    savedDesigns.push(row);
    renderSaved();
    Track.track("design_save", designProps(state));
    toast(L(`Guardada! ${savedDesigns.length} de ${CONFIG.maxSavedDesigns} ♥`, `Saved! ${savedDesigns.length} of ${CONFIG.maxSavedDesigns} ♥`));
    if (e) burst(e.clientX, e.clientY, 12);
    return true;
  } catch (err) {
    toast(err.limit ? L(`Chegaste ao limite de ${CONFIG.maxSavedDesigns} unhas.`, `You've reached the limit of ${CONFIG.maxSavedDesigns} designs.`) : L("Não foi possível guardar agora. Tenta outra vez.", "Couldn't save right now. Please try again."));
    console.error(err);
    return false;
  } finally {
    btn.disabled = false;
  }
}

function renderSaved() {
  const grid = $("#savedGrid");
  if (!grid) return;
  const max = CONFIG.maxSavedDesigns;
  const user = Backend.user;
  $("#savedCta").hidden = !!user;

  if (!user) {
    $("#savedHint").textContent = L(`Entra com o Google para guardares até ${max} unhas e voltares a elas quando quiseres.`, `Sign in with Google to save up to ${max} designs and come back to them whenever you like.`);
    grid.innerHTML = Array.from({ length: max }, () => `<div class="saved__slot saved__slot--ghost"><span>♡</span></div>`).join("");
    return;
  }
  const first = Backend.displayName().split(" ")[0];
  $("#savedHint").textContent = savedDesigns.length
    ? L(`${first}, tens ${savedDesigns.length} de ${max} unhas guardadas.`, `${first}, you have ${savedDesigns.length} of ${max} designs saved.`)
    : L(`${first}, monta uma unha no estúdio e toca em “♡ Guardar”.`, `${first}, create a design in the studio and tap “♡ Save”.`);

  const cards = savedDesigns.map((d) => `
    <article class="saved__card" data-id="${d.id}">
      <button type="button" class="saved__del" data-act="del" aria-label="${L("Apagar", "Delete")}">×</button>
      <svg viewBox="0 0 520 380" aria-hidden="true">${handMarkup(d)}</svg>
      <h3>${escapeHtml(d.name || designLabel(d))}</h3>
      <p>${escapeHtml(designLabel(d))}</p>
      <div class="saved__actions">
        <button type="button" class="chip" data-act="open">${L("Abrir", "Open")}</button>
        <button type="button" class="chip" data-act="rename">${L("Mudar nome", "Rename")}</button>
        <button type="button" class="chip chip--solid" data-act="book">${L("Marcar", "Book")}</button>
      </div>
    </article>`);
  const free = Array.from({ length: Math.max(0, max - savedDesigns.length) }, () =>
    `<button type="button" class="saved__slot" data-act="new"><span>+</span>${L("espaço livre", "free slot")}</button>`);
  grid.innerHTML = cards.join("") + free.join("");
}

function buildSaved() {
  if (!Backend.enabled) {
    $("#minhas").remove();
    $$('a[href="#minhas"]').forEach((a) => a.remove());
    $("#saveDesignBtn").remove();
    return;
  }
  renderSaved();
  $("#savedGrid").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "new") { $("#estudio").scrollIntoView(smooth()); return; }
    const card = btn.closest(".saved__card");
    const d = savedDesigns.find((x) => x.id === card?.dataset.id);
    if (!d) return;
    if (act === "open") { setDesign(d, { scroll: true }); toast(L(`“${d.name}” aberta no estúdio ✨`, `“${d.name}” opened in the studio ✨`)); }
    if (act === "book") chooseDesign({ shape: d.shape, color: d.color, finish: d.finish, accent: d.accent, skin: d.skin || state.skin }, "minhas_unhas");
    if (act === "rename") {
      const name = prompt(L("Nome desta unha:", "Name for this design:"), d.name || "");
      if (name == null || !name.trim()) return;
      try { await Backend.renameDesign(d.id, name.trim().slice(0, 60)); d.name = name.trim().slice(0, 60); renderSaved(); }
      catch { toast(L("Não foi possível mudar o nome.", "Couldn't rename it.")); }
    }
    if (act === "del") {
      if (!confirm(L(`Apagar “${d.name}”?`, `Delete “${d.name}”?`))) return;
      try {
        await Backend.deleteDesign(d.id);
        savedDesigns = savedDesigns.filter((x) => x.id !== d.id);
        Track.track("design_delete", designProps(d));
        renderSaved();
      } catch { toast(L("Não foi possível apagar.", "Couldn't delete it.")); }
    }
  });
}

function renderAuth() {
  const user = Backend.user;
  $("#loginBtn").hidden = !!user;
  $("#userMenu").hidden = !user;
  if (!user) return;
  const name = Backend.displayName();
  const avatar = user.user_metadata?.avatar_url;
  $("#userName").textContent = name;
  $("#avatarImg").hidden = !avatar;
  if (avatar) $("#avatarImg").src = avatar;
  $("#avatarInitial").textContent = avatar ? "" : (name[0] || "♥").toUpperCase();
  const nome = $("#bookingForm").nome;
  if (!nome.value && !name.includes("@")) nome.value = name;
}

function buildAuth() {
  if (!Backend.enabled) return;
  $("#authBox").hidden = false;
  $("#loginBtn").addEventListener("click", () => { Track.track("login_open", { from: "menu" }); openLogin(); });
  $$(".js-login").forEach((b) => b.addEventListener("click", () => { Track.track("login_open", { from: "minhas" }); openLogin(); }));
  $("#googleBtn").addEventListener("click", async () => {
    try { await Backend.signInWithGoogle(); }
    catch (err) { console.error(err); toast(L("Não foi possível entrar agora.", "Couldn't sign in right now.")); }
  });
  $("#loginModal").addEventListener("click", (e) => { if (e.target === e.currentTarget || e.target.closest("[data-close]")) closeLogin(); });

  const menu = $("#authMenu"), avatarBtn = $("#avatarBtn");
  avatarBtn.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
    avatarBtn.setAttribute("aria-expanded", String(!menu.hidden));
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("#userMenu")) menu.hidden = true; });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) menu.hidden = true; });
  $("#logoutBtn").addEventListener("click", async () => {
    menu.hidden = true;
    await Backend.signOut();
    toast(L("Saíste da tua conta.", "You've signed out."));
  });

  Backend.onAuth(async (user, event) => {
    renderAuth();
    if (!user) {
      savedDesigns = [];
      renderSaved();
      // sem sessão no site: o Google mostra "Continuar como …" se houver sessão no navegador
      if (event === "INITIAL_SESSION") Backend.oneTap();
      return;
    }
    if (event === "SIGNED_IN") Track.once("login", { provider: Backend.lastLoginMethod || "google" });
    closeLogin();
    resumeOnboardingAfterLogin();
    try { savedDesigns = await Backend.listDesigns(); } catch (err) { console.error(err); }
    renderSaved();

    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY)); sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    if (pending?.shape) {
      setDesign(pending);
      await saveCurrentDesign();
      setTimeout(() => $("#minhas").scrollIntoView(smooth()), 300);
    }
  });
}

/* =========================================================
   ONBOARDING — a Helen guia a cliente a criar a unha
   Cada passo mostrado é registado (onboarding_step), assim o painel
   mostra até onde cada pessoa chegou e onde desistiu.
   ========================================================= */
const ONB_STEPS = [
  { key: "nome", label: "Nome" },
  { key: "servico", label: "Serviço" },
  { key: "pele", label: "Tom de pele" },
  { key: "formato", label: "Formato" },
  { key: "cor", label: "Cor" },
  { key: "acabamento", label: "Acabamento" },
  { key: "resultado", label: "Resultado" },
];
const onb = { open: false, step: 1, maxTracked: 0, name: "", service: "", design: null, done: false };
const ONB_SEEN = "nails_onb_seen";
const ONB_RESUME = "nails_onb_resume"; // "Começar com o Google": o login sai da página e o onboarding retoma no regresso

async function onbStartWithGoogle() {
  Track.track("onboarding_action", { action: "google" });
  try { sessionStorage.setItem(ONB_RESUME, JSON.stringify({ from: onb.from, name: onb.name })); } catch { /* ignore */ }
  try { await Backend.signInWithGoogle(); }
  catch (err) {
    console.error(err);
    try { sessionStorage.removeItem(ONB_RESUME); } catch { /* ignore */ }
    toast(L("Não foi possível entrar agora.", "Couldn't sign in right now."));
  }
}

function resumeOnboardingAfterLogin() {
  let resume = null;
  try { resume = JSON.parse(sessionStorage.getItem(ONB_RESUME)); sessionStorage.removeItem(ONB_RESUME); } catch { /* ignore */ }
  if (resume) {
    if (!onb.open) openOnboarding(resume.from || "google");
    onb.name = resume.name || onb.name || Backend.displayName().split(" ")[0];
    if (onb.name.includes("@")) onb.name = "";
    onbGo(2);
  } else if (onb.open && onb.step === 1) renderOnb(); // entrou por outro lado (One Tap): esconde o botão do Google
}

function openOnboarding(from) {
  hideInvite();
  store.set(ONB_SEEN, "1");
  const nome = $("#bookingForm").nome.value.trim();
  Object.assign(onb, {
    open: true, step: 1, maxTracked: 0, done: false, from,
    name: nome || (Backend.user ? Backend.displayName().split(" ")[0] : ""),
    service: "", design: { ...state },
  });
  if (onb.name.includes("@")) onb.name = "";
  Track.track("onboarding_start", { from });
  $("#onb").hidden = false;
  document.body.style.overflow = "hidden";
  renderOnb();
}

function closeOnboarding() {
  if (!onb.open) return;
  if (!onb.done) Track.track("onboarding_close", { step: onb.step, key: ONB_STEPS[onb.step - 1].key });
  onb.open = false;
  $("#onb").hidden = true;
  document.body.style.overflow = "";
}

function onbGo(step) {
  onb.step = Math.max(1, Math.min(ONB_STEPS.length, step));
  renderOnb();
}

function onbHand(animate = true) {
  $("#onbHand").innerHTML = handMarkup(onb.design, { animate: animate && !reduceMotion });
}

function renderOnb() {
  const i = onb.step, total = ONB_STEPS.length, key = ONB_STEPS[i - 1].key;
  const body = $("#onbBody");
  body.style.animation = "none";
  void body.offsetWidth;
  body.style.animation = "";
  $("#onbBar").style.width = `${((i - 1) / (total - 1)) * 100}%`;
  $("#onbCount").textContent = key === "resultado" ? L("Pronto! ♥", "Done! ♥") : L(`Passo ${i} de ${total - 1}`, `Step ${i} of ${total - 1}`);
  $("#onbPreview").hidden = i < 3;
  if (i >= 3) onbHand();
  $("#onbBack").style.visibility = i > 1 && key !== "resultado" ? "visible" : "hidden";
  $("#onbNav").hidden = key === "resultado";
  $("#onbNext").textContent = i === 1 ? L("Começar ♥", "Start ♥") : i === total - 1 ? L("Ver a minha unha ✨", "See my nails ✨") : L("Continuar", "Continue");
  $("#onbNav").classList.toggle("onb__nav--start", i === 1);
  $("#onbGoogle").hidden = !(i === 1 && Backend.enabled && !Backend.user);
  const hi = onb.name ? `${escapeHtml(onb.name)}, ` : "";

  if (key === "nome") {
    body.innerHTML = `
      <div class="onb__hello">
        <img src="/assets/logo-256.jpg" alt="" width="110" height="110" />
        <p class="script">${L("olá, eu sou a Helen", "hi, I'm Helen")}</p>
        <h3>${L("Vamos criar a tua unha?", "Shall we design your nails?")}</h3>
        <p class="muted">${L("São só 6 perguntinhas. No fim podes guardar o design ou marcar logo pelo WhatsApp.", "Just 6 quick questions. At the end you can save the design or book straight away on WhatsApp.")}</p>
        <input class="onb__input" id="onbName" type="text" maxlength="40" autocomplete="given-name" placeholder="${L("Como te chamas? (opcional)", "What's your name? (optional)")}" value="${escapeHtml(onb.name)}" />
      </div>`;
    const input = $("#onbName");
    input.addEventListener("input", () => (onb.name = input.value.trim()));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") onbGo(2); });
  }

  if (key === "servico") {
    const opts = [...CONFIG.services.map((s) => ({ icon: s.icon, name: s.name })), { icon: "🤍", name: ADVICE }];
    body.innerHTML = `
      <h3>${L(`${hi ? `${hi}q` : "Q"}ue serviço procuras?`, `${hi ? `${hi}w` : "W"}hich service are you looking for?`)}</h3>
      <p>${L("Se ainda não sabes, não faz mal — a Helen aconselha-te.", "Not sure yet? No problem — Helen will advise you.")}</p>
      <div class="onb__options">${opts.map((o) => `<button type="button" class="onb__opt${onb.service === o.name ? " active" : ""}" data-v="${escapeHtml(o.name)}"><span>${o.icon}</span>${escapeHtml(serviceLabel(o.name))}</button>`).join("")}</div>`;
    body.querySelector(".onb__options").addEventListener("click", (e) => {
      const b = e.target.closest(".onb__opt");
      if (!b) return;
      onb.service = b.dataset.v;
      $$(".onb__opt", body).forEach((x) => x.classList.toggle("active", x === b));
      setTimeout(() => onbGo(3), 250);
    });
  }

  if (key === "pele") {
    body.innerHTML = `
      <h3>${L("Qual é o teu tom de pele?", "What's your skin tone?")}</h3>
      <p>${L("Assim vês como a unha fica na tua mão.", "So you can see how the nails look on your hand.")}</p>
      <div class="swatches swatches--skin">${SKINS.map((h, n) => `<button type="button" class="swatch${onb.design.skin === h ? " active" : ""}" style="--c:${h}" data-v="${h}" aria-label="${L("Tom de pele", "Skin tone")} ${n + 1}"></button>`).join("")}</div>`;
    body.querySelector(".swatches").addEventListener("click", (e) => {
      const b = e.target.closest(".swatch");
      if (!b) return;
      onb.design.skin = b.dataset.v;
      $$(".swatch", body).forEach((x) => x.classList.toggle("active", x === b));
      onbHand(false);
    });
  }

  if (key === "formato") {
    body.innerHTML = `
      <h3>${L("Que formato preferes?", "Which shape do you prefer?")}</h3>
      <p>${L("Toca para ver na mão.", "Tap to see it on the hand.")}</p>
      <div class="chips">${Object.keys(SHAPES).map((k) => `<button type="button" class="chip${onb.design.shape === k ? " active" : ""}" data-v="${k}">${shapeLabel(k)}</button>`).join("")}</div>`;
    body.querySelector(".chips").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      onb.design.shape = b.dataset.v;
      markCustomized();
      $$(".chip", body).forEach((x) => x.classList.toggle("active", x === b));
      onbHand();
    });
  }

  if (key === "cor") {
    body.innerHTML = `
      <h3>${L("Escolhe a cor", "Pick the colour")}</h3>
      <p>${L("Cada cor corresponde a um verniz que a Helen tem no estúdio.", "Each colour matches a polish Helen has in the studio.")}</p>
      <div class="swatches">${swatchesHtml()}</div>
      <p class="polish-info" id="onbPolish"></p>`;
    const paint = () => {
      $$(".swatch", body).forEach((x) => x.classList.toggle("active", x.dataset.v.toLowerCase() === onb.design.color.toLowerCase()));
      const html = polishInfoHtml(onb.design);
      $("#onbPolish").hidden = !html;
      $("#onbPolish").innerHTML = html;
    };
    body.querySelector(".swatches").addEventListener("click", (e) => {
      const b = e.target.closest(".swatch");
      if (!b) return;
      onb.design.color = b.dataset.v;
      markCustomized();
      paint();
      onbHand(false);
    });
    paint();
  }

  if (key === "acabamento") {
    body.innerHTML = `
      <h3>${L("E o acabamento?", "And the finish?")}</h3>
      <div class="chips">${Object.keys(FINISHES).map((k) => `<button type="button" class="chip${onb.design.finish === k ? " active" : ""}" data-v="${k}">${finishLabel(k)}</button>`).join("")}</div>
      <label class="switch"><input type="checkbox" id="onbAccent" ${onb.design.accent ? "checked" : ""} /><span class="switch__track"></span>${L("Unha de destaque com coração", "Accent nail with a heart")}</label>`;
    body.querySelector(".chips").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      onb.design.finish = b.dataset.v;
      markCustomized();
      $$(".chip", body).forEach((x) => x.classList.toggle("active", x === b));
      onbHand();
    });
    $("#onbAccent").addEventListener("change", (e) => { onb.design.accent = e.target.checked; onbHand(); });
  }

  if (key === "resultado") {
    const info = polishInfoHtml(onb.design);
    body.innerHTML = `
      <div class="onb__result">
        <p class="script">${L("ficou linda", "it looks lovely")}</p>
        <h3>${L(`${onb.name ? `${escapeHtml(onb.name)}, a` : "A"} tua unha está pronta!`, `${onb.name ? `${escapeHtml(onb.name)}, y` : "Y"}our nails are ready!`)}</h3>
        <p><strong>${escapeHtml(designLabel(onb.design))}</strong>${onb.service ? `<br><span class="muted">${escapeHtml(serviceLabel(onb.service))}</span>` : ""}</p>
        ${info ? `<p class="polish-info">${info}</p>` : ""}
        <div class="onb__actions">
          <button type="button" class="btn" data-onb-act="book">${L("Marcar com este design ♥", "Book with this design ♥")}</button>
          ${Backend.enabled ? `<button type="button" class="btn btn--ghost" data-onb-act="save">${L("♡ Guardar nas minhas unhas", "♡ Save to my nails")}</button>` : ""}
          <button type="button" class="onb__skip" data-onb-act="studio">${L("Afinar no estúdio", "Fine-tune in the studio")}</button>
        </div>
      </div>`;
    body.querySelector(".onb__actions").addEventListener("click", onbAction);
  }

  // regista cada passo novo alcançado (voltar atrás não conta de novo)
  if (i > onb.maxTracked) {
    onb.maxTracked = i;
    Track.track("onboarding_step", { step: i, key });
    if (key === "resultado") {
      onb.done = true;
      Track.track("onboarding_complete", designProps(onb.design, { service: onb.service, skin: onb.design.skin, has_name: !!onb.name }));
    }
  }
}

async function onbAction(e) {
  const b = e.target.closest("[data-onb-act]");
  if (!b) return;
  const act = b.dataset.onbAct;
  Track.track("onboarding_action", { action: act });
  setDesign(onb.design);
  const f = $("#bookingForm");
  if (onb.name && !f.nome.value) f.nome.value = onb.name;
  if (onb.service) f.servico.value = onb.service;
  closeOnboarding();
  if (act === "book") chooseDesign({ ...onb.design }, "onboarding");
  if (act === "save") { const ok = await saveCurrentDesign(e); if (ok) setTimeout(() => $("#minhas").scrollIntoView(smooth()), 300); }
  if (act === "studio") $("#estudio").scrollIntoView(smooth());
  burst(e.clientX, e.clientY, 14);
}

function hideInvite() { $("#onbInvite").hidden = true; }

function buildOnboarding() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-onb]");
    if (b) openOnboarding(b.dataset.onb);
  });
  $("#onbClose").addEventListener("click", closeOnboarding);
  $("#onb").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeOnboarding(); });
  $("#onbNext").addEventListener("click", () => onbGo(onb.step + 1));
  $("#onbGoogle").addEventListener("click", onbStartWithGoogle);
  $("#onbBack").addEventListener("click", () => onbGo(onb.step - 1));

  const dismiss = () => {
    hideInvite();
    store.set(ONB_SEEN, "1");
    Track.track("onboarding_invite_dismiss");
  };
  $("#onbInviteClose").addEventListener("click", dismiss);
  $("#onbInviteLater").addEventListener("click", dismiss);

  // convite automático só na primeira visita
  if (CONFIG.onboardingInviteDelay > 0 && !store.get(ONB_SEEN)) {
    setTimeout(() => {
      if (onb.open || !$("#loginModal").hidden || store.get(ONB_SEEN)) return;
      $("#consent").hidden = true;
      $("#onbInvite").hidden = false;
      Track.track("onboarding_invite");
    }, CONFIG.onboardingInviteDelay * 1000);
  }
}

/* ---------- serviços ---------- */
function buildServices() {
  const draw = (cat) => {
    $("#servicesGrid").innerHTML = CONFIG.services
      .filter((s) => cat === "todos" || s.cat === cat)
      .map((s, i) => ({ s, t: svcText(s), i }))
      .map(({ s, t, i }) => `
    <article class="service" style="animation-delay:${i * 0.06}s" tabindex="0">
      <div class="service__inner">
        <div class="service__face">
          <span class="service__cat">${SERVICE_CATS[s.cat]}</span>
          <div class="service__icon">${s.icon}</div>
          <h3>${t.name}</h3>
          <p class="muted">${t.short}</p>
          ${s.price ? `<p class="service__price">${L("a partir de", "from")}<strong>${s.price}</strong></p>` : `<p class="service__more">${L("ver detalhes ↻", "see details ↻")}</p>`}
        </div>
        <div class="service__face service__face--back">
          <h3>${t.name}</h3>
          <p>${t.details}</p>
          <button type="button" class="btn" data-service="${s.name}">${L("Marcar ♥", "Book ♥")}</button>
        </div>
      </div>
    </article>`).join("");
  };
  const filters = $("#serviceFilters");
  filters.innerHTML = Object.entries(SERVICE_CATS).map(([k, v], i) => `<button type="button" class="chip${i ? "" : " active"}" data-v="${k}">${v}</button>`).join("");
  filters.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    $$(".chip", filters).forEach((c) => c.classList.toggle("active", c === b));
    draw(b.dataset.v);
  });
  draw("todos");

  $("#servicesGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-service]");
    if (btn) {
      $("#serviceSelect").value = btn.dataset.service;
      Track.track("service_click", { service: btn.dataset.service });
      $("#agendar").scrollIntoView(smooth());
      return;
    }
    // No telemóvel, tocar vira o cartão
    const card = e.target.closest(".service");
    if (card && matchMedia("(hover: none)").matches) card.classList.toggle("flipped");
  });
  $("#servicesGrid").addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("service")) {
      e.preventDefault();
      e.target.classList.toggle("flipped");
    }
  });

  $("#serviceSelect").innerHTML = [...CONFIG.services.map((s) => s.name), ADVICE]
    .map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(serviceLabel(n))}</option>`).join("");
}

/* ---------- galeria ---------- */
const GALLERY = [
  { name: "Rosa Helen", en: "Helen Pink", tag: "delicadas", shape: "amendoada", color: "#E8588A", finish: "brilho", accent: true },
  { name: "Chocolate Chic", en: "Chocolate Chic", tag: "classicas", shape: "quadrada", color: "#5A2E1E", finish: "brilho", accent: false },
  { name: "Francesa Rosé", en: "Rosé French", tag: "classicas", shape: "amendoada", color: "#FAFAFA", finish: "francesinha", accent: false },
  { name: "Nude Clean", en: "Clean Nude", tag: "delicadas", shape: "curta", color: "#E7B9A6", finish: "fosco", accent: false },
  { name: "Vermelho Paixão", en: "Passion Red", tag: "marcantes", shape: "stiletto", color: "#C8102E", finish: "brilho", accent: false },
  { name: "Glow Dourado", en: "Golden Glow", tag: "festa", shape: "bailarina", color: "#D4AF37", finish: "cromado", accent: false },
  { name: "Lilás Glitter", en: "Lilac Glitter", tag: "festa", shape: "amendoada", color: "#B79CE0", finish: "glitter", accent: false },
  { name: "Vinho Matte", en: "Matte Burgundy", tag: "marcantes", shape: "bailarina", color: "#6D1A36", finish: "fosco", accent: false },
  { name: "Ombré Rosa", en: "Pink Ombré", tag: "delicadas", shape: "amendoada", color: "#E8588A", finish: "ombre", accent: false },
  { name: "Menta Fresh", en: "Fresh Mint", tag: "delicadas", shape: "redonda", color: "#A8E0C8", finish: "brilho", accent: true },
  { name: "Black Glam", en: "Black Glam", tag: "festa", shape: "stiletto", color: "#1E1A1C", finish: "glitter", accent: false },
  { name: "Francesa Colorida", en: "Colourful French", tag: "marcantes", shape: "quadrada", color: "#E8588A", finish: "francesinha", accent: true },
];
const TAGS = EN
  ? { todas: "All", delicadas: "Delicate", classicas: "Classic", marcantes: "Bold", festa: "Party" }
  : { todas: "Todas", delicadas: "Delicadas", classicas: "Clássicas", marcantes: "Marcantes", festa: "Para festas" };

function buildGallery() {
  const filters = $("#galleryFilters");
  filters.innerHTML = Object.entries(TAGS).map(([k, v], i) => `<button type="button" class="chip${i ? "" : " active"}" data-v="${k}">${v}</button>`).join("");

  const draw = (tag) => {
    $("#gallery").innerHTML = GALLERY.map((g, i) => ({ g, i }))
      .filter(({ g }) => tag === "todas" || g.tag === tag)
      .map(({ g, i }, n) => `
        <button type="button" class="g-item" data-i="${i}" style="animation-delay:${n * 0.05}s">
          <svg viewBox="0 0 520 380" aria-hidden="true">${handMarkup({ ...g, skin: SKINS[i % 3] })}</svg>
          <h3>${L(g.name, g.en)}</h3>
          <p>${shapeLabel(g.shape)} · ${finishLabel(g.finish)}</p>
        </button>`).join("");
  };
  filters.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    $$(".chip", filters).forEach((c) => c.classList.toggle("active", c === b));
    draw(b.dataset.v);
  });
  $("#gallery").addEventListener("click", (e) => {
    const item = e.target.closest(".g-item");
    if (!item) return;
    const { name, en, tag, ...design } = GALLERY[+item.dataset.i];
    setDesign({ ...design, skin: state.skin }, { scroll: true });
    Track.track("gallery_open", designProps(design, { name }));
    toast(L(`“${name}” aberto no estúdio ✨`, `“${en}” opened in the studio ✨`));
  });
  // as 12 mãos só são desenhadas quando a galeria se aproxima do ecrã (página abre mais depressa)
  const lazy = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    lazy.disconnect();
    if (!$("#gallery").children.length) draw("todas");
  }, { rootMargin: "600px 0px" });
  lazy.observe($("#galeria"));
}

/* ---------- quiz ---------- */
const QUIZ = [
  {
    q: L("Como descreverias o teu estilo?", "How would you describe your style?"), key: "style",
    opts: [
      { icon: "🌷", text: L("Romântica e delicada", "Romantic and delicate"), v: { color: "#F9C6D6", vibe: "Romântica", vibeEn: "Romantic" } },
      { icon: "🤍", text: L("Clássica e elegante", "Classic and elegant"), v: { color: "#E7B9A6", vibe: "Elegante", vibeEn: "Elegant" } },
      { icon: "🔥", text: L("Poderosa e marcante", "Powerful and bold"), v: { color: "#C8102E", vibe: "Poderosa", vibeEn: "Powerful" } },
      { icon: "🦋", text: L("Criativa e divertida", "Creative and fun"), v: { color: "#B79CE0", vibe: "Criativa", vibeEn: "Creative" } },
      { icon: "🍫", text: L("Sofisticada e discreta", "Sophisticated and understated"), v: { color: "#5A2E1E", vibe: "Sofisticada", vibeEn: "Sophisticated" } },
    ],
  },
  {
    q: L("E a tua rotina com as mãos?", "And what's your daily routine with your hands like?"), key: "routine",
    opts: [
      { icon: "⌨️", text: L("Uso muito: escrevo, cozinho, pego em peso", "I use them a lot: typing, cooking, lifting"), v: { shape: "curta" } },
      { icon: "☕", text: L("Equilibrada, nada muito pesado", "Balanced, nothing too heavy"), v: { shape: "redonda" } },
      { icon: "💃", text: L("Adoro unhas compridas e elegantes", "I love long, elegant nails"), v: { shape: "amendoada" } },
      { icon: "👑", text: L("Quanto mais longa, melhor!", "The longer, the better!"), v: { shape: "bailarina" } },
    ],
  },
  {
    q: L("Para que ocasião são as unhas?", "What's the occasion?"), key: "occasion",
    opts: [
      { icon: "🌤️", text: L("Dia a dia", "Everyday"), v: { finish: "brilho" } },
      { icon: "💼", text: L("Trabalho e reuniões", "Work and meetings"), v: { finish: "fosco" } },
      { icon: "🥂", text: L("Festa ou evento", "A party or event"), v: { finish: "glitter" } },
      { icon: "💍", text: L("Momento especial / noivado", "A special moment / engagement"), v: { finish: "francesinha" } },
    ],
  },
];
function buildQuiz() {
  let step = 0, answers = {};
  const body = $("#quizBody"), bar = $("#quizBar");

  const render = () => {
    body.style.animation = "none";
    void body.offsetWidth;
    body.style.animation = "";
    bar.style.width = `${(step / QUIZ.length) * 100}%`;

    if (step < QUIZ.length) {
      const q = QUIZ[step];
      body.innerHTML = `
        <p class="quiz__q">${q.q}</p>
        <div class="quiz__opts">
          ${q.opts.map((o, i) => `<button type="button" class="quiz__opt" data-i="${i}"><span>${o.icon}</span>${o.text}</button>`).join("")}
        </div>`;
      return;
    }
    const r = Object.assign({ accent: true, skin: state.skin }, ...Object.values(answers));
    const { vibe, vibeEn, ...design } = r;
    Track.track("quiz_complete", designProps(design, { vibe }));
    body.innerHTML = `
      <div class="quiz__result">
        <p class="script">${L("a tua vibe é", "your vibe is")}</p>
        <h3>${L(vibe, vibeEn)}</h3>
        <svg viewBox="0 0 520 380" aria-hidden="true">${handMarkup(design, { animate: !reduceMotion })}</svg>
        <p>${L("Sugerimos", "We suggest")}: <strong>${designLabel(design)}</strong></p>
        <button type="button" class="btn" id="quizOpen">${L("Abrir no estúdio ✨", "Open in the studio ✨")}</button>
        <button type="button" class="btn btn--ghost" id="quizRedo">${L("Refazer", "Start again")}</button>
      </div>`;
    $("#quizOpen").onclick = () => setDesign(design, { scroll: true });
    $("#quizRedo").onclick = () => { step = 0; answers = {}; render(); };
  };

  body.addEventListener("click", (e) => {
    const b = e.target.closest(".quiz__opt");
    if (!b) return;
    if (step === 0) Track.track("quiz_start");
    answers[QUIZ[step].key] = QUIZ[step].opts[+b.dataset.i].v;
    step++;
    if (step === QUIZ.length) burst(e.clientX, e.clientY, 16);
    render();
  });
  render();
}

/* ---------- FAQ ---------- */
const FAQ = EN ? [
  ["Where are appointments held?", "In Coimbra, Portugal. When you book on WhatsApp, Helen will send you all the details."],
  ["What's the difference between nail strengthening and a gel overlay?", "Both protect the natural nail. Strengthening is ideal for fragile, brittle nails; a gel overlay adds a layer with more structure and durability. If in doubt, Helen will advise you at your appointment."],
  ["How often should I have my extensions maintained?", "It depends on how fast your natural nails grow. Helen will tell you the ideal interval to keep your extensions beautiful and safe."],
  ["Can I bring a reference photo?", "Of course! You can send it on WhatsApp when you book — or design your nails here on the website."],
  ["How are hygiene and safety ensured?", "With many years of experience as a nurse, Helen takes special care with hygiene, safety and organisation at every appointment."],
  ["Are the colours on the website Helen's polishes?", "Yes! The studio colours are linked to the polishes Helen has. When you pick a colour, the polish name appears — and it's included in your booking message."],
  ["Why sign in with Google?", `To save up to ${CONFIG.maxSavedDesigns} favourite designs and come back to them whenever you like, on any device.`],
] : [
  ["Onde é o atendimento?", "Em Coimbra, Portugal. Ao marcar pelo WhatsApp, a Helen envia-te todos os detalhes."],
  ["Qual a diferença entre blindagem e banho de gel?", "Ambos protegem a unha natural. A blindagem é indicada para fortalecer unhas frágeis e quebradiças; o banho de gel cria uma camada com mais estrutura e durabilidade. Na dúvida, a Helen aconselha-te no atendimento."],
  ["De quanto em quanto tempo devo fazer a manutenção da extensão?", "Depende do crescimento da tua unha natural. A Helen indica-te o intervalo ideal para manteres a extensão bonita e segura."],
  ["Posso levar uma foto de referência?", "Claro! Podes enviá-la pelo WhatsApp ao marcar — ou montar a tua unha aqui no site."],
  ["Como são garantidas a higiene e a segurança?", "Com a experiência de muitos anos como enfermeira, a Helen tem uma preocupação especial com higiene, segurança e organização em cada atendimento."],
  ["As cores do site são os vernizes da Helen?", "Sim! As cores do estúdio estão ligadas aos vernizes que a Helen tem. Ao escolheres uma cor, aparece o nome do verniz — e ele segue na mensagem da marcação."],
  ["Para que serve entrar com o Google?", `Para guardares até ${CONFIG.maxSavedDesigns} unhas favoritas e voltares a elas quando quiseres, em qualquer aparelho.`],
];
function buildFaq() {
  const el = $("#faq");
  el.innerHTML = FAQ.map(([q, a], i) => `
    <div class="faq__item">
      <button type="button" class="faq__q" aria-expanded="false" aria-controls="fa${i}">${q}</button>
      <div class="faq__a" id="fa${i}"><div><p>${a}</p></div></div>
    </div>`).join("");
  el.addEventListener("click", (e) => {
    const q = e.target.closest(".faq__q");
    if (!q) return;
    const item = q.parentElement;
    const open = !item.classList.contains("open");
    $$(".faq__item", el).forEach((it) => { it.classList.remove("open"); $(".faq__q", it).setAttribute("aria-expanded", "false"); });
    item.classList.toggle("open", open);
    q.setAttribute("aria-expanded", String(open));
    if (open) Track.track("faq_open", { q: q.textContent });
  });
}

/* ---------- agendamento ---------- */
function updateBookingSummary() {
  const box = $("#bookingSummary");
  box.hidden = !bookedDesign;
  if (!bookedDesign) return;
  $("#miniHand").innerHTML = handMarkup(bookedDesign, { animate: !reduceMotion });
  const polish = polishFor(bookedDesign);
  $("#summaryText").textContent = designLabel(bookedDesign) + (polish ? ` — 🧴 ${polish.label}` : "");
}
function buildBooking() {
  const date = $("#dateInput");
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  date.min = today.toISOString().slice(0, 10);

  $("#clearDesign").addEventListener("click", () => { bookedDesign = null; updateBookingSummary(); });

  const form = $("#bookingForm");
  const started = () => Track.once("booking_start");
  form.addEventListener("input", started);
  form.addEventListener("change", started);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const err = $("#formError");
    $$(".invalid", f).forEach((x) => x.classList.remove("invalid"));
    const missing = ["nome", "data"].filter((n) => !f[n].value.trim() || (n === "data" && f.data.value < date.min));
    if (missing.length) {
      missing.forEach((n) => f[n].classList.add("invalid"));
      err.textContent = missing.includes("nome") ? L("Diz-me o teu nome? ♥", "What's your name? ♥") : L("Escolhe uma data a partir de hoje.", "Please choose a date from today onwards.");
      f[missing[0]].focus();
      Track.track("booking_error", { missing: missing.join(",") });
      return;
    }
    err.textContent = "";
    const [y, m, d] = f.data.value.split("-");
    const period = f.periodo.selectedOptions[0].text;
    const lines = [
      L(`Olá, Helen! ♥ Chamo-me ${f.nome.value.trim()}.`, `Hi Helen! ♥ My name is ${f.nome.value.trim()}.`),
      `${L("Gostaria de marcar", "I'd like to book")}: *${serviceLabel(f.servico.value)}*`,
      `📅 ${d}/${m}/${y} — ${period}`,
    ];
    if (bookedDesign) {
      lines.push(`💅 Design: ${designLabel(bookedDesign)}${paletteMatch(bookedDesign.color) ? "" : ` (${bookedDesign.color})`}`);
      const polish = polishFor(bookedDesign);
      if (polish) lines.push(`🧴 ${polish.exact ? L("Verniz", "Polish") : L("Verniz mais parecido", "Closest polish")}: ${polish.label}`);
    }
    if (f.obs.value.trim()) lines.push(`📝 ${f.obs.value.trim()}`);

    Track.once("booking_start");
    Track.track("booking_submit", {
      service: f.servico.value, period: f.periodo.value,
      ...(bookedDesign ? designProps(bookedDesign) : {}),
    });
    Track.flush();
    openWhatsApp(lines.join("\n"));
  });
}

/* ---------- sobre a Helen ---------- */
const JOURNEY = EN ? [
  { icon: "🩺", title: "Many years as a nurse", text: "Hospital experience in intensive care and emergency departments. That's where I learned precision, responsibility and attention to each person's needs." },
  { icon: "💅", title: "A passion that became a profession", text: "My interest in nails began as a wish to learn something new. I studied, practised and refined different techniques until it became a new professional path." },
  { icon: "🌸", title: "Helen Regiani Nails, in Coimbra", text: "Today I bring together creativity, beauty and care. I keep investing in training and practice, because every appointment is a chance to grow and deliver an even better result." },
] : [
  { icon: "🩺", title: "Muitos anos como enfermeira", text: "Experiência hospitalar em cuidados intensivos e urgências. Foi aí que aprendi a precisão, a responsabilidade e a atenção às necessidades de cada pessoa." },
  { icon: "💅", title: "Uma paixão que virou profissão", text: "O interesse pelas unhas começou como vontade de aprender algo novo. Estudei, pratiquei e aperfeiçoei diferentes técnicas até isso se tornar um novo projeto profissional." },
  { icon: "🌸", title: "Helen Regiani Nails, em Coimbra", text: "Hoje uno criatividade, beleza e cuidado. Continuo a investir em formação e prática, porque cada atendimento é uma oportunidade de evoluir e oferecer um resultado ainda melhor." },
];
const VALUES = EN ? [
  ["Precision", "Every detail counts: from preparing the nail to the final finish."],
  ["Hygiene", "Organisation and hygiene with the rigour of someone who worked in intensive care."],
  ["Responsibility", "Safe techniques that respect the health of your natural nails."],
  ["Care", "A calm, unhurried appointment where you feel well looked after."],
  ["Listening", "Every client is heard: the result respects your style and your needs."],
] : [
  ["Precisão", "Cada detalhe conta: da preparação da unha ao acabamento final."],
  ["Higiene", "Organização e higiene com o rigor de quem trabalhou em cuidados intensivos."],
  ["Responsabilidade", "Técnicas seguras, que respeitam a saúde da tua unha natural."],
  ["Cuidado", "Um atendimento calmo, sem pressa, em que te sentes bem cuidada."],
  ["Escuta", "Cada cliente é ouvida: o resultado respeita o teu estilo e as tuas necessidades."],
];
function buildAbout() {
  const panel = $("#journeyPanel");
  const show = (i) => {
    const j = JOURNEY[i];
    panel.innerHTML = `<div class="journey__content"><span class="journey__icon">${j.icon}</span><div><h3>${j.title}</h3><p>${j.text}</p></div></div>`;
    $$(".journey__tab").forEach((t) => {
      const on = +t.dataset.i === i;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    });
  };
  $(".journey__tabs").addEventListener("click", (e) => {
    const t = e.target.closest(".journey__tab");
    if (t) show(+t.dataset.i);
  });
  show(0);

  const values = $("#values"), tip = $("#valueTip");
  values.innerHTML = VALUES.map(([v], i) => `<button type="button" class="value" data-i="${i}">${v}</button>`).join("");
  const pick = (b) => {
    $$(".value", values).forEach((x) => x.classList.toggle("active", x === b));
    tip.textContent = VALUES[+b.dataset.i][1];
    tip.classList.remove("flash");
    void tip.offsetWidth;
    tip.classList.add("flash");
  };
  values.addEventListener("click", (e) => { const b = e.target.closest(".value"); if (b) pick(b); });
  values.addEventListener("mouseover", (e) => { const b = e.target.closest(".value"); if (b && !b.classList.contains("active")) pick(b); });
}

function rotateWords() {
  const el = $("#rotator");
  const words = L(["bonita", "cuidada", "confiante", "satisfeita"], ["beautiful", "cared for", "confident", "happy"]);
  let i = 0;
  if (reduceMotion) return;
  setInterval(() => {
    el.classList.add("out");
    setTimeout(() => {
      i = (i + 1) % words.length;
      el.textContent = words[i];
      el.classList.remove("out");
    }, 350);
  }, 2200);
}

/* ---------- corações ---------- */
const layer = $("#heartsLayer");
function burst(x, y, n = 8) {
  if (reduceMotion || x == null) return;
  for (let i = 0; i < n; i++) {
    const h = document.createElement("span");
    h.className = "fly-heart";
    h.textContent = "♥";
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const dist = 50 + Math.random() * 70;
    h.style.left = x + "px";
    h.style.top = y + "px";
    h.style.fontSize = 12 + Math.random() * 14 + "px";
    h.style.color = Math.random() > 0.8 ? "#5A2E1E" : Math.random() > 0.5 ? "#E8588A" : "#F7A8C4";
    h.style.setProperty("--x", Math.cos(ang) * dist + "px");
    h.style.setProperty("--y", Math.sin(ang) * dist - 30 + "px");
    h.style.setProperty("--r", (Math.random() * 60 - 30) + "deg");
    layer.appendChild(h);
    h.addEventListener("animationend", () => h.remove());
  }
}
document.addEventListener("click", (e) => {
  if (e.target.closest("input, select, textarea, label, .chip, .swatch, .modal, .onb, .onb-invite, .auth, #sendDesignBtn, #randomBtn, #saveDesignBtn, .quiz__opt")) return;
  burst(e.clientX, e.clientY, 7);
});

let heroVisible = true;
function floatHeart() {
  if (!heroVisible || document.hidden) return;
  const h = document.createElement("span");
  h.className = "float-heart";
  h.textContent = "♥";
  h.style.left = Math.random() * 100 + "vw";
  h.style.fontSize = 10 + Math.random() * 22 + "px";
  h.style.setProperty("--sway", (Math.random() * 120 - 60) + "px");
  h.style.animationDuration = 7 + Math.random() * 6 + "s";
  layer.appendChild(h);
  h.addEventListener("animationend", () => h.remove());
}

/* ---------- logo 3D ---------- */
function logoTilt() {
  const hero = $(".hero"), card = $("#logoCard");
  if (reduceMotion || matchMedia("(hover: none)").matches) return;
  hero.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    card.style.transform = `perspective(900px) rotateY(${(px - 0.5) * 16}deg) rotateX(${(0.5 - py) * 16}deg)`;
    card.style.setProperty("--mx", px * 100 + "%");
    card.style.setProperty("--my", py * 100 + "%");
  });
  hero.addEventListener("mouseleave", () => { card.style.transform = ""; });
}

/* ---------- navegação, scroll e secções vistas ---------- */
function navAndScroll() {
  const nav = $("#nav"), links = $("#navLinks"), toggle = $("#navToggle");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => {
    if (e.target.closest("a")) { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
  });

  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle("scrolled", y > 30);
    $("#progress").style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    $("#toTop").classList.toggle("show", y > innerHeight);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revealObs.unobserve(en.target); } });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el) => revealObs.observe(el));

  const navLinks = $$(".nav__links a:not(.btn)");
  const dwell = {};
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const id = en.target.id;
      if (!en.isIntersecting) { clearTimeout(dwell[id]); return; }
      navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
      // conta a secção (uma vez por visita) só se a pessoa parou nela 1 s,
      // para não contar as secções atravessadas numa rolagem automática
      clearTimeout(dwell[id]);
      dwell[id] = setTimeout(() => {
        Track.once("section_view", { section: id }, "sec:" + id);
        if (id === "estudio") Track.once("view_studio");
      }, 1000);
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("section[id]").forEach((s) => secObs.observe(s));

  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; }).observe($(".hero"));

  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeLogin();
    closeOnboarding();
    const menu = $("#authMenu");
    if (menu) menu.hidden = true;
  });
}

function buildConsent() {
  if (store.get("nails_consent") || !Track.enabled) return;
  $("#consent").hidden = false;
  $("#consentOk").addEventListener("click", () => {
    $("#consent").hidden = true;
    store.set("nails_consent", "1");
  });
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  Track.pageView();
  buildServices();
  buildStudio();
  buildSaved();
  buildAuth();
  buildQuiz();
  buildGallery();
  buildFaq();
  buildAbout();
  rotateWords();
  buildBooking();
  navAndScroll();
  logoTilt();
  buildConsent();
  buildOnboarding();

  $("#year").textContent = new Date().getFullYear();
  [$("#instaLink"), ...$$(".js-insta")].forEach((a) => (a.href = CONFIG.instagram));
  $("#mailLink").href = "mailto:" + CONFIG.email;
  $$(".js-email").forEach((a) => { a.href = "mailto:" + CONFIG.email; a.textContent = CONFIG.email; });
  $$(".js-phone").forEach((a) => { a.href = waUrl(); a.textContent = CONFIG.whatsapp.replace(/^351(\d{3})(\d{3})(\d{3})$/, "+351 $1 $2 $3"); });
  [["#waLink", "rodape"], ["#waFloat", "botao_flutuante"]].forEach(([sel, where]) => {
    const a = $(sel);
    a.href = waUrl(L("Olá, Helen! ♥ Vim pelo site e gostaria de mais informações.", "Hi Helen! ♥ I found you through your website and would like more information."));
    a.addEventListener("click", (e) => {
      Track.track("whatsapp_click", { where });
      if (!whatsappConfigured()) { e.preventDefault(); toast("Número do WhatsApp ainda não configurado (vê js/config.js)."); }
    });
  });

  if (!reduceMotion) setInterval(floatHeart, 900);

  // login e unhas guardadas: o Supabase carrega depois de a página aparecer
  const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  if (document.readyState === "complete") later(() => Backend.init());
  else addEventListener("load", () => later(() => Backend.init()), { once: true });

  // paleta e stock vêm do banco (a Helen edita no painel)
  const [pal, stock] = await Promise.all([Backend.palette(), Backend.stockColors()]);
  palette = pal;
  stockColors = stock;
  $("#colorSwatches").innerHTML = swatchesHtml();
  if (!paletteMatch(state.color)) { state.color = palette[0].hex; $("#customColor").value = state.color; }
  renderStudio(false);
});
