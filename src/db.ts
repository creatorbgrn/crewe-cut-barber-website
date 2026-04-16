import { createClient } from "@libsql/client";

export type BookingInput = {
  clientName: string;
  phone: string;
  email: string;
  service: string;
  preferredDay: string;
  preferredTime: string;
  notes: string;
};

export type BookingRecord = BookingInput & {
  id: string;
  status: string;
  createdAt: string;
};

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
}

export const db = createClient({
  url,
  authToken
});

export async function initSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      service TEXT NOT NULL,
      preferred_day TEXT NOT NULL,
      preferred_time TEXT NOT NULL,
      notes TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function createBooking(input: BookingInput) {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `
      INSERT INTO bookings (
        id, client_name, phone, email, service, preferred_day, preferred_time, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `,
    args: [
      id,
      input.clientName,
      input.phone,
      input.email,
      input.service,
      input.preferredDay,
      input.preferredTime,
      input.notes
    ]
  });
}

export async function listBookings(): Promise<BookingRecord[]> {
  const result = await db.execute(`
    SELECT
      id,
      client_name AS clientName,
      phone,
      email,
      service,
      preferred_day AS preferredDay,
      preferred_time AS preferredTime,
      notes,
      status,
      created_at AS createdAt
    FROM bookings
    ORDER BY created_at DESC
  `);

  return result.rows as unknown as BookingRecord[];
}

export async function updateBookingStatus(id: string, status: string) {
  await db.execute({
    sql: "UPDATE bookings SET status = ? WHERE id = ?",
    args: [status, id]
  });
}
