const config = window.CREWE_CUT_CONFIG || {};
const themeStorageKey = "crewe-cut-theme";

const authPanel = document.getElementById("admin-auth-panel");
const adminApp = document.getElementById("admin-app");
const loginForm = document.getElementById("admin-login-form");
const logoutButton = document.getElementById("logout-button");
const loginButton = document.getElementById("admin-login-button");
const feedback = document.getElementById("admin-feedback");
const dashboardFeedback = document.getElementById("admin-dashboard-feedback");
const statsGrid = document.getElementById("admin-stats");
const latestBookings = document.getElementById("latest-bookings");
const todayBookings = document.getElementById("today-bookings");
const clientsList = document.getElementById("clients-list");
const mobileBookings = document.getElementById("mobile-bookings");
const tableBody = document.getElementById("bookings-table-body");
const sectionButtons = document.querySelectorAll("[data-admin-target]");
const adminSections = document.querySelectorAll("[data-admin-section]");
const servicesSettingsList = document.getElementById("services-settings-list");
const gallerySettingsList = document.getElementById("gallery-settings-list");
const addServiceButton = document.getElementById("add-service-button");
const addPhotoButton = document.getElementById("add-photo-button");
const settingsSaveButtons = document.querySelectorAll(".site-settings-save");
const refreshBookingsButton = document.getElementById("refresh-bookings-button");
const bookingSearchInput = document.getElementById("booking-search-input");
const bookingStatusFilter = document.getElementById("booking-status-filter");
const maxBookingsInput = document.getElementById("max-bookings-input");
const slotIntervalInput = document.getElementById("slot-interval-input");
const unavailableDatesInput = document.getElementById("unavailable-dates-input");
const unavailableSlotsInput = document.getElementById("unavailable-slots-input");

let supabaseClient = null;
let siteSettings = null;
let allBookings = [];

const defaultServices = [
  { name: "Haircut", duration: "35 min", price: "£15", description: "Standard haircut with a tidy finish.", featured: true, active: true },
  { name: "Skin or Zero Fade", duration: "40 min", price: "£17", description: "Sharp fade with clean detailing.", featured: true, active: true },
  { name: "Scissor Cut", duration: "35 min", price: "£16", description: "Scissor work for shape, length, and texture.", active: true },
  { name: "Kids Haircut (Under 12)", duration: "30 min", price: "£13", description: "Simple haircut for younger clients.", active: true },
  { name: "Kids Skin or Zero Fade", duration: "35 min", price: "£16", description: "Fade service for under 12s.", active: true },
  { name: "All Over", duration: "20 min", price: "£12", description: "Single-length clipper cut.", active: true },
  { name: "Hot Towel Shave", duration: "30 min", price: "£17", description: "Classic shave with hot towel finish.", active: true },
  { name: "Hot Towel Head Shave", duration: "30 min", price: "£17", description: "Close head shave with hot towel.", active: true },
  { name: "Beard Trim and Shape Up", duration: "20 min", price: "£13", description: "Trim, tidy, and shape the beard line.", active: true },
  { name: "Beard Trim", duration: "15 min", price: "£8", description: "Quick beard trim and tidy-up.", active: true },
  { name: "Shape Up", duration: "15 min", price: "£8", description: "Freshen up the hairline and edges.", active: true },
  { name: "Threading", duration: "15 min", price: "£8", description: "Quick tidy-up for extra detail.", active: true },
  { name: "Old Age Pensioner (67+)", duration: "30 min", price: "£13", description: "Reduced-price haircut for over 67s.", active: true },
  { name: "Double Zero", duration: "10 min", price: "£5", description: "Very short clipper cut.", active: true },
  { name: "Nose Wax and Ear Wax", duration: "10 min", price: "£7", description: "Quick grooming add-on.", active: true }
];

const defaultGallery = [
  { title: "Shop front", text: "Crewe Cut Barber on Boswall Parkway.", src: "images/storefront.jpg", fallback: "images/interior-wide.jpg", active: true },
  { title: "Main stations", text: "Main cutting stations inside the shop.", src: "images/interior-wide.jpg", fallback: "images/interior-row.jpg", active: true },
  { title: "Interior", text: "Ready for the day.", src: "images/interior-row.jpg", fallback: "images/interior-wide.jpg", active: true },
  { title: "Chairs", text: "Classic barber chairs and mirror line.", src: "images/chairs.jpg", fallback: "images/interior-row.jpg", active: true },
  { title: "Finished cut", text: "Fresh cut in the chair.", src: "images/cut-detail.jpg", fallback: "images/fade-finish.jpg", active: true },
  { title: "Fade detail", text: "Clean blend and finish.", src: "images/fade-finish.jpg", fallback: "images/cut-detail.jpg", active: true },
  { title: "In the chair", text: "Service in progress.", src: "images/client-chair.jpg", fallback: "images/chairs.jpg", active: true }
];

const defaultSiteSettings = {
  services: defaultServices,
  gallery: defaultGallery,
  maxBookingsPerSlot: 1,
  slotIntervalMinutes: 30,
  unavailableDates: [],
  unavailableSlots: []
};

function hasSupabaseConfig() {
  return Boolean(
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseUrl.includes("YOUR_PROJECT") &&
    !config.supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY")
  );
}

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!hasSupabaseConfig() || !window.supabase?.createClient) {
    return null;
  }

  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  return supabaseClient;
}

function getStoredTheme() {
  const stored = window.localStorage.getItem(themeStorageKey);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return "dark";
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const icon = button.querySelector("[data-theme-icon]");
    const targetTheme = nextTheme === "light" ? "dark" : "light";

    button.setAttribute("aria-label", `Switch to ${targetTheme} theme`);
    button.setAttribute("aria-pressed", String(nextTheme === "dark"));

    if (icon) {
      if (nextTheme === "light") {
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      } else {
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
      }
    }
  });
}

function setupThemeToggle() {
  applyTheme(getStoredTheme());

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
      window.localStorage.setItem(themeStorageKey, nextTheme);
      applyTheme(nextTheme);
    });
  });
}

function setFeedback(element, type, message) {
  if (!element) {
    return;
  }

  element.hidden = false;
  element.className = `form-message ${type}`;
  element.textContent = message;
}

function clearFeedback(element) {
  if (!element) {
    return;
  }

  element.hidden = true;
  element.textContent = "";
  element.className = "form-message";
}

function setSaveButtonsState(isSaving) {
  settingsSaveButtons.forEach((button) => {
    button.disabled = isSaving;
    button.textContent = isSaving ? "Saving..." : "Save changes";
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function normaliseSettings(settings) {
  return {
    ...defaultSiteSettings,
    ...(settings || {}),
    services: Array.isArray(settings?.services) && settings.services.length ? settings.services : defaultServices,
    gallery: Array.isArray(settings?.gallery) && settings.gallery.length ? settings.gallery : defaultGallery,
    unavailableDates: Array.isArray(settings?.unavailableDates) ? settings.unavailableDates : [],
    unavailableSlots: Array.isArray(settings?.unavailableSlots) ? settings.unavailableSlots : []
  };
}

function linesToArray(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderSettingsForms() {
  siteSettings = normaliseSettings(siteSettings || defaultSiteSettings);

  if (servicesSettingsList) {
    servicesSettingsList.innerHTML = siteSettings.services.map((service, index) => `
      <article class="settings-row" data-service-index="${index}">
        <div class="settings-row-head">
          <strong>${escapeHtml(service.name || "Service")}</strong>
          <div class="settings-actions">
            <label class="settings-check"><input type="checkbox" data-field="featured" ${service.featured ? "checked" : ""}> Popular</label>
            <label class="settings-check"><input type="checkbox" data-field="active" ${service.active !== false ? "checked" : ""}> Live</label>
            <button class="mini-button danger" type="button" data-remove-service="${index}">Remove</button>
          </div>
        </div>
        <div class="settings-grid settings-grid-4">
          <label>Service name <input type="text" data-field="name" value="${escapeAttribute(service.name || "")}"></label>
          <label>Duration <input type="text" data-field="duration" value="${escapeAttribute(service.duration || "")}"></label>
          <label>Price <input type="text" data-field="price" value="${escapeAttribute(service.price || "")}"></label>
          <label>Description <input type="text" data-field="description" value="${escapeAttribute(service.description || "")}"></label>
        </div>
      </article>
    `).join("");
  }

  if (gallerySettingsList) {
    gallerySettingsList.innerHTML = siteSettings.gallery.map((photo, index) => `
      <article class="settings-row" data-photo-index="${index}">
        <div class="settings-row-head">
          <strong>${escapeHtml(photo.title || "Photo")}</strong>
          <div class="settings-actions">
            <label class="settings-check"><input type="checkbox" data-field="active" ${photo.active !== false ? "checked" : ""}> Live</label>
            <button class="mini-button danger" type="button" data-remove-photo="${index}">Remove</button>
          </div>
        </div>
        <div class="settings-photo-row">
          <img src="${escapeAttribute(photo.src || "images/interior-wide.jpg")}" alt="${escapeAttribute(photo.title || "Photo preview")}">
          <div class="settings-grid">
            <label>Title <input type="text" data-field="title" value="${escapeAttribute(photo.title || "")}"></label>
            <label>Caption <input type="text" data-field="text" value="${escapeAttribute(photo.text || "")}"></label>
            <label>Image URL <input type="url" data-field="src" value="${escapeAttribute(photo.src || "")}"></label>
            <label>Upload image <input type="file" data-photo-file="${index}" accept="image/jpeg,image/png,image/webp,image/gif"></label>
          </div>
        </div>
      </article>
    `).join("");
  }

  if (maxBookingsInput) {
    maxBookingsInput.value = String(siteSettings.maxBookingsPerSlot || 1);
  }
  if (slotIntervalInput) {
    slotIntervalInput.value = String(siteSettings.slotIntervalMinutes || 30);
  }
  if (unavailableDatesInput) {
    unavailableDatesInput.value = siteSettings.unavailableDates.join("\n");
  }
  if (unavailableSlotsInput) {
    unavailableSlotsInput.value = siteSettings.unavailableSlots.join("\n");
  }
}

function collectSettingsFromForms() {
  const services = [...document.querySelectorAll("[data-service-index]")].map((row) => ({
    name: row.querySelector('[data-field="name"]')?.value.trim() || "Untitled service",
    duration: row.querySelector('[data-field="duration"]')?.value.trim() || "30 min",
    price: row.querySelector('[data-field="price"]')?.value.trim() || "",
    description: row.querySelector('[data-field="description"]')?.value.trim() || "",
    featured: Boolean(row.querySelector('[data-field="featured"]')?.checked),
    active: Boolean(row.querySelector('[data-field="active"]')?.checked)
  }));

  const gallery = [...document.querySelectorAll("[data-photo-index]")].map((row) => ({
    title: row.querySelector('[data-field="title"]')?.value.trim() || "Shop photo",
    text: row.querySelector('[data-field="text"]')?.value.trim() || "",
    src: row.querySelector('[data-field="src"]')?.value.trim() || "",
    fallback: "images/interior-wide.jpg",
    active: Boolean(row.querySelector('[data-field="active"]')?.checked)
  }));

  siteSettings = normaliseSettings({
    services,
    gallery: gallery.slice(0, 15),
    maxBookingsPerSlot: Math.max(1, Number(maxBookingsInput?.value || 1)),
    slotIntervalMinutes: Number(slotIntervalInput?.value || 30),
    unavailableDates: linesToArray(unavailableDatesInput?.value),
    unavailableSlots: linesToArray(unavailableSlotsInput?.value)
  });

  return siteSettings;
}

async function loadSiteSettings() {
  const supabase = getSupabaseClient();
  siteSettings = normaliseSettings(defaultSiteSettings);

  if (!supabase) {
    renderSettingsForms();
    return;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("settings")
    .eq("key", "main")
    .maybeSingle();

  if (!error && data?.settings) {
    siteSettings = normaliseSettings(data.settings);
  }

  renderSettingsForms();
}

async function uploadGalleryPhoto(index, file) {
  const supabase = getSupabaseClient();
  if (!supabase || !file) {
    return null;
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Photo must be 5MB or smaller.");
  }

  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
  const path = `gallery/${Date.now()}-${index}-${safeName}`;
  const { error } = await supabase.storage.from("site-photos").upload(path, file, { upsert: true });

  if (error) {
    throw error;
  }

  return supabase.storage.from("site-photos").getPublicUrl(path).data.publicUrl;
}

async function saveSiteSettings() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    setFeedback(dashboardFeedback, "error", "Supabase is not configured.");
    return;
  }

  clearFeedback(dashboardFeedback);
  setSaveButtonsState(true);

  try {
    collectSettingsFromForms();

    const uploads = [...document.querySelectorAll("[data-photo-file]")];
    for (const input of uploads) {
      const file = input.files?.[0];
      if (!file) {
        continue;
      }
      const index = Number(input.getAttribute("data-photo-file"));
      const url = await uploadGalleryPhoto(index, file);
      if (url && siteSettings.gallery[index]) {
        siteSettings.gallery[index].src = url;
      }
    }

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "main", settings: siteSettings, updated_at: new Date().toISOString() });

    if (error) {
      throw error;
    }

    renderSettingsForms();
    setFeedback(dashboardFeedback, "success", "Website settings saved.");
  } catch (error) {
    console.error(error);
    setFeedback(dashboardFeedback, "error", error.message || "Website settings could not be saved.");
  } finally {
    setSaveButtonsState(false);
  }
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatDay(day) {
  if (!day) {
    return "No day set";
  }

  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return day;
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(date);
}

function formatSlot(day, time) {
  const datePart = formatDay(day);
  const timePart = time ? time.slice(0, 5) : "No time set";
  return `${datePart} at ${timePart}`;
}

function normaliseDay(value) {
  return value || "";
}

function getTodayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - (offset * 60 * 1000));
  return local.toISOString().slice(0, 10);
}

function renderStatusOptions(currentStatus) {
  return ["new", "contacted", "confirmed", "completed"]
    .map((status) => `<option value="${status}" ${status === currentStatus ? "selected" : ""}>${status}</option>`)
    .join("");
}

function setActiveSection(target) {
  adminSections.forEach((section) => {
    section.classList.toggle("is-active", section.getAttribute("data-admin-section") === target);
  });

  sectionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.getAttribute("data-admin-target") === target);
  });
}

function renderStats(bookings) {
  if (!statsGrid) {
    return;
  }

  const today = getTodayString();
  const counts = {
    total: bookings.length,
    new: bookings.filter((booking) => booking.status === "new").length,
    today: bookings.filter((booking) => normaliseDay(booking.preferred_day) === today).length,
    confirmed: bookings.filter((booking) => booking.status === "confirmed").length
  };

  statsGrid.innerHTML = `
    <article class="stat-card">
      <strong>${counts.total}</strong>
      <span>Total requests</span>
    </article>
    <article class="stat-card">
      <strong>${counts.new}</strong>
      <span>New</span>
    </article>
    <article class="stat-card">
      <strong>${counts.today}</strong>
      <span>Due today</span>
    </article>
    <article class="stat-card">
      <strong>${counts.confirmed}</strong>
      <span>Confirmed</span>
    </article>
  `;
}

function renderOverviewList(element, bookings, emptyMessage) {
  if (!element) {
    return;
  }

  if (!bookings.length) {
    element.innerHTML = `<div class="admin-list-empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  element.innerHTML = bookings.map((booking) => `
    <article class="admin-list-item">
      <div>
        <strong>${escapeHtml(booking.client_name)}</strong>
        <span>${escapeHtml(booking.service)}</span>
      </div>
      <div class="admin-list-side">
        <span>${escapeHtml(formatSlot(booking.preferred_day, booking.preferred_time))}</span>
        <span class="status-badge status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span>
      </div>
    </article>
  `).join("");
}

function renderClients(bookings) {
  if (!clientsList) {
    return;
  }

  const clients = new Map();

  bookings.forEach((booking) => {
    const key = `${String(booking.email || "").toLowerCase()}|${String(booking.phone || "")}`;
    const existing = clients.get(key);

    if (existing) {
      existing.visits += 1;
      if (new Date(booking.created_at) > new Date(existing.created_at)) {
        existing.created_at = booking.created_at;
        existing.service = booking.service;
      }
      return;
    }

    clients.set(key, {
      client_name: booking.client_name,
      phone: booking.phone,
      email: booking.email,
      visits: 1,
      created_at: booking.created_at,
      service: booking.service
    });
  });

  const clientItems = [...clients.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (!clientItems.length) {
    clientsList.innerHTML = '<div class="admin-list-empty">No client records yet.</div>';
    return;
  }

  clientsList.innerHTML = clientItems.map((client) => `
    <article class="admin-list-item">
      <div>
        <strong>${escapeHtml(client.client_name)}</strong>
        <span>${escapeHtml(client.service)}</span>
      </div>
      <div class="admin-list-side">
        <span><a href="tel:${escapeHtml(String(client.phone).replace(/\s+/g, ""))}">${escapeHtml(client.phone)}</a></span>
        <span><a href="mailto:${escapeHtml(client.email)}">${escapeHtml(client.email)}</a></span>
        <span>${escapeHtml(String(client.visits))} request${client.visits === 1 ? "" : "s"}</span>
      </div>
    </article>
  `).join("");
}

function getFilteredBookings() {
  const search = String(bookingSearchInput?.value || "").trim().toLowerCase();
  const status = bookingStatusFilter?.value || "all";

  return allBookings.filter((booking) => {
    const matchesStatus = status === "all" || booking.status === status;
    const haystack = [
      booking.client_name,
      booking.service,
      booking.phone,
      booking.email,
      booking.notes,
      booking.preferred_day,
      booking.preferred_time
    ].join(" ").toLowerCase();

    return matchesStatus && (!search || haystack.includes(search));
  });
}

function renderBookings(bookings) {
  if (!mobileBookings || !tableBody) {
    return;
  }

  if (!bookings.length) {
    mobileBookings.innerHTML = '<div class="mobile-booking-empty">No matching requests.</div>';
    tableBody.innerHTML = '<tr><td colspan="6">No matching requests.</td></tr>';
    return;
  }

  mobileBookings.innerHTML = bookings.map((booking) => `
    <article class="mobile-booking-card">
      <div class="mobile-booking-head">
        <div>
          <strong>${escapeHtml(booking.client_name)}</strong>
          <span>${escapeHtml(formatDateTime(booking.created_at))}</span>
        </div>
        <span class="status-badge status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span>
      </div>
      <dl class="mobile-booking-meta">
        <div>
          <dt>Service</dt>
          <dd>${escapeHtml(booking.service)}</dd>
        </div>
        <div>
          <dt>Slot</dt>
          <dd>${escapeHtml(formatSlot(booking.preferred_day, booking.preferred_time))}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd><a href="tel:${escapeHtml(String(booking.phone).replace(/\s+/g, ""))}">${escapeHtml(booking.phone)}</a></dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd><a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a></dd>
        </div>
        <div>
          <dt>Notes</dt>
          <dd>${escapeHtml(booking.notes || "-")}</dd>
        </div>
      </dl>
      <form class="status-form" data-booking-id="${escapeHtml(booking.id)}">
        <label>
          Status
          <select name="status">
            ${renderStatusOptions(booking.status)}
          </select>
        </label>
      </form>
    </article>
  `).join("");

  tableBody.innerHTML = bookings.map((booking) => `
    <tr>
      <td>
        <strong>${escapeHtml(booking.client_name)}</strong>
        <span>${escapeHtml(formatDateTime(booking.created_at))}</span>
      </td>
      <td>${escapeHtml(booking.service)}</td>
      <td>${escapeHtml(formatSlot(booking.preferred_day, booking.preferred_time))}</td>
      <td>
        <a href="tel:${escapeHtml(String(booking.phone).replace(/\s+/g, ""))}">${escapeHtml(booking.phone)}</a><br>
        <a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a>
      </td>
      <td>${escapeHtml(booking.notes || "-")}</td>
      <td>
        <form class="status-form" data-booking-id="${escapeHtml(booking.id)}">
          <span class="status-badge status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span>
          <select name="status">
            ${renderStatusOptions(booking.status)}
          </select>
        </form>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".status-form select").forEach((select) => {
    select.addEventListener("change", async (event) => {
      const form = event.target.closest(".status-form");
      const bookingId = form?.getAttribute("data-booking-id");
      if (!bookingId) {
        return;
      }

      await updateBookingStatus(bookingId, event.target.value);
    });
  });
}

async function ensureAdmin(userId) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return false;
  }

  return Boolean(data?.user_id);
}

async function loadBookings() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  clearFeedback(dashboardFeedback);
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    setFeedback(dashboardFeedback, "error", "Bookings could not be loaded.");
    console.error(error);
    return;
  }

  const bookings = data || [];
  const today = getTodayString();
  allBookings = bookings;

  renderStats(bookings);
  renderOverviewList(latestBookings, bookings.slice(0, 6), "No recent requests.");
  renderOverviewList(
    todayBookings,
    bookings.filter((booking) => normaliseDay(booking.preferred_day) === today).slice(0, 6),
    "No requests scheduled for today."
  );
  renderClients(bookings);
  renderBookings(getFilteredBookings());
}

async function updateBookingStatus(bookingId, status) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  clearFeedback(dashboardFeedback);

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);

  if (error) {
    setFeedback(dashboardFeedback, "error", "Status could not be updated.");
    console.error(error);
    return;
  }

  setFeedback(dashboardFeedback, "success", "Status updated.");
  await loadBookings();
}

function showDashboard() {
  authPanel.hidden = true;
  adminApp.hidden = false;
}

function showLogin() {
  authPanel.hidden = false;
  adminApp.hidden = true;
}

async function refreshSessionState() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    setFeedback(feedback, "error", "Admin login is not configured yet.");
    return;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.user) {
    showLogin();
    return;
  }

  const isAdmin = await ensureAdmin(session.user.id);
  if (!isAdmin) {
    await supabase.auth.signOut();
    showLogin();
    setFeedback(feedback, "error", "This account does not have admin access.");
    return;
  }

  clearFeedback(feedback);
  showDashboard();
  setActiveSection("overview");
  await loadSiteSettings();
  await loadBookings();
}

async function handleLogin(event) {
  event.preventDefault();
  clearFeedback(feedback);

  const supabase = getSupabaseClient();
  if (!supabase) {
    setFeedback(feedback, "error", "Admin login is not configured yet.");
    return;
  }

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    setFeedback(feedback, "error", "Enter your ID and password.");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  loginButton.disabled = false;
  loginButton.textContent = "Log in";

  if (error) {
    setFeedback(feedback, "error", "Login failed.");
    console.error(error);
    return;
  }

  loginForm.reset();
  await refreshSessionState();
}

async function handleLogout() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
  clearFeedback(dashboardFeedback);
  showLogin();
}

sectionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveSection(button.getAttribute("data-admin-target") || "overview");
  });
});

refreshBookingsButton?.addEventListener("click", loadBookings);

[bookingSearchInput, bookingStatusFilter].forEach((input) => {
  input?.addEventListener("input", () => {
    renderBookings(getFilteredBookings());
  });
  input?.addEventListener("change", () => {
    renderBookings(getFilteredBookings());
  });
});

addServiceButton?.addEventListener("click", () => {
  collectSettingsFromForms();
  siteSettings.services.push({
    name: "New service",
    duration: "30 min",
    price: "£0",
    description: "",
    featured: false,
    active: true
  });
  renderSettingsForms();
});

addPhotoButton?.addEventListener("click", () => {
  collectSettingsFromForms();
  if (siteSettings.gallery.length >= 15) {
    setFeedback(dashboardFeedback, "error", "Maximum 15 gallery photos allowed.");
    return;
  }
  siteSettings.gallery.push({
    title: "New photo",
    text: "",
    src: "images/interior-wide.jpg",
    fallback: "images/interior-wide.jpg",
    active: true
  });
  renderSettingsForms();
});

servicesSettingsList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-service]");
  if (!button) {
    return;
  }
  collectSettingsFromForms();
  siteSettings.services.splice(Number(button.getAttribute("data-remove-service")), 1);
  renderSettingsForms();
});

gallerySettingsList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-photo]");
  if (!button) {
    return;
  }
  collectSettingsFromForms();
  siteSettings.gallery.splice(Number(button.getAttribute("data-remove-photo")), 1);
  renderSettingsForms();
});

settingsSaveButtons.forEach((button) => {
  button.addEventListener("click", saveSiteSettings);
});
loginForm?.addEventListener("submit", handleLogin);
logoutButton?.addEventListener("click", handleLogout);
setupThemeToggle();
refreshSessionState();
