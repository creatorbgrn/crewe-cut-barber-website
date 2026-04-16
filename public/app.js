const schedule = [
  { days: [1, 2, 3, 4, 5, 6], open: { hour: 9, minute: 0 }, close: { hour: 19, minute: 0 }, label: "9:00AM - 7:00PM" },
  { days: [0], open: { hour: 10, minute: 0 }, close: { hour: 18, minute: 0 }, label: "10:00AM - 6:00PM" }
];

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
    const config = getScheduleForDay(day);

    if (config) {
      return { offset, config, day };
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
      const { offset, config } = nextOpening;
      const dayLabel = offset === 0
        ? "today"
        : offset === 1
          ? "tomorrow"
          : new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(
              new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
            );

      title = "Currently closed";
      copy = `Opens ${dayLabel} at ${formatTime(config.open.hour, config.open.minute)}.`;
      topbar = `Closed now, opens ${dayLabel} at ${formatTime(config.open.hour, config.open.minute)}`;
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

updateOpenStatus();
setupReveal();
setupLightbox();
