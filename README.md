# Crewe Cut Barber Website

TypeScript + Express + EJS rebuild for Crewe Cut Barber using the shop's real photos and Turso for booking storage.

## Stack

- TypeScript
- Express
- EJS templates
- Turso / libSQL

## Setup

1. Copy `.env.example` to `.env`
2. Fill in:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
3. Install packages:
   ```bash
   npm install
   ```
4. Run:
   ```bash
   npm run dev
   ```

## Admin

- Login URL: `/admin`
- Username: `admin`
- Password: value of `ADMIN_PASSWORD`

Bookings are stored in Turso in the `bookings` table.
