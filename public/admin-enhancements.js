(function enhanceAdminPanel() {
  const config = window.CREWE_CUT_CONFIG || {};
  const colors = ["#d4a468", "#90c3ff", "#95e8bf", "#e1dfdf", "#f2b8a0", "#c7a7ff"];
  let supabaseClient = null;
  let bookings = [];
  let settings = { services: [] };

  function getSupabase() {
    if (supabaseClient) {
      return supabaseClient;
    }

    if (!window.supabase?.createClient || !config.supabaseUrl || !config.supabaseAnonKey) {
      return null;
    }

    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    return supabaseClient;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function parsePrice(value) {
    const amount = Number(String(value || "").replace(/[^\d.]/g, ""));
    return Number.isFinite(amount) ? amount : 0;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function setActiveSection(target) {
    document.querySelectorAll("[data-admin-section]").forEach((section) => {
      section.classList.toggle("is-active", section.getAttribute("data-admin-section") === target);
    });

    document.querySelectorAll("[data-admin-target]").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-admin-target") === target);
    });

    const select = document.getElementById("admin-section-select");
    if (select && select.value !== target) {
      select.value = target;
    }

    if (target === "analytics") {
      loadAnalytics();
    }
  }

  function ensureNavigation() {
    const nav = document.querySelector(".admin-nav");
    const actions = document.querySelector(".admin-topbar-actions");
    if (!nav || !actions) {
      return;
    }

    if (!nav.querySelector('[data-admin-target="analytics"]')) {
      const button = document.createElement("button");
      button.className = "admin-nav-button";
      button.type = "button";
      button.dataset.adminTarget = "analytics";
      button.textContent = "Analytics";
      nav.insertBefore(button, nav.children[1] || null);
    }

    if (!document.getElementById("admin-section-select")) {
      const wrap = document.createElement("label");
      wrap.className = "admin-section-select-wrap";
      wrap.innerHTML = `
        Section
        <select id="admin-section-select" aria-label="Admin section">
          <option value="overview">Overview</option>
          <option value="analytics">Analytics</option>
          <option value="requests">Requests</option>
          <option value="clients">Clients</option>
          <option value="services">Services</option>
          <option value="photos">Photos</option>
          <option value="availability">Availability</option>
          <option value="shop">Shop</option>
        </select>
      `;
      actions.insertBefore(wrap, actions.querySelector(".admin-view-site"));
    }

    document.querySelectorAll("[data-admin-target]").forEach((button) => {
      button.addEventListener("click", () => setActiveSection(button.dataset.adminTarget || "overview"));
    });

    document.getElementById("admin-section-select")?.addEventListener("change", (event) => {
      setActiveSection(event.target.value || "overview");
    });
  }

  function ensureAnalyticsSection() {
    if (document.getElementById("admin-section-analytics")) {
      document.getElementById("refresh-analytics-button")?.addEventListener("click", loadAnalytics);
      document.getElementById("sales-service-filter")?.addEventListener("change", renderSales);
      return;
    }

    const overview = document.getElementById("admin-section-overview");
    const section = document.createElement("section");
    section.className = "admin-section";
    section.id = "admin-section-analytics";
    section.dataset.adminSection = "analytics";
    section.innerHTML = `
      <div class="admin-section-head">
        <div>
          <p class="eyebrow">Analytics</p>
          <h2>Bookings and sales</h2>
        </div>
        <button class="button button-secondary" id="refresh-analytics-button" type="button">Refresh</button>
      </div>
      <div class="analytics-grid">
        <div class="admin-panel">
          <div class="admin-panel-head">
            <h3>Booking types</h3>
          </div>
          <div class="chart-card">
            <div class="pie-chart" id="booking-types-chart"><span>0</span></div>
            <div class="chart-legend" id="booking-types-legend"></div>
          </div>
        </div>
        <div class="admin-panel">
          <div class="admin-panel-head">
            <h3>Sales estimate</h3>
          </div>
          <div class="admin-toolbar analytics-toolbar">
            <label>
              View
              <select id="sales-service-filter">
                <option value="all">Total sales</option>
              </select>
            </label>
          </div>
          <div class="sales-summary" id="analytics-sales-summary"></div>
          <div class="analytics-breakdown" id="sales-service-breakdown"></div>
        </div>
      </div>
    `;

    overview?.after(section);
    document.getElementById("refresh-analytics-button")?.addEventListener("click", loadAnalytics);
    document.getElementById("sales-service-filter")?.addEventListener("change", renderSales);
  }

  function getServicePrices() {
    const prices = new Map();
    (settings.services || []).forEach((service) => {
      const name = String(service.name || "").trim();
      if (name) {
        prices.set(name, parsePrice(service.price));
      }
    });
    return prices;
  }

  function groupBookings(source) {
    const prices = getServicePrices();
    const groups = new Map();

    source.forEach((booking) => {
      const service = booking.service || "Unknown service";
      const price = prices.get(service) || 0;
      const group = groups.get(service) || { service, count: 0, activeCount: 0, revenue: 0 };
      group.count += 1;
      group.revenue += price;
      if (["confirmed", "completed"].includes(booking.status)) {
        group.activeCount += 1;
      }
      groups.set(service, group);
    });

    return [...groups.values()].sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  }

  function populateSalesFilter() {
    const filter = document.getElementById("sales-service-filter");
    if (!filter) {
      return;
    }

    const selected = filter.value || "all";
    const services = [...new Set((settings.services || []).map((service) => String(service.name || "").trim()).filter(Boolean))];
    filter.innerHTML = [
      '<option value="all">Total sales</option>',
      ...services.map((service) => `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`)
    ].join("");
    filter.value = services.includes(selected) ? selected : "all";
  }

  function renderBookingTypes() {
    const chart = document.getElementById("booking-types-chart");
    const legend = document.getElementById("booking-types-legend");
    if (!chart || !legend) {
      return;
    }

    let currentBookings = bookings;
    const startInput = document.getElementById("analytics-start");
    const endInput = document.getElementById("analytics-end");
    if (startInput && endInput && startInput.value && endInput.value) {
        const startObj = new Date(startInput.value);
        const endObj = new Date(endInput.value);
        currentBookings = bookings.filter(b => {
            if (!b.preferred_day) return false;
            const d = new Date(b.preferred_day);
            return d >= startObj && d <= endObj;
        });
    }

    const groups = groupBookings(currentBookings).slice(0, 6);
    const total = groups.reduce((sum, group) => sum + group.count, 0);
    if (!total) {
      chart.style.background = "rgba(255, 255, 255, 0.045)";
      chart.innerHTML = "<span>0</span>";
      legend.innerHTML = '<div class="admin-list-empty">No bookings yet.</div>';
      return;
    }

    let cursor = 0;
    const segments = groups.map((group, index) => {
      const start = cursor;
      const end = cursor + (group.count / total) * 100;
      cursor = end;
      return `${colors[index]} ${start}% ${end}%`;
    });

    chart.innerHTML = `<span>${total}</span>`;
    chart.style.background = `conic-gradient(${segments.join(", ")})`;
    legend.innerHTML = groups.map((group, index) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${colors[index]}"></span>
        <strong>${escapeHtml(group.service)}</strong>
        <em>${group.count} booking${group.count === 1 ? "" : "s"}</em>
      </div>
    `).join("");
  }

  function renderSales() {
    const summary = document.getElementById("analytics-sales-summary");
    const breakdown = document.getElementById("sales-service-breakdown");
    const selected = document.getElementById("sales-service-filter")?.value || "all";
    if (!summary || !breakdown) {
      return;
    }

    let currentBookings = bookings;
    const startInput = document.getElementById("analytics-start");
    const endInput = document.getElementById("analytics-end");
    if (startInput && endInput && startInput.value && endInput.value) {
        const startObj = new Date(startInput.value);
        const endObj = new Date(endInput.value);
        currentBookings = bookings.filter(b => {
            if (!b.preferred_day) return false;
            const d = new Date(b.preferred_day);
            return d >= startObj && d <= endObj;
        });
    }

    const filtered = selected === "all" ? currentBookings : currentBookings.filter((booking) => booking.service === selected);
    const groups = groupBookings(filtered);
    const prices = getServicePrices();
    const revenue = groups.reduce((sum, group) => sum + group.revenue, 0);
    const activeRevenue = groups.reduce((sum, group) => sum + (group.activeCount * (prices.get(group.service) || 0)), 0);
    const average = filtered.length ? revenue / filtered.length : 0;
    const maxRevenue = Math.max(...groups.map((group) => group.revenue), 1);

    summary.style.display = "grid";
    summary.style.gridTemplateColumns = "repeat(auto-fit, minmax(130px, 1fr))";
    summary.style.gap = "0.75rem";
    summary.style.marginBottom = "1.5rem";

    summary.innerHTML = `
      <div style="background: var(--surface2, #fdfaf6); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text, #111827);">${formatMoney(revenue)}</div>
        <div style="font-size: 0.75rem; font-weight: 600; color: var(--muted, #6b7280); text-transform: uppercase; letter-spacing: 0.5px;">Estimated Sales</div>
      </div>
      <div style="background: var(--surface2, #fdfaf6); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text, #111827);">${filtered.length}</div>
        <div style="font-size: 0.75rem; font-weight: 600; color: var(--muted, #6b7280); text-transform: uppercase; letter-spacing: 0.5px;">Bookings</div>
      </div>
      <div style="background: var(--surface2, #fdfaf6); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text, #111827);">${formatMoney(activeRevenue)}</div>
        <div style="font-size: 0.75rem; font-weight: 600; color: var(--muted, #6b7280); text-transform: uppercase; letter-spacing: 0.5px;">Confirmed / Completed</div>
      </div>
      <div style="background: var(--surface2, #fdfaf6); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text, #111827);">${formatMoney(average)}</div>
        <div style="font-size: 0.75rem; font-weight: 600; color: var(--muted, #6b7280); text-transform: uppercase; letter-spacing: 0.5px;">Average Service</div>
      </div>
    `;

    if (!groups.length) {
      breakdown.innerHTML = '<div class="admin-list-empty">No sales data for this view.</div>';
      return;
    }

    breakdown.innerHTML = groups.map((group) => `
      <div style="background: var(--surface, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); position: relative; overflow: hidden;">
        
        <!-- Background Progress Bar -->
        <div style="position: absolute; top: 0; left: 0; height: 100%; width: ${(group.revenue / maxRevenue) * 100}%; background: var(--accent, #d4a468); opacity: 0.1; z-index: 0; pointer-events: none;"></div>

        <div style="display: flex; flex-direction: column; z-index: 1;">
          <strong style="font-size: 1rem; color: var(--text, #111827); font-weight: 600;">${escapeHtml(group.service)}</strong>
          <span style="font-size: 0.8rem; color: var(--muted, #6b7280); margin-top: 0.2rem;">${group.count} booking${group.count === 1 ? "" : "s"}</span>
        </div>
        
        <div style="display: flex; flex-direction: column; align-items: flex-end; z-index: 1;">
          <strong style="font-size: 1.1rem; color: var(--text, #111827); font-weight: 700;">${formatMoney(group.revenue)}</strong>
          <span style="font-size: 0.75rem; color: var(--accent, #d4a468); font-weight: 600; margin-top: 0.3rem; background: color-mix(in srgb, var(--accent) 15%, transparent); padding: 0.1rem 0.5rem; border-radius: 4px;">${Math.round((group.revenue/revenue)*100) || 0}% of total</span>
        </div>
      </div>
    `).join("");
  }

  function renderAnalytics() {
    populateSalesFilter();
    renderBookingTypes();
    renderSales();
  }

  async function loadAnalytics() {
    const supabase = getSupabase();
    if (!supabase) {
      return;
    }

    const sessionResult = await supabase.auth.getSession();
    if (!sessionResult.data?.session) {
      return;
    }

    const [settingsResult, bookingsResult] = await Promise.all([
      supabase.from("site_settings").select("settings").eq("key", "main").maybeSingle(),
      supabase.from("bookings").select("*").order("created_at", { ascending: false })
    ]);

    if (settingsResult.data?.settings) {
      settings = settingsResult.data.settings;
    }

    bookings = bookingsResult.data || [];
    renderAnalytics();
  }

  function bindRefreshHooks() {
    document.getElementById("refresh-bookings-button")?.addEventListener("click", () => setTimeout(loadAnalytics, 800));
    document.querySelectorAll(".site-settings-save").forEach((button) => {
      button.addEventListener("click", () => setTimeout(loadAnalytics, 1600));
    });
    document.addEventListener("change", (event) => {
      if (event.target.closest?.(".status-form")) {
        setTimeout(loadAnalytics, 900);
      }
    });

    const presetSelect = document.getElementById("analytics-preset");
    if (presetSelect) {
      presetSelect.addEventListener("change", () => {
        setTimeout(renderAnalytics, 50); // wait for admin-pro to set dates
      });
    }
    const startInput = document.getElementById("analytics-start");
    const endInput = document.getElementById("analytics-end");
    if (startInput) startInput.addEventListener("change", renderAnalytics);
    if (endInput) endInput.addEventListener("change", renderAnalytics);
  }

  ensureNavigation();
  ensureAnalyticsSection();
  bindRefreshHooks();
  setTimeout(loadAnalytics, 900);

  getSupabase()?.auth.onAuthStateChange((_event, session) => {
    if (session) {
      setTimeout(loadAnalytics, 900);
    }
  });
})();
