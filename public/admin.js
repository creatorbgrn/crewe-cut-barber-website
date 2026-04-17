const config = window.CREWE_CUT_CONFIG || {};

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

let supabaseClient = null;

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function renderBookings(bookings) {
  if (!mobileBookings || !tableBody) {
    return;
  }

  if (!bookings.length) {
    mobileBookings.innerHTML = '<div class="mobile-booking-empty">No requests yet.</div>';
    tableBody.innerHTML = '<tr><td colspan="6">No requests yet.</td></tr>';
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

  renderStats(bookings);
  renderOverviewList(latestBookings, bookings.slice(0, 6), "No recent requests.");
  renderOverviewList(
    todayBookings,
    bookings.filter((booking) => normaliseDay(booking.preferred_day) === today).slice(0, 6),
    "No requests scheduled for today."
  );
  renderClients(bookings);
  renderBookings(bookings);
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

loginForm?.addEventListener("submit", handleLogin);
logoutButton?.addEventListener("click", handleLogout);
refreshSessionState();
