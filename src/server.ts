import "dotenv/config";

import express from "express";
import session from "express-session";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { actionCards, business, faqs, gallery, highlights, reasons, services } from "./content.js";
import { createBooking, initSchema, listBookings, updateBookingStatus } from "./db.js";

declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const app = express();

const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
const sessionSecret = process.env.SESSION_SECRET ?? "replace-this-session-secret";
const port = Number(process.env.PORT ?? 4321);

app.set("view engine", "ejs");
app.set("views", path.join(rootDir, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(rootDir, "public")));
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    }
  })
);

function ensureAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!req.session.isAdmin) {
    res.redirect("/admin");
    return;
  }

  next();
}

app.get("/", (_req, res) => {
  res.render("home", {
    business,
    services,
    gallery,
    highlights,
    actionCards,
    reasons,
    faqs,
    query: _req.query
  });
});

app.post("/bookings", async (req, res, next) => {
  try {
    const payload = {
      clientName: String(req.body.clientName ?? "").trim(),
      phone: String(req.body.phone ?? "").trim(),
      email: String(req.body.email ?? "").trim(),
      service: String(req.body.service ?? "").trim(),
      preferredDay: String(req.body.preferredDay ?? "").trim(),
      preferredTime: String(req.body.preferredTime ?? "").trim(),
      notes: String(req.body.notes ?? "").trim()
    };

    if (
      !payload.clientName ||
      !payload.phone ||
      !payload.email ||
      !payload.service ||
      !payload.preferredDay ||
      !payload.preferredTime
    ) {
      res.redirect("/?booking=missing#booking");
      return;
    }

    await createBooking(payload);
    res.redirect("/?booking=success#booking");
  } catch (error) {
    next(error);
  }
});

app.get("/admin", async (req, res, next) => {
  try {
    if (!req.session.isAdmin) {
      res.render("admin-login", {
        business,
        invalid: req.query.invalid === "1"
      });
      return;
    }

    const bookings = await listBookings();
    res.render("admin-dashboard", {
      bookings,
      business,
      dbInfo: {
        provider: "Turso / libSQL",
        hasStorage: "Yes",
        bookingEndpoint: "/bookings"
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/admin/login", (req, res) => {
  const username = String(req.body.username ?? "").trim();
  const password = String(req.body.password ?? "");

  if (username === "admin" && password === adminPassword) {
    req.session.isAdmin = true;
    res.redirect("/admin");
    return;
  }

  res.redirect("/admin?invalid=1");
});

app.post("/admin/bookings/:id/status", ensureAdmin, async (req, res, next) => {
  try {
    const allowed = new Set(["new", "contacted", "confirmed", "completed"]);
    const bookingId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const status = String(req.body.status ?? "new");

    if (!bookingId || !allowed.has(status)) {
      res.redirect("/admin");
      return;
    }

    await updateBookingStatus(bookingId, status);
    res.redirect("/admin");
  } catch (error) {
    next(error);
  }
});

app.post("/admin/logout", ensureAdmin, (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin");
  });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).send("Server error");
});

async function start() {
  await initSchema();
  app.listen(port, () => {
    console.log(`Crewe Cut Barber running on http://127.0.0.1:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
