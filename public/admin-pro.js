const config = window.CREWE_CUT_CONFIG || {};
const themeStorageKey = "crewe-cut-theme-pro";

// Elements
const authPanel = document.getElementById("admin-auth-panel");
const adminApp = document.getElementById("admin-app");
const loginForm = document.getElementById("admin-login-form");
const logoutButton = document.getElementById("logout-button");
const loginButton = document.getElementById("admin-login-button");
const feedback = document.getElementById("admin-feedback");
const dashboardFeedback = document.getElementById("admin-dashboard-feedback");

// Navigation
const navItems = document.querySelectorAll(".nav-item");
const adminSections = document.querySelectorAll("[data-admin-section]");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const sectionLabel = document.getElementById("topbar-section-label");

// Content Areas
const statsGrid = document.getElementById("admin-stats");
const latestBookings = document.getElementById("latest-bookings");
const todayBookings = document.getElementById("today-bookings");
const clientsList = document.getElementById("clients-list");
const bookingsTableBody = document.getElementById("bookings-table-body");
const mobileBookings = document.getElementById("mobile-bookings");
const servicesSettingsList = document.getElementById("services-settings-list");
const gallerySettingsList = document.getElementById("gallery-settings-list");

// State
let supabaseClient = null;
let siteSettings = null;
let allBookings = [];

// --- UTILS ---

function getSupabase() {
    if (supabaseClient) return supabaseClient;
    if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    return supabaseClient;
}

function setFeedback(el, type, msg) {
    if (!el) return;
    el.hidden = false;
    el.className = `form-message ${type}`;
    el.textContent = msg;
    if (type === 'success') setTimeout(() => el.hidden = true, 5000);
}

function formatDay(day) {
    if (!day) return "N/A";
    const date = new Date(day + "T00:00:00");
    return new Intl.DateTimeFormat("en-GB", { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

function formatTime(time) {
    return time ? time.slice(0, 5) : "00:00";
}

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

// --- NAVIGATION ---

function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const target = item.getAttribute("data-admin-target");
            switchSection(target);
            if (window.innerWidth <= 768) closeSidebar();
        });
    });

    sidebarToggle?.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
    });

    mobileMenuBtn?.addEventListener("click", () => {
        sidebar.classList.add("mobile-open");
        sidebarOverlay.classList.add("visible");
    });

    sidebarOverlay?.addEventListener("click", closeSidebar);
}

function closeSidebar() {
    sidebar.classList.remove("mobile-open");
    sidebarOverlay.classList.remove("visible");
}

function switchSection(target) {
    navItems.forEach(i => i.classList.toggle("is-active", i.getAttribute("data-admin-target") === target));
    adminSections.forEach(s => s.classList.toggle("is-active", s.getAttribute("data-admin-section") === target));
    
    // Update breadcrumb
    const activeNav = document.querySelector(`.nav-item[data-admin-target="${target}"] .nav-label`);
    if (activeNav && sectionLabel) sectionLabel.textContent = activeNav.textContent;

    if (target === 'calendar') renderCalendar();
}

// --- DATA LOADING ---

async function loadData() {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        setFeedback(dashboardFeedback, "error", "Could not load bookings.");
        return;
    }

    allBookings = data || [];
    renderDashboard();
    renderBookingsTable();
    renderClients();
}

// --- RENDERING ---

function renderDashboard() {
    const today = getTodayStr();
    const todayList = allBookings.filter(b => b.preferred_day === today);
    const newCount = allBookings.filter(b => b.status === 'new').length;

    // Stats
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon">📋</div>
                <div class="kpi-value">${allBookings.length}</div>
                <div class="kpi-label">Total Requests</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="color: var(--accent)">✨</div>
                <div class="kpi-value">${newCount}</div>
                <div class="kpi-label">New Requests</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="color: var(--green)">📅</div>
                <div class="kpi-value">${todayList.length}</div>
                <div class="kpi-label">Today</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="color: var(--blue)">👤</div>
                <div class="kpi-value">${new Set(allBookings.map(b => b.email)).size}</div>
                <div class="kpi-label">Unique Clients</div>
            </div>
        `;
    }

    renderAnalytics(); // Initialize charts
    renderCalendar();  // Initialize calendar
    
    // New Badge
    const badge = document.getElementById("nav-badge-new");
    if (badge) badge.textContent = newCount > 0 ? newCount : "";

    // Lists
    renderSimpleList(latestBookings, allBookings.slice(0, 5), "No recent requests.");
    renderSimpleList(todayBookings, todayList.slice(0, 5), "No bookings today.");
}

function renderAnalytics() {
    const breakdownEl = document.getElementById("sales-service-breakdown");
    if (!breakdownEl) return;

    const services = {};
    allBookings.forEach(b => {
        services[b.service] = (services[b.service] || 0) + 1;
    });

    const max = Math.max(...Object.values(services), 1);
    breakdownEl.innerHTML = Object.entries(services)
        .sort((a,b) => b[1] - a[1])
        .map(([name, count]) => `
            <div class="service-breakdown-row">
                <div style="min-width: 120px">${name}</div>
                <div class="service-breakdown-bar-wrap">
                    <div class="service-breakdown-bar" style="width: ${(count/max)*100}%"></div>
                </div>
                <div class="service-breakdown-count">${count}</div>
            </div>
        `).join("");
}

function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    if (!grid) return;

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const label = document.getElementById("cal-month-label");
    if (label) label.textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    let html = "";
    // Headers
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
        html += `<div class="cal-day-header">${d}</div>`;
    });

    // Padding
    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day other-month"></div>`;

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayBookings = allBookings.filter(b => b.preferred_day === dateStr);
        const isToday = d === now.getDate() ? "today" : "";
        
        html += `
            <div class="cal-day ${isToday}">
                <div class="cal-day-num">${d}</div>
                ${dayBookings.map(() => `<div class="cal-dot"></div>`).join("")}
                ${dayBookings.length > 0 ? `<div class="cal-count">${dayBookings.length}</div>` : ""}
            </div>
        `;
    }

    grid.innerHTML = html;
}

function renderSimpleList(container, list, emptyMsg) {
    if (!container) return;
    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>${emptyMsg}</p></div>`;
        return;
    }

    container.innerHTML = list.map(b => `
        <div class="overview-item">
            <div>
                <div class="overview-name">${b.client_name}</div>
                <div class="overview-sub">${b.service}</div>
            </div>
            <div class="overview-right">
                <div class="overview-slot">${formatTime(b.preferred_time)}</div>
                <span class="badge badge-${b.status}">${b.status}</span>
            </div>
        </div>
    `).join("");
}

function renderBookingsTable() {
    if (!bookingsTableBody) return;
    
    bookingsTableBody.innerHTML = allBookings.map(b => `
        <tr>
            <td class="td-name">${b.client_name}</td>
            <td>${b.service}</td>
            <td>${formatDay(b.preferred_day)} @ ${formatTime(b.preferred_time)}</td>
            <td>
                <div class="td-sub">${b.phone}</div>
                <div class="td-sub">${b.email}</div>
            </td>
            <td><div class="td-sub">${b.notes || '-'}</div></td>
            <td>
                <select class="status-select" onchange="updateStatus('${b.id}', this.value)">
                    <option value="new" ${b.status === 'new' ? 'selected' : ''}>New</option>
                    <option value="contacted" ${b.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                    <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </td>
        </tr>
    `).join("");
}

async function updateStatus(id, newStatus) {
    const supabase = getSupabase();
    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", id);
    if (error) setFeedback(dashboardFeedback, "error", "Failed to update status.");
    else loadData();
}

function renderClients() {
    if (!clientsList) return;
    const clientsMap = {};
    allBookings.forEach(b => {
        if (!clientsMap[b.email]) {
            clientsMap[b.email] = { name: b.client_name, email: b.email, phone: b.phone, visits: 0 };
        }
        clientsMap[b.email].visits++;
    });

    const list = Object.values(clientsMap);
    clientsList.innerHTML = list.map(c => `
        <div class="client-item">
            <div class="client-avatar">${c.name[0]}</div>
            <div class="client-info">
                <div class="client-name">${c.name}</div>
                <div class="client-contact">${c.email} • ${c.phone}</div>
            </div>
            <div class="client-side">
                <span class="client-visits">${c.visits} Visits</span>
            </div>
        </div>
    `).join("");
}

// --- AUTH ---

async function checkAuth() {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        authPanel.hidden = true;
        adminApp.hidden = false;
        loadData();
    } else {
        authPanel.hidden = false;
        adminApp.hidden = true;
    }
}

loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    const supabase = getSupabase();

    loginButton.disabled = true;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        setFeedback(feedback, "error", "Login failed: " + error.message);
        loginButton.disabled = false;
    } else {
        checkAuth();
    }
});

logoutButton?.addEventListener("click", async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    checkAuth();
});

// --- INIT ---

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    checkAuth();
    
    // Clock
    setInterval(() => {
        const clock = document.getElementById("topbar-clock");
        if (clock) clock.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }, 1000);
});

// Export functions for HTML usage
window.updateStatus = updateStatus;
