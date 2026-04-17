const config = window.CREWE_CUT_CONFIG || {};

const authPanel = document.getElementById("admin-auth-panel");
const dashboard = document.getElementById("admin-dashboard");
const statsGrid = document.getElementById("admin-stats");
const loginForm = document.getElementById("admin-login-form");
const logoutButton = document.getElementById("logout-button");
const loginButton = document.getElementById("admin-login-button");
const feedback = document.getElementById("admin-feedback");
const dashboardFeedback = document.getElementById("admin-dashboard-feedback");
const mobileBookings = document.getElementById("mobile-bookings");
const tableBody = document.getElementById("bookings-table-body");

let supabaseClient = null;
let currentSession = null;

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

function formatSlot(day, time) {
  const datePart = day || "No day set";
  const timePart = time ? time.slice(0, 5) : "No time set";
  return `${datePart} at ${timePart}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderStats(bookings) {
  if (!statsGrid) {
    return;
  }

  const counts = {
    total: bookings.length,
    new: bookings.filter((booking) => booking.status === "new").length,
    contacted: bookings.filter((booking) => booking.status === "contacted").length,
    confirmed: bookings.filter((booking) => booking.status === "confirmed").length,
    completed: bookings.filter((booking) => booking.status === "completed").length,
    today: bookings.filter((booking) => {
      const createdAt = new Date(booking.created_at);
      const today = new Date();
      return createdAt.toDateString() === today.toDateString();
    }).length
  };

  statsGrid.hidden = false;
  statsGrid.innerHTML = `
    <article class="stat-card">
      <strong>${counts.total}</strong>
      <span>Total bookings</span>
    </article>
    <article class="stat-card">
      <strong>${counts.new}</strong>
      <span>New requests</span>
    </article>
    <article class="stat-card">
      <strong>${counts.today}</strong>
      <span>Added today</span>
    </article>
    <article class="stat-card">
      <strong>${counts.confirmed}</strong>
      <span>Confirmed</span>
    </article>
    <article class="stat-card">
      <strong>${counts.contacted}</strong>
      <span>Contacted</span>
    </article>
    <article class="stat-card">
      <strong>${counts.completed}</strong>
      <span>Completed</span>
    </article>
  `;
}

function renderBookings(bookings) {
  if (!mobileBookings || !tableBody) {
    return;
  }

  if (!bookings.length) {
    mobileBookings.innerHTML = '<div class="mobile-booking-empty">No bookings yet.</div>';
    tableBody.innerHTML = '<tr><td colspan="6">No bookings yet.</td></tr>';
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
          <dd>${escapeHtml(booking.notes || "No notes provided.")}</dd>
        </div>
      </dl>
      <form class="status-form" data-booking-id="${escapeHtml(booking.id)}">
        <label>
          Update status
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
      <td>${escapeHtml(booking.notes || "No notes provided.")}</td>
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

function renderStatusOptions(currentStatus) {
  return ["new", "contacted", "confirmed", "completed"]
    .map((status) => `<option value="${status}" ${status === currentStatus ? "selected" : ""}>${status}</option>`)
    .join("");
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
    setFeedback(
      dashboardFeedback,
      "error",
      "The dashboard could not load bookings. Check your Supabase table, RLS policies, and admin user setup."
    );
    console.error(error);
    return;
  }

  renderStats(data || []);
  renderBookings(data || []);
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
    setFeedback(dashboardFeedback, "error", "That booking status could not be updated.");
    console.error(error);
    return;
  }

  setFeedback(dashboardFeedback, "success", "Booking status updated.");
  await loadBookings();
}

function showDashboard() {
  authPanel.hidden = true;
  dashboard.hidden = false;
  logoutButton.hidden = false;
}

function showLogin() {
  authPanel.hidden = false;
  dashboard.hidden = true;
  statsGrid.hidden = true;
  logoutButton.hidden = true;
}

async function refreshSessionState() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    setFeedback(
      feedback,
      "error",
      "Supabase is not configured yet. Add your project URL and anon key in public/config.js before deploying."
    );
    return;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  currentSession = session;

  if (!session?.user) {
    showLogin();
    return;
  }

  const isAdmin = await ensureAdmin(session.user.id);
  if (!isAdmin) {
    await supabase.auth.signOut();
    showLogin();
    setFeedback(
      feedback,
      "error",
      "This account can sign in, but it has not been added to the admin_users table yet."
    );
    return;
  }

  clearFeedback(feedback);
  showDashboard();
  await loadBookings();
}

async function handleLogin(event) {
  event.preventDefault();
  clearFeedback(feedback);

  const supabase = getSupabaseClient();
  if (!supabase) {
    setFeedback(
      feedback,
      "error",
      "Supabase is not configured yet. Add your project URL and anon key in public/config.js before deploying."
    );
    return;
  }

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    setFeedback(feedback, "error", "Please fill in both email and password.");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  loginButton.disabled = false;
  loginButton.textContent = "Log in";

  if (error) {
    setFeedback(feedback, "error", "Login failed. Check the email, password, and Supabase Auth setup.");
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
  showLogin();
  clearFeedback(dashboardFeedback);
}

loginForm?.addEventListener("submit", handleLogin);
logoutButton?.addEventListener("click", handleLogout);
refreshSessionState();
