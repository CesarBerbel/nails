/* =========================================================
   Supabase: login com Google, paleta, estoque e unhas guardadas
   ========================================================= */
const Backend = (() => {
  const sb = CONFIG.supabase;
  const client = sb.url && sb.anonKey && window.supabase ? window.supabase.createClient(sb.url, sb.anonKey) : null;
  let user = null;
  let ready = false;
  const listeners = [];

  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
      ready = true;
      if (window.Track) Track.setToken(session?.access_token);
      // o callback do Supabase não pode fazer chamadas ao banco diretamente (deadlock)
      setTimeout(() => listeners.forEach((fn) => fn(user, event)), 0);
    });
  }

  function need() {
    if (!client) throw new Error("Supabase não configurado (veja CONFIG.supabase em js/config.js).");
  }

  return {
    enabled: !!client,
    client,
    get user() { return user; },
    onAuth(fn) {
      listeners.push(fn);
      if (ready) setTimeout(() => fn(user, "INITIAL_SESSION"), 0);
    },

    async signInWithGoogle(redirectTo = location.origin + location.pathname) {
      need();
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) throw error;
    },
    async signOut() {
      need();
      await client.auth.signOut();
    },
    displayName(u = user) {
      const m = u?.user_metadata || {};
      return m.full_name || m.name || u?.email || "";
    },

    async palette() {
      if (!client) return DEFAULT_PALETTE;
      const { data, error } = await client.rpc("get_palette");
      if (error || !data?.length) return DEFAULT_PALETTE;
      return data;
    },
    async stockColors() {
      if (!client) return [];
      const { data, error } = await client.rpc("get_stock_colors");
      return error ? [] : data;
    },

    async listDesigns() {
      need();
      const { data, error } = await client.from("saved_designs").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
    async saveDesign(d) {
      need();
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
      need();
      const { error } = await client.from("saved_designs").update({ name }).eq("id", id);
      if (error) throw error;
    },
    async deleteDesign(id) {
      need();
      const { error } = await client.from("saved_designs").delete().eq("id", id);
      if (error) throw error;
    },
  };
})();
