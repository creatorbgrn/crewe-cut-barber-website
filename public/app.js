const schedule = [
  { days: [1, 2, 3, 4, 5, 6], open: { hour: 9, minute: 0 }, close: { hour: 19, minute: 0 } },
  { days: [0], open: { hour: 10, minute: 0 }, close: { hour: 18, minute: 0 } }
];

const config = window.CREWE_CUT_CONFIG || {};
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

function minutesOf(dayConfig, type) {
  return (dayConfig[type].hour * 60) + dayConfig[type].minute;
}

function formatTime(hour, minute) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getScheduleForDay(day) {
  return schedule.find((entry) => entry.days.includes(day)) ?? null;
}

function getNextOpening(now) {
  for (let offset = 0; offset < 7; offset += 1) {
    const day = (now.getDay() + offset) % 7;
    const configForDay = getScheduleForDay(day);

    if (configForDay) {
      return { offset, config: configForDay };
    }
  }

  return null;
}

function updateOpenStatus() {
  const topbarStatus = document.getElementById("shop-status");
  const liveTitle = document.getElementById("live-status-title");
  const liveCopy = document.getElementById("live-status-copy");

  if (!topbarStatus && !liveTitle && !liveCopy) {
    return;
  }

  const now = new Date();
  const today = getScheduleForDay(now.getDay());
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();

  let title = "Open today";
  let copy = "Check current opening hours.";
  let topbar = "Open 7 days";

  if (today && currentMinutes >= minutesOf(today, "open") && currentMinutes < minutesOf(today, "close")) {
    title = "Open now";
    copy = `Open until ${formatTime(today.close.hour, today.close.minute)} today.`;
    topbar = `Open now until ${formatTime(today.close.hour, today.close.minute)}`;
  } else {
    const nextOpening = getNextOpening(now);

    if (nextOpening) {
      const { offset, config: upcoming } = nextOpening;
      const dayLabel = offset === 0
        ? "today"
        : offset === 1
          ? "tomorrow"
          : new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(
              new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
            );

      title = "Currently closed";
      copy = `Opens ${dayLabel} at ${formatTime(upcoming.open.hour, upcoming.open.minute)}.`;
      topbar = `Closed now, opens ${dayLabel} at ${formatTime(upcoming.open.hour, upcoming.open.minute)}`;
    }
  }

  if (topbarStatus) {
    topbarStatus.textContent = topbar;
  }

  if (liveTitle) {
    liveTitle.textContent = title;
  }

  if (liveCopy) {
    liveCopy.textContent = copy;
  }
}

function setupReveal() {
  const revealItems = document.querySelectorAll(".reveal");

  if (!revealItems.length) {
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  revealItems.forEach((item, index) => {
    item.style.setProperty("--reveal-delay", `${Math.min(index * 35, 280)}ms`);
    observer.observe(item);
  });
}

function setupLightbox() {
  const lightbox = document.getElementById("gallery-lightbox");
  const image = document.getElementById("lightbox-image");
  const title = document.getElementById("lightbox-title");
  const text = document.getElementById("lightbox-text");
  const closeButton = document.querySelector(".lightbox-close");
  const triggers = document.querySelectorAll("[data-gallery-src]");

  if (!lightbox || !image || !title || !text || !closeButton || !triggers.length) {
    return;
  }

  const close = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      image.setAttribute("src", trigger.getAttribute("data-gallery-src") || "");
      image.setAttribute("alt", trigger.getAttribute("data-gallery-title") || "");
      title.textContent = trigger.getAttribute("data-gallery-title") || "";
      text.textContent = trigger.getAttribute("data-gallery-text") || "";
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
    });
  });

  closeButton.addEventListener("click", close);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    }
  });
}

function setupHeroMotion() {
  if (!window.matchMedia("(pointer:fine)").matches) {
    return;
  }

  const hero = document.querySelector("[data-hero-parallax]");
  const visual = document.querySelector(".hero-visual img");
  const cards = document.querySelectorAll(".floating-card");
  const statusCard = document.querySelector(".live-status-card");

  if (!hero || !visual) {
    return;
  }

  const apply = (x, y) => {
    visual.style.transform = `translate3d(${x * 10}px, ${y * 12}px, 0) scale(1.02)`;

    cards.forEach((card, index) => {
      const factor = index === 0 ? 14 : 9;
      card.style.transform = `translate3d(${x * factor * -1}px, ${y * factor * -1}px, 0)`;
    });

    if (statusCard) {
      statusCard.style.transform = `translate3d(${x * -8}px, ${y * -8}px, 0)`;
    }
  };

  hero.addEventListener("mousemove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) - 0.5;
    const y = ((event.clientY - rect.top) / rect.height) - 0.5;
    apply(x, y);
  });

  hero.addEventListener("mouseleave", () => {
    apply(0, 0);
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

function setupBookingForm() {
  const form = document.getElementById("booking-form");
  const feedback = document.getElementById("booking-feedback");
  const submitButton = document.getElementById("booking-submit");
  const preferredDayInput = form?.querySelector("input[name='preferredDay']");

  if (!form || !feedback || !submitButton) {
    return;
  }

  if (preferredDayInput) {
    preferredDayInput.min = new Date().toISOString().slice(0, 10);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.hidden = true;

    const supabase = getSupabaseClient();
    if (!supabase) {
      setFeedback(
        feedback,
        "error",
        "Supabase is not configured yet. Add your project URL and anon key in public/config.js before deploying."
      );
      return;
    }

    const formData = new FormData(form);
    const payload = {
      client_name: String(formData.get("clientName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      service: String(formData.get("service") || "").trim(),
      preferred_day: String(formData.get("preferredDay") || "").trim(),
      preferred_time: String(formData.get("preferredTime") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      status: "new"
    };

    if (
      !payload.client_name ||
      !payload.phone ||
      !payload.email ||
      !payload.service ||
      !payload.preferred_day ||
      !payload.preferred_time
    ) {
      setFeedback(feedback, "error", "Please fill in all required fields.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending request...";

    const { error } = await supabase.from("bookings").insert([payload]);

    submitButton.disabled = false;
    submitButton.textContent = "Send booking request";

    if (error) {
      setFeedback(
        feedback,
        "error",
        "The booking request could not be sent just now. Check the Supabase table and policies, then try again."
      );
      console.error(error);
      return;
    }

    form.reset();
    if (preferredDayInput) {
      preferredDayInput.min = new Date().toISOString().slice(0, 10);
    }
    setFeedback(feedback, "success", "Booking request saved successfully.");
  });
}

updateOpenStatus();
setupReveal();
setupLightbox();
setupHeroMotion();
setupBookingForm();
