/* =========================================================
   Rastreamento próprio (grava na tabela "events" do Supabase)
   - visitor_id: fica no navegador (localStorage) → conta visitantes únicos e retornos
   - session_id: renova após 30 min sem atividade → conta visitas
   ========================================================= */
const Track = (() => {
  const sb = CONFIG.supabase;
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* modo privado */ } },
  };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

  const disabled = !sb.url || !sb.anonKey || navigator.webdriver || ls.get("nails_notrack") === "1";

  const returning = !!ls.get("nails_vid");
  const visitorId = ls.get("nails_vid") || uuid();
  ls.set("nails_vid", visitorId);

  let session = null;
  try { session = JSON.parse(ls.get("nails_session")); } catch { session = null; }
  function currentSession() {
    const now = Date.now();
    if (!session || !session.id || now - session.last > SESSION_TIMEOUT) session = { id: uuid(), last: now, once: [] };
    session.last = now;
    ls.set("nails_session", JSON.stringify(session));
    return session;
  }
  currentSession();

  let token = null;
  let queue = [];
  let timer = null;

  function send(batch) {
    fetch(`${sb.url}/rest/v1/events`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: sb.anonKey,
        Authorization: `Bearer ${token || sb.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(batch),
    }).then((r) => {
      // token expirado: reenvia como anônimo para não perder o evento
      if (r.status === 401 && token) { token = null; send(batch); }
    }).catch(() => {});
  }

  function flush() {
    clearTimeout(timer);
    if (!queue.length) return;
    send(queue.splice(0));
  }

  function track(name, props = {}) {
    if (disabled) {
      if (sb.url) return;
      console.debug("[track]", name, props);
      return;
    }
    const s = currentSession();
    queue.push({ session_id: s.id, visitor_id: visitorId, name, props });
    clearTimeout(timer);
    timer = setTimeout(flush, queue.length >= 10 ? 0 : 1500);
  }

  /** Registra o evento só uma vez por visita (ex.: chegou ao estúdio). */
  function once(name, props = {}, key = name) {
    const s = currentSession();
    if (s.once.includes(key)) return;
    s.once.push(key);
    ls.set("nails_session", JSON.stringify(s));
    track(name, props);
  }

  function sourceFromReferrer() {
    if (!document.referrer) return "";
    try {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (host === location.hostname) return "";
      if (/instagram/.test(host)) return "Instagram";
      if (/google\./.test(host)) return "Google";
      if (/facebook|fb\./.test(host)) return "Facebook";
      if (/tiktok/.test(host)) return "TikTok";
      if (/whatsapp|wa\.me/.test(host)) return "WhatsApp";
      if (/pinterest/.test(host)) return "Pinterest";
      return host;
    } catch { return ""; }
  }

  function device() {
    const ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobi/i.test(ua))) return "tablet";
    if (/Mobi|iPhone|Android/i.test(ua)) return "celular";
    return "computador";
  }

  function pageView() {
    const q = new URLSearchParams(location.search);
    track("page_view", {
      path: location.pathname,
      ref: sourceFromReferrer(),
      utm_source: q.get("utm_source") || q.get("src") || "",
      utm_medium: q.get("utm_medium") || "",
      utm_campaign: q.get("utm_campaign") || "",
      device: device(),
      lang: navigator.language,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}`,
      returning,
    });
  }

  addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  addEventListener("pagehide", flush);

  return {
    track, once, pageView, flush,
    setToken(t) { token = t || null; },
    get enabled() { return !disabled; },
    visitorId,
  };
})();
