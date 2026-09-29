/* =========================================================
   Supabase: login com Google, paleta, estoque e unhas guardadas
   ========================================================= */
const Backend = (() => {
  const sb = CONFIG.supabase;
  const configured = !!(sb.url && sb.anonKey);
  const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  let client = null;
  let initPromise = null;
  let user = null;
  let ready = false;
  const listeners = [];

  function createClient() {
    client = window.supabase.createClient(sb.url, sb.anonKey);
    client.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
      ready = true;
      if (window.Track) Track.setToken(session?.access_token);
      // o callback do Supabase não pode fazer chamadas ao banco diretamente (deadlock)
      setTimeout(() => listeners.forEach((fn) => fn(user, event)), 0);
    });
    return client;
  }

  /** Carrega a biblioteca do Supabase só quando é precisa (a página aparece primeiro). */
  function init() {
    if (!configured) return Promise.resolve(null);
    if (client) return Promise.resolve(client);
    if (window.supabase) return Promise.resolve(createClient());
    initPromise ||= loadScript(SUPABASE_JS).then(createClient).catch((err) => {
      console.error("Não foi possível carregar o Supabase:", err);
      initPromise = null;
      return null;
    });
    return initPromise;
  }

  async function need() {
    const c = await init();
    if (!c) throw new Error("Supabase não configurado (veja CONFIG.supabase em js/config.js).");
    return c;
  }

  /** Chamada simples à API (sem a biblioteca) para dados públicos da página. */
  async function rpc(fn) {
    const res = await fetch(`${sb.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: sb.anonKey, Authorization: `Bearer ${sb.anonKey}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(`${fn}: ${res.status}`);
    return res.json();
  }

  /* ---------- Google One Tap ("Continuar como …") ---------- */
  let oneTapStarted = false;
  let lastLoginMethod = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // o Google recebe o nonce cifrado (SHA-256); o Supabase confirma com o original
  async function makeNonce() {
    const raw = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const hashed = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return { raw, hashed };
  }

  return {
    enabled: configured,
    init,
    get client() { return client; },
    get user() { return user; },
    onAuth(fn) {
      listeners.push(fn);
      if (ready) setTimeout(() => fn(user, "INITIAL_SESSION"), 0);
    },

    async signInWithGoogle(redirectTo = location.origin + location.pathname) {
      const client = await need();
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) throw error;
    },
    /** Mostra o popup "Continuar como …" do Google, se a pessoa tiver sessão no Google e não no site. */
    async oneTap({ context = "signin" } = {}) {
      if (!configured || !CONFIG.googleClientId || user || oneTapStarted || !crypto.subtle) return;
      oneTapStarted = true;
      try {
        const client = await need();
        await loadScript("https://accounts.google.com/gsi/client");
        const nonce = await makeNonce();
        google.accounts.id.initialize({
          client_id: CONFIG.googleClientId,
          nonce: nonce.hashed,
          context,
          use_fedcm_for_prompt: true,
          itp_support: true,
          cancel_on_tap_outside: true,
          callback: async ({ credential }) => {
            lastLoginMethod = "google_onetap";
            const { error } = await client.auth.signInWithIdToken({ provider: "google", token: credential, nonce: nonce.raw });
            if (error) console.error("One Tap:", error);
          },
        });
        google.accounts.id.prompt();
      } catch (err) {
        console.warn("Google One Tap indisponível:", err);
      }
    },
    get lastLoginMethod() { return lastLoginMethod; },
    async signOut() {
      const client = await need();
      // evita que o One Tap volte a entrar sozinho logo a seguir
      window.google?.accounts?.id?.disableAutoSelect();
      await client.auth.signOut();
    },
    displayName(u = user) {
      const m = u?.user_metadata || {};
      return m.full_name || m.name || u?.email || "";
    },

    async palette() {
      if (!configured) return DEFAULT_PALETTE;
      try { const data = await rpc("get_palette"); return data?.length ? data : DEFAULT_PALETTE; }
      catch { return DEFAULT_PALETTE; }
    },
    async stockColors() {
      if (!configured) return [];
      try { return await rpc("get_stock_colors"); } catch { return []; }
    },

    async listDesigns() {
      const client = await need();
      const { data, error } = await client.from("saved_designs").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
    async saveDesign(d) {
      const client = await need();
      const row = {
        name: d.name || null, shape: d.shape, color: d.color, finish: d.finish,
        accent: !!d.accent, skin: d.skin || null, palette_color_id: d.palette_color_id || null,
      };
      const { data, error } = await client.from("saved_designs").insert(row).select().single();
      if (error) {
        if (/LIMIT_5|Limite/.test(error.message + error.hint)) error.limit = true;
        throw error;
      }
      return data;
    },
    async renameDesign(id, name) {
      const client = await need();
      const { error } = await client.from("saved_designs").update({ name }).eq("id", id);
      if (error) throw error;
    },
    async deleteDesign(id) {
      const client = await need();
      const { error } = await client.from("saved_designs").delete().eq("id", id);
      if (error) throw error;
    },
  };
})();
