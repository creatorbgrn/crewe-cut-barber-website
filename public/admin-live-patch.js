(function () {
  if (window.__CREWE_CUT_ADMIN_LIVE_PATCH__) {
    return;
  }
  window.__CREWE_CUT_ADMIN_LIVE_PATCH__ = true;

  const config = window.CREWE_CUT_CONFIG || {};
  const adminBookingMarker = "[ADMIN_BOOKED]";
  const schedule = [
    { days: [1, 2, 3, 4, 5, 6], open: { hour: 9, minute: 0 }, close: { hour: 19, minute: 0 } },
    { days: [0], open: { hour: 10, minute: 0 }, close: { hour: 18, minute: 0 } }
  ];

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
    { title: "Interior", text: "Ready for the day.", src: "images/interior-row.jpg", fallback: "images/interior-wide.jpg", active: true }
  ];

  const defaultSiteSettings = {
    services: defaultServices,
    gallery: defaultGallery,
    maxBookingsPerSlot: 1,
    slotIntervalMinutes: 30,
    unavailableDates: [],
    unavailableSlots: [],
    blockedServiceSlots: []
  };

  const els = {
    dashboardFeedback: document.getElementById("admin-dashboard-feedback"),
    adminBookingForm: document.getElementById("admin-booking-form"),
    adminBookingFeedback: document.getElementById("admin-booking-feedback"),
    adminBookingService: document.getElementById("admin-booking-service"),
    adminBookingDay: document.getElementById("admin-booking-day"),
    adminBookingTime: document.getElementById("admin-booking-time"),
    adminBookingSubmit: document.getElementById("admin-booking-submit"),
    servicesSettingsList: document.getElementById("services-settings-list"),
    gallerySettingsList: document.getElementById("gallery-settings-list"),
    serviceBlocksList: document.getElementById("service-blocks-list"),
    addServiceButton: document.getElementById("add-service-button"),
    addPhotoButton: document.getElementById("add-photo-button"),
    addServiceBlockButton: document.getElementById("add-service-block-button"),
    saveButtons: [...document.querySelectorAll(".site-settings-save")],
    maxBookingsInput: document.getElementById("max-bookings-input"),
    slotIntervalInput: document.getElementById("slot-interval-input"),
    unavailableDatesInput: document.getElementById("unavailable-dates-input"),
    unavailableSlotsInput: document.getElementById("unavailable-slots-input"),
    availabilitySummaryCapacity: document.getElementById("availability-summary-capacity"),
    availabilitySummaryInterval: document.getElementById("availability-summary-interval"),
    availabilitySummaryBlocks: document.getElementById("availability-summary-blocks"),
    availabilitySummarySlots: document.getElementById("availability-summary-slots"),
    refreshBookingsButton: document.getElementById("refresh-bookings-button")
  };

  let supabaseClient = null;
  let siteSettings = normaliseSettings(defaultSiteSettings);
  let bindingsReady = false;
  let sessionReady = false;

  function hasConfig() {
    return Boolean(
      config.supabaseUrl &&
      config.supabaseAnonKey &&
      !String(config.supabaseUrl).includes("YOUR_PROJECT") &&
      !String(config.supabaseAnonKey).includes("YOUR_SUPABASE_ANON_KEY")
    );
  }

  function getSupabaseClient() {
    if (supabaseClient) {
      return supabaseClient;
    }
    if (!hasConfig() || !window.supabase?.createClient) {
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

  function escapeAttribute(value) {
    return escapeHtml(value);
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
    element.className = "form-message";
    element.textContent = "";
  }

  function setSaveButtonsState(isSaving) {
    els.saveButtons.forEach((button) => {
      button.disabled = isSaving;
      button.textContent = isSaving ? "Saving..." : "Save changes";
    });
  }

  function linesToArray(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function getTodayString() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - (offset * 60 * 1000));
    return local.toISOString().slice(0, 10);
  }

  function timeToMinutes(value) {
    const parts = String(value || "").split(":");
    if (parts.length < 2) {
      return NaN;
    }
    return (Number(parts[0]) * 60) + Number(parts[1]);
  }

  function formatTimeLabel(value) {
    if (!value) {
      return "";
    }
    const [hour, minute] = String(value).split(":");
    const date = new Date();
    date.setHours(Number(hour), Number(minute), 0, 0);
    return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" }).format(date);
  }

  function getScheduleForDay(dayIndex) {
    return schedule.find((entry) => entry.days.includes(dayIndex)) || null;
  }

  function minutesOf(dayConfig, type) {
    return (dayConfig[type].hour * 60) + dayConfig[type].minute;
  }

  function makeBlockId() {
    return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normaliseServiceBlock(block) {
    return {
      id: String(block?.id || makeBlockId()),
      service: String(block?.service || ""),
      day: String(block?.day || ""),
      startTime: String(block?.startTime || ""),
      endTime: String(block?.endTime || block?.startTime || ""),
      note: String(block?.note || ""),
      active: block?.active !== false
    };
  }

  function normaliseSettings(settings) {
    const nextSettings = settings || {};
    return {
      ...defaultSiteSettings,
      ...nextSettings,
      services: Array.isArray(nextSettings.services) && nextSettings.services.length ? nextSettings.services : defaultServices,
      gallery: Array.isArray(nextSettings.gallery) && nextSettings.gallery.length ? nextSettings.gallery : defaultGallery,
      unavailableDates: Array.isArray(nextSettings.unavailableDates) ? nextSettings.unavailableDates : [],
      unavailableSlots: Array.isArray(nextSettings.unavailableSlots) ? nextSettings.unavailableSlots : [],
      blockedServiceSlots: Array.isArray(nextSettings.blockedServiceSlots)
        ? nextSettings.blockedServiceSlots.map(normaliseServiceBlock)
        : []
    };
  }

  function getActiveServices() {
    return (siteSettings.services || []).filter((service) => service.active !== false && service.name);
  }

  function getServiceOptionsMarkup(selectedValue, includeBlank) {
    const first = includeBlank ? '<option value="">Select a service</option>' : "";
    const options = getActiveServices().map((service) => (
      `<option value="${escapeAttribute(service.name)}" ${service.name === selectedValue ? "selected" : ""}>${escapeHtml(service.name)}</option>`
    ));
    return first + options.join("");
  }

  function getTimesForDate(day, intervalMinutes) {
    if (!day) {
      return [];
    }
    const parts = String(day).split("-");
    if (parts.length !== 3) {
      return [];
    }
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (Number.isNaN(date.getTime())) {
      return [];
    }
    const daySchedule = getScheduleForDay(date.getDay());
    if (!daySchedule) {
      return [];
    }
    const openMins = minutesOf(daySchedule, "open");
    const closeMins = minutesOf(daySchedule, "close");
    const times = [];
    for (let mins = openMins; mins <= closeMins - intervalMinutes; mins += intervalMinutes) {
      const hour = String(Math.floor(mins / 60)).padStart(2, "0");
      const minute = String(mins % 60).padStart(2, "0");
      times.push(`${hour}:${minute}`);
    }
    return times;
  }

  function isSlotUnavailable(day, time) {
    const slot = day && time ? `${day} ${time}` : "";
    return siteSettings.unavailableDates.includes(day) || siteSettings.unavailableSlots.includes(slot);
  }

  function isServiceBlocked(serviceName, day, time) {
    if (!serviceName || !day || !time) {
      return false;
    }
    const slotMinutes = timeToMinutes(time);
    return siteSettings.blockedServiceSlots.some((block) => {
      if (!block.active || block.service !== serviceName || block.day !== day) {
        return false;
      }
      const start = timeToMinutes(block.startTime);
      const end = timeToMinutes(block.endTime || block.startTime);
      if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(slotMinutes)) {
        return false;
      }
      const safeEnd = end <= start ? start + (Number(siteSettings.slotIntervalMinutes) || 30) : end;
      return slotMinutes >= start && slotMinutes < safeEnd;
    });
  }

  function renderSettingsSummary() {
    if (els.availabilitySummaryCapacity) {
      const count = Number(siteSettings.maxBookingsPerSlot || 1);
      els.availabilitySummaryCapacity.textContent = `${count} client${count === 1 ? "" : "s"}`;
    }
    if (els.availabilitySummaryInterval) {
      els.availabilitySummaryInterval.textContent = `${Number(siteSettings.slotIntervalMinutes || 30)} minutes`;
    }
    if (els.availabilitySummaryBlocks) {
      const activeBlocks = siteSettings.blockedServiceSlots.filter((block) => block.active).length;
      els.availabilitySummaryBlocks.textContent = `${activeBlocks} active`;
    }
    if (els.availabilitySummarySlots) {
      els.availabilitySummarySlots.textContent = `${siteSettings.unavailableDates.length + siteSettings.unavailableSlots.length} set`;
    }
  }

  function renderAdminBookingTimeOptions() {
    if (!els.adminBookingTime) {
      return;
    }
    const selected = els.adminBookingTime.value;
    const service = els.adminBookingService?.value || "";
    const day = els.adminBookingDay?.value || "";
    const times = service && day
      ? getTimesForDate(day, Number(siteSettings.slotIntervalMinutes) || 30).filter((time) => (
          !isSlotUnavailable(day, time) && !isServiceBlocked(service, day, time)
        ))
      : [];
    els.adminBookingTime.innerHTML = '<option value="">Select a time</option>' + times
      .map((time) => `<option value="${time}">${formatTimeLabel(time)}</option>`)
      .join("");
    if (selected && times.includes(selected)) {
      els.adminBookingTime.value = selected;
    }
  }

  function renderServiceBlocks() {
    if (!els.serviceBlocksList) {
      return;
    }
    const blocks = siteSettings.blockedServiceSlots || [];
    if (!blocks.length) {
      els.serviceBlocksList.innerHTML = '<div class="empty-state"><p>No service blocks yet.</p></div>';
      return;
    }
    els.serviceBlocksList.innerHTML = blocks.map((block, index) => `
      <article class="settings-row service-block-row" data-service-block-index="${index}" data-service-block-id="${escapeAttribute(block.id)}">
        <div class="settings-row-head">
          <strong class="settings-row-title">${escapeHtml(block.service || "Service block")}</strong>
          <div class="settings-actions">
            <label class="settings-check"><input type="checkbox" data-field="active" ${block.active ? "checked" : ""}> Active</label>
            <button class="btn-danger" type="button" data-remove-service-block="${index}">Remove</button>
          </div>
        </div>
        <div class="settings-grid settings-grid-5">
          <label class="settings-field">
            <span class="settings-field-label">Service</span>
            <select class="settings-input" data-field="service">${getServiceOptionsMarkup(block.service, false)}</select>
          </label>
          <label class="settings-field">
            <span class="settings-field-label">Date</span>
            <input class="settings-input" type="date" data-field="day" value="${escapeAttribute(block.day)}">
          </label>
          <label class="settings-field">
            <span class="settings-field-label">Start</span>
            <input class="settings-input" type="time" data-field="startTime" value="${escapeAttribute(block.startTime)}">
          </label>
          <label class="settings-field">
            <span class="settings-field-label">End</span>
            <input class="settings-input" type="time" data-field="endTime" value="${escapeAttribute(block.endTime)}">
          </label>
          <label class="settings-field">
            <span class="settings-field-label">Note</span>
            <input class="settings-input" type="text" data-field="note" value="${escapeAttribute(block.note)}" placeholder="Optional reason">
          </label>
        </div>
      </article>
    `).join("");
  }

  function renderSettingsForms() {
    siteSettings = normaliseSettings(siteSettings);

    if (els.servicesSettingsList) {
      els.servicesSettingsList.innerHTML = siteSettings.services.map((service, index) => `
        <article class="settings-row" data-service-index="${index}">
          <div class="settings-row-head">
            <strong class="settings-row-title">${escapeHtml(service.name || "Service")}</strong>
            <div class="settings-actions">
              <label class="settings-check"><input type="checkbox" data-field="featured" ${service.featured ? "checked" : ""}> Popular</label>
              <label class="settings-check"><input type="checkbox" data-field="active" ${service.active !== false ? "checked" : ""}> Live</label>
              <button class="btn-danger" type="button" data-remove-service="${index}">Remove</button>
            </div>
          </div>
          <div class="settings-grid settings-grid-4">
            <label class="settings-field"><span class="settings-field-label">Service name</span><input class="settings-input" type="text" data-field="name" value="${escapeAttribute(service.name || "")}"></label>
            <label class="settings-field"><span class="settings-field-label">Duration</span><input class="settings-input" type="text" data-field="duration" value="${escapeAttribute(service.duration || "")}"></label>
            <label class="settings-field"><span class="settings-field-label">Price</span><input class="settings-input" type="text" data-field="price" value="${escapeAttribute(service.price || "")}"></label>
            <label class="settings-field"><span class="settings-field-label">Description</span><input class="settings-input" type="text" data-field="description" value="${escapeAttribute(service.description || "")}"></label>
          </div>
        </article>
      `).join("");
    }

    if (els.gallerySettingsList) {
      els.gallerySettingsList.innerHTML = siteSettings.gallery.map((photo, index) => `
        <article class="settings-row" data-photo-index="${index}">
          <div class="settings-row-head">
            <strong class="settings-row-title">${escapeHtml(photo.title || "Photo")}</strong>
            <div class="settings-actions">
              <label class="settings-check"><input type="checkbox" data-field="active" ${photo.active !== false ? "checked" : ""}> Live</label>
              <button class="btn-danger" type="button" data-remove-photo="${index}">Remove</button>
            </div>
          </div>
          <div class="photo-row">
            <img class="photo-preview" src="${escapeAttribute(photo.src || "images/interior-wide.jpg")}" alt="${escapeAttribute(photo.title || "Photo preview")}">
            <div class="photo-fields">
              <div class="settings-grid settings-grid-2">
                <label class="settings-field"><span class="settings-field-label">Title</span><input class="settings-input" type="text" data-field="title" value="${escapeAttribute(photo.title || "")}"></label>
                <label class="settings-field"><span class="settings-field-label">Caption</span><input class="settings-input" type="text" data-field="text" value="${escapeAttribute(photo.text || "")}"></label>
              </div>
              <div class="settings-grid settings-grid-2">
                <label class="settings-field"><span class="settings-field-label">Image URL</span><input class="settings-input" type="url" data-field="src" value="${escapeAttribute(photo.src || "")}"></label>
                <label class="settings-field"><span class="settings-field-label">Upload image</span><input class="settings-input" type="file" data-photo-file="${index}" accept="image/jpeg,image/png,image/webp,image/gif"></label>
              </div>
            </div>
          </div>
        </article>
      `).join("");
    }

    if (els.maxBookingsInput) {
      els.maxBookingsInput.value = String(siteSettings.maxBookingsPerSlot || 1);
    }
    if (els.slotIntervalInput) {
      els.slotIntervalInput.value = String(siteSettings.slotIntervalMinutes || 30);
    }
    if (els.unavailableDatesInput) {
      els.unavailableDatesInput.value = siteSettings.unavailableDates.join("\n");
    }
    if (els.unavailableSlotsInput) {
      els.unavailableSlotsInput.value = siteSettings.unavailableSlots.join("\n");
    }

    renderServiceBlocks();
    renderSettingsSummary();

    if (els.adminBookingService) {
      const selected = els.adminBookingService.value;
      els.adminBookingService.innerHTML = getServiceOptionsMarkup(selected, true);
      if (selected && !getActiveServices().some((service) => service.name === selected)) {
        els.adminBookingService.value = "";
      }
    }

    renderAdminBookingTimeOptions();
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

    const blockedServiceSlots = [...document.querySelectorAll("[data-service-block-index]")].map((row) => normaliseServiceBlock({
      id: row.getAttribute("data-service-block-id"),
      service: row.querySelector('[data-field="service"]')?.value.trim() || "",
      day: row.querySelector('[data-field="day"]')?.value || "",
      startTime: row.querySelector('[data-field="startTime"]')?.value || "",
      endTime: row.querySelector('[data-field="endTime"]')?.value || "",
      note: row.querySelector('[data-field="note"]')?.value.trim() || "",
      active: Boolean(row.querySelector('[data-field="active"]')?.checked)
    })).filter((block) => block.service && block.day && block.startTime);

    siteSettings = normaliseSettings({
      services,
      gallery: gallery.slice(0, 15),
      maxBookingsPerSlot: Math.max(1, Number(els.maxBookingsInput?.value || 1)),
      slotIntervalMinutes: Math.max(15, Number(els.slotIntervalInput?.value || 30)),
      unavailableDates: linesToArray(els.unavailableDatesInput?.value),
      unavailableSlots: linesToArray(els.unavailableSlotsInput?.value),
      blockedServiceSlots
    });

    return siteSettings;
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

  async function loadSiteSettings() {
    const supabase = getSupabaseClient();
    siteSettings = normaliseSettings(defaultSiteSettings);
    if (!supabase) {
      renderSettingsForms();
      return;
    }
    const { data } = await supabase
      .from("site_settings")
      .select("settings")
      .eq("key", "main")
      .maybeSingle();
    if (data?.settings) {
      siteSettings = normaliseSettings(data.settings);
    }
    renderSettingsForms();
  }

  async function saveSiteSettings() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setFeedback(els.dashboardFeedback, "error", "Supabase is not configured.");
      return;
    }
    clearFeedback(els.dashboardFeedback);
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
      setFeedback(els.dashboardFeedback, "success", "Website settings saved.");
    } catch (error) {
      console.error(error);
      setFeedback(els.dashboardFeedback, "error", error.message || "Website settings could not be saved.");
    } finally {
      setSaveButtonsState(false);
    }
  }

  async function createAdminBooking(event) {
    event.preventDefault();
    clearFeedback(els.adminBookingFeedback);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setFeedback(els.adminBookingFeedback, "error", "Supabase is not configured.");
      return;
    }

    const formData = new FormData(els.adminBookingForm);
    const payload = {
      client_name: String(formData.get("clientName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      service: String(formData.get("service") || "").trim(),
      preferred_day: String(formData.get("preferredDay") || "").trim(),
      preferred_time: String(formData.get("preferredTime") || "").trim(),
      notes: [adminBookingMarker, String(formData.get("notes") || "").trim()].filter(Boolean).join(" "),
      status: "confirmed"
    };

    if (!payload.client_name || !payload.phone || !payload.email || !payload.service || !payload.preferred_day || !payload.preferred_time) {
      setFeedback(els.adminBookingFeedback, "error", "Fill in all booking fields.");
      return;
    }

    if (isSlotUnavailable(payload.preferred_day, payload.preferred_time)) {
      setFeedback(els.adminBookingFeedback, "error", "That slot is closed in the booking rules.");
      return;
    }

    if (isServiceBlocked(payload.service, payload.preferred_day, payload.preferred_time)) {
      setFeedback(els.adminBookingFeedback, "error", "That service is blocked for the selected time.");
      return;
    }

    els.adminBookingSubmit.disabled = true;
    els.adminBookingSubmit.textContent = "Creating...";

    const { data: bookingCount } = await supabase.rpc("get_slot_booking_count", {
      p_day: payload.preferred_day,
      p_time: payload.preferred_time
    });

    if (Number(bookingCount || 0) >= Number(siteSettings.maxBookingsPerSlot || 1)) {
      els.adminBookingSubmit.disabled = false;
      els.adminBookingSubmit.textContent = "Create booking";
      setFeedback(els.adminBookingFeedback, "error", "That time is already full for the current slot capacity.");
      return;
    }

    const { error } = await supabase.from("bookings").insert([payload]);
    els.adminBookingSubmit.disabled = false;
    els.adminBookingSubmit.textContent = "Create booking";

    if (error) {
      console.error(error);
      setFeedback(els.adminBookingFeedback, "error", "Booking could not be created.");
      return;
    }

    els.adminBookingForm.reset();
    if (els.adminBookingDay) {
      els.adminBookingDay.min = getTodayString();
    }
    renderSettingsForms();
    setFeedback(els.adminBookingFeedback, "success", "Booking added and marked as admin booked.");
    els.refreshBookingsButton?.click();
  }

  function bindSettingsActions() {
    document.addEventListener("click", (event) => {
      const removeService = event.target.closest("[data-remove-service]");
      if (removeService) {
        collectSettingsFromForms();
        siteSettings.services.splice(Number(removeService.getAttribute("data-remove-service")), 1);
        renderSettingsForms();
        return;
      }

      const removePhoto = event.target.closest("[data-remove-photo]");
      if (removePhoto) {
        collectSettingsFromForms();
        siteSettings.gallery.splice(Number(removePhoto.getAttribute("data-remove-photo")), 1);
        renderSettingsForms();
        return;
      }

      const removeBlock = event.target.closest("[data-remove-service-block]");
      if (removeBlock) {
        collectSettingsFromForms();
        siteSettings.blockedServiceSlots.splice(Number(removeBlock.getAttribute("data-remove-service-block")), 1);
        renderSettingsForms();
      }
    });
  }

  function bindPatchHandlers() {
    if (bindingsReady) {
      return;
    }
    bindingsReady = true;

    bindSettingsActions();

    els.addServiceButton?.addEventListener("click", () => {
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

    els.addPhotoButton?.addEventListener("click", () => {
      collectSettingsFromForms();
      if (siteSettings.gallery.length >= 15) {
        setFeedback(els.dashboardFeedback, "error", "Maximum 15 gallery photos allowed.");
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

    els.addServiceBlockButton?.addEventListener("click", () => {
      collectSettingsFromForms();
      siteSettings.blockedServiceSlots.push(normaliseServiceBlock({
        service: getActiveServices()[0]?.name || "",
        day: getTodayString(),
        startTime: "09:00",
        endTime: "10:00",
        note: "",
        active: true
      }));
      renderSettingsForms();
    });

    els.saveButtons.forEach((button) => button.addEventListener("click", saveSiteSettings));
    els.adminBookingService?.addEventListener("change", renderAdminBookingTimeOptions);
    els.adminBookingDay?.addEventListener("change", renderAdminBookingTimeOptions);
    els.adminBookingForm?.addEventListener("submit", createAdminBooking);
  }

  async function bootSessionFeatures() {
    if (sessionReady) {
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user) {
      return;
    }
    sessionReady = true;
    if (els.adminBookingDay) {
      els.adminBookingDay.min = getTodayString();
    }
    bindPatchHandlers();
    await loadSiteSettings();
  }

  function watchAuth() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        sessionReady = false;
        window.setTimeout(() => {
          bootSessionFeatures();
        }, 150);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!hasConfig()) {
      return;
    }
    watchAuth();
    window.setTimeout(() => {
      bootSessionFeatures();
    }, 300);
  });
})();