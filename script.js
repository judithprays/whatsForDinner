(() => {
  const config = window.WFD_CONFIG || {};
  const configured = config.supabaseUrl && config.supabaseAnonKey &&
    !config.supabaseUrl.includes("YOUR_") && !config.supabaseAnonKey.includes("YOUR_");
  const client = configured && window.supabase
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null;

  const $ = (id) => document.getElementById(id);
  const state = { user: null, recipes: [], weekOffset: 0, menu: {}, shopping: [], currentView: "week" };
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function message(id, text) { const el = $(id); if (el) el.textContent = text || ""; }
  function notify(text) {
    const el = $("global-message"); el.textContent = text; el.classList.add("visible");
    window.setTimeout(() => el.classList.remove("visible"), 2800);
  }
  function startOfWeek(offset = 0) {
    const date = new Date(); date.setHours(12,0,0,0);
    date.setDate(date.getDate() - date.getDay() + offset * 7);
    return date;
  }
  function dateKey(date) { return date.toISOString().slice(0,10); }
  function prettyDate(date) { return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  function weekLabel(date) {
    const end = new Date(date); end.setDate(end.getDate() + 6);
    return `${prettyDate(date)} – ${prettyDate(end)}`;
  }
  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }
  function ingredientsFor(recipe) {
    return (recipe.ingredients || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }
  function recipeById(id) { return state.recipes.find(r => r.id === id); }

  async function loadRecipes() {
    const { data, error } = await client.from("recipes").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    state.recipes = data || [];
  }
  async function loadMenu() {
    const start = startOfWeek(state.weekOffset), key = dateKey(start);
    const { data, error } = await client.from("weekly_menus").select("*").eq("week_start", key).maybeSingle();
    if (error) throw error;
    state.menu = data?.menu || {};
  }
  async function loadHistory() {
    const { data, error } = await client.from("weekly_menus").select("*").order("week_start", { ascending: false });
    if (error) throw error;
    $("history-list").innerHTML = (data || []).map(row => {
      const count = Object.values(row.menu || {}).filter(Boolean).length;
      return `<article class="history-card"><div><h2>Week of ${escapeHtml(row.week_start)}</h2><p class="muted small-copy">${count} planned dinner${count === 1 ? "" : "s"}</p></div><button class="button secondary small" data-load-week="${escapeHtml(row.week_start)}">View week</button></article>`;
    }).join("") || '<p class="muted">Your saved menus will appear here.</p>';
  }
  async function refresh() {
    try {
      await loadRecipes();
      await loadMenu();
      renderWeek(); renderRecipes(); await buildShopping(false); await loadHistory();
    } catch (error) {
      console.error(error); notify(error.message || "Something went wrong loading your dinners.");
    }
  }
  function showView(view) {
    state.currentView = view;
    ["week", "recipes", "shopping", "history"].forEach(v => {
      $("view-" + v).hidden = v !== view;
      document.querySelector(`[data-view="${v}"]`)?.classList.toggle("active", v === view);
    });
    const titles = { week: ["YOUR PLAN", "This week"], recipes: ["YOUR COLLECTION", "My recipes"], shopping: ["READY, SET, SHOP", "Shopping list"], history: ["LOOKING BACK", "Past menus"] };
    $("page-eyebrow").textContent = titles[view][0]; $("page-title").textContent = titles[view][1];
    if (view === "shopping") buildShopping(false);
  }
  function renderWeek() {
    const start = startOfWeek(state.weekOffset);
    $("week-range").textContent = weekLabel(start);
    $("week-grid").innerHTML = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start); date.setDate(date.getDate() + i);
      const key = dateKey(date);
      const options = ['<option value="">Choose a dinner</option>', ...state.recipes.map(r =>
        `<option value="${escapeHtml(r.id)}" ${state.menu[key] === r.id ? "selected" : ""}>${escapeHtml(r.name)}</option>`)];
      const selected = recipeById(state.menu[key]);
      return `<article class="day-card"><div class="day-name">${dayNames[date.getDay()]}</div><div class="day-date">${prettyDate(date)}</div><select aria-label="Dinner for ${dayNames[date.getDay()]}" data-day="${key}">${options.join("")}</select>${selected ? `<div class="day-meal">${escapeHtml(selected.name)}</div>` : ""}</article>`;
    }).join("");
    $("week-grid").querySelectorAll("select").forEach(sel => sel.addEventListener("change", () => {
      if (sel.value) state.menu[sel.dataset.day] = sel.value; else delete state.menu[sel.dataset.day];
      renderWeek();
    }));
  }
  async function saveMenu() {
    const weekStart = dateKey(startOfWeek(state.weekOffset));
    const { error } = await client.from("weekly_menus").upsert({
      user_id: state.user.id, week_start: weekStart, menu: state.menu, updated_at: new Date().toISOString()
    }, { onConflict: "user_id,week_start" });
    if (error) throw error;
    message("week-message", "Menu saved."); await loadHistory();
  }
  function renderRecipes() {
    const search = ($("recipe-search").value || "").toLowerCase();
    const filter = $("recipe-filter").value;
    const recipes = state.recipes.filter(r => {
      const matchesSearch = `${r.name} ${r.ingredients || ""}`.toLowerCase().includes(search);
      const matchesFilter = filter === "all" || (filter === "try" ? r.is_to_try : !r.is_to_try);
      return matchesSearch && matchesFilter;
    });
    $("recipe-list").innerHTML = recipes.map(r => `<article class="recipe-card">
      ${r.photo_url ? `<img src="${escapeHtml(r.photo_url)}" alt="" loading="lazy">` : ""}
      <div class="recipe-card-body">${r.is_to_try ? '<span class="tag">RECIPE TO TRY</span>' : ""}
        <h2>${escapeHtml(r.name)}</h2>
        <p class="recipe-meta">${r.cook_minutes ? `${r.cook_minutes} min` : "Time not set"}${r.cost_rating ? ` · Cost ${r.cost_rating}/5` : ""}${r.deliciousness_rating ? ` · Deliciousness ${r.deliciousness_rating}/5` : ""}</p>
        <p class="small-copy">${ingredientsFor(r).slice(0,4).map(escapeHtml).join(" · ")}</p>
        <div class="button-row"><button class="button secondary small" data-edit-recipe="${escapeHtml(r.id)}">Edit</button><button class="button secondary small" data-delete-recipe="${escapeHtml(r.id)}">Delete</button></div>
      </div></article>`).join("") || '<p class="muted">No dinners yet. Add one you love or a recipe you want to try.</p>';
  }
  function clearRecipeForm() {
    $("recipe-form").reset(); $("recipe-id").value = ""; $("recipe-form").hidden = true;
  }
  function fillRecipeForm(r) {
    $("recipe-id").value = r?.id || ""; $("recipe-name").value = r?.name || "";
    $("recipe-photo").value = r?.photo_url || ""; $("recipe-time").value = r?.cook_minutes ?? "";
    $("recipe-cost").value = r?.cost_rating ?? ""; $("recipe-health").value = r?.healthfulness_rating ?? "";
    $("recipe-delicious").value = r?.deliciousness_rating ?? ""; $("recipe-ingredients").value = r?.ingredients || "";
    $("recipe-instructions").value = r?.instructions || ""; $("recipe-to-try").checked = !!r?.is_to_try;
    $("recipe-form").hidden = false; $("recipe-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function saveRecipe(event) {
    event.preventDefault();
    const id = $("recipe-id").value;
    const payload = {
      user_id: state.user.id, name: $("recipe-name").value.trim(),
      photo_url: $("recipe-photo").value.trim() || null,
      cook_minutes: $("recipe-time").value ? Number($("recipe-time").value) : null,
      cost_rating: $("recipe-cost").value ? Number($("recipe-cost").value) : null,
      healthfulness_rating: $("recipe-health").value ? Number($("recipe-health").value) : null,
      deliciousness_rating: $("recipe-delicious").value ? Number($("recipe-delicious").value) : null,
      ingredients: $("recipe-ingredients").value.trim(),
      instructions: $("recipe-instructions").value.trim(), is_to_try: $("recipe-to-try").checked,
      updated_at: new Date().toISOString()
    };
    const query = id ? client.from("recipes").update(payload).eq("id", id).eq("user_id", state.user.id) : client.from("recipes").insert(payload);
    const { error } = await query;
    if (error) { message("recipe-message", error.message); return; }
    clearRecipeForm(); await loadRecipes(); renderRecipes(); renderWeek(); notify("Dinner saved.");
  }
  async function deleteRecipe(id) {
    if (!window.confirm("Delete this dinner from your recipe collection?")) return;
    const { error } = await client.from("recipes").delete().eq("id", id).eq("user_id", state.user.id);
    if (error) return notify(error.message);
    Object.keys(state.menu).forEach(day => { if (state.menu[day] === id) delete state.menu[day]; });
    await loadRecipes(); renderRecipes(); renderWeek(); notify("Dinner deleted. Save your menu if you want to keep that change.");
  }
  async function buildShopping(showMessage = true) {
    const combined = new Map();
    Object.values(state.menu).filter(Boolean).forEach(id => {
      const r = recipeById(id); if (!r) return;
      ingredientsFor(r).forEach(item => {
        const key = item.toLocaleLowerCase();
        if (!combined.has(key)) combined.set(key, { label: item, sources: new Set() });
        combined.get(key).sources.add(r.name);
      });
    });
    state.shopping = Array.from(combined.values()).map((item, i) => ({
      id: i, label: item.label, sources: Array.from(item.sources).join(", "), checked: state.shopping.find(old => old.label.toLowerCase() === item.label.toLowerCase())?.checked || false
    })).sort((a,b) => a.label.localeCompare(b.label));
    $("shopping-list").innerHTML = state.shopping.length ? `<div class="shopping-group"><h2>Ingredients</h2>${state.shopping.map(item => `<label class="shopping-item ${item.checked ? "checked" : ""}"><input type="checkbox" data-shopping="${item.id}" ${item.checked ? "checked" : ""}><span>${escapeHtml(item.label)}<small class="muted">${item.sources ? ` — ${escapeHtml(item.sources)}` : ""}</small></span></label>`).join("")}</div>` : '<p class="muted">Choose dinners in This week to build your shopping list.</p>';
    $("shopping-list").querySelectorAll("[data-shopping]").forEach(box => box.addEventListener("change", () => {
      const item = state.shopping.find(x => x.id === Number(box.dataset.shopping));
      if (item) item.checked = box.checked;
      box.closest(".shopping-item").classList.toggle("checked", box.checked);
    }));
    if (showMessage) message("shopping-message", "Shopping list updated from this week's menu.");
  }
  async function onAuthSubmit(event, signUp) {
    event.preventDefault();
    if (!client) return message("auth-message", "Add your Supabase URL and publishable key to config.js first.");
    const email = $("auth-email").value.trim(), password = $("auth-password").value;
    const result = signUp ? await client.auth.signUp({ email, password }) : await client.auth.signInWithPassword({ email, password });
    if (result.error) return message("auth-message", result.error.message);
    if (signUp && !result.data.session) return message("auth-message", "Account created. Check your email to confirm it, then sign in.");
    message("auth-message", signUp ? "Account created." : "");
  }
  async function renderAuth(session) {
    state.user = session?.user || null;
    const signedIn = !!state.user;
    $("auth-view").hidden = signedIn; $("app-view").hidden = !signedIn;
    $("top-nav").hidden = !signedIn; $("sign-out").hidden = !signedIn;
    $("user-label").textContent = signedIn ? state.user.email : "";
    if (signedIn) { await refresh(); showView(state.currentView); }
  }

  $("auth-form").addEventListener("submit", e => onAuthSubmit(e, false));
  $("sign-up-button").addEventListener("click", e => onAuthSubmit(e, true));
  $("sign-out").addEventListener("click", async () => { if (client) await client.auth.signOut(); });
  document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
  $("previous-week").addEventListener("click", async () => { state.weekOffset--; await loadMenu(); renderWeek(); $("week-range").textContent = weekLabel(startOfWeek(state.weekOffset)); });
  $("next-week").addEventListener("click", async () => { state.weekOffset++; await loadMenu(); renderWeek(); $("week-range").textContent = weekLabel(startOfWeek(state.weekOffset)); });
  $("save-menu").addEventListener("click", async () => { try { await saveMenu(); notify("Menu saved."); } catch (e) { message("week-message", e.message); } });
  $("make-shopping-list").addEventListener("click", () => { showView("shopping"); buildShopping(); });
  $("show-recipe-form").addEventListener("click", () => fillRecipeForm(null));
  $("cancel-recipe").addEventListener("click", clearRecipeForm);
  $("recipe-form").addEventListener("submit", saveRecipe);
  $("recipe-search").addEventListener("input", renderRecipes);
  $("recipe-filter").addEventListener("change", renderRecipes);
  $("recipe-list").addEventListener("click", e => {
    const edit = e.target.closest("[data-edit-recipe]"), del = e.target.closest("[data-delete-recipe]");
    if (edit) fillRecipeForm(recipeById(edit.dataset.editRecipe));
    if (del) deleteRecipe(del.dataset.deleteRecipe);
  });
  $("refresh-shopping").addEventListener("click", () => buildShopping());
  $("print-shopping").addEventListener("click", () => window.print());
  $("history-list").addEventListener("click", async e => {
    const btn = e.target.closest("[data-load-week]"); if (!btn) return;
    const target = new Date(`${btn.dataset.loadWeek}T12:00:00`);
    const current = startOfWeek(0);
    state.weekOffset = Math.round((target - current) / (7 * 24 * 60 * 60 * 1000));
    await loadMenu(); renderWeek(); showView("week");
  });

  if (!client) {
    message("auth-message", "First, connect Supabase: add your project URL and publishable key in config.js.");
  } else {
    client.auth.getSession().then(({ data }) => renderAuth(data.session));
    client.auth.onAuthStateChange((_event, session) => { renderAuth(session); });
  }
})();
