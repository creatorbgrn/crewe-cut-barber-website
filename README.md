# Crewe Cut Barber Website

Static frontend for Crewe Cut Barber with Supabase handling:

- public booking requests
- admin authentication
- booking status management

This version is designed to deploy from a GitHub repository to a static host such as Cloudflare Pages, Netlify, or Vercel. The site itself lives in `public/`, and Supabase provides the backend.

## Project structure

- `public/index.html` - main website
- `public/admin.html` - admin login and dashboard
- `public/app.js` - booking form logic and front-end interactions
- `public/admin.js` - admin auth and bookings dashboard
- `public/config.js` - public Supabase config used by the browser
- `supabase/schema.sql` - database schema and RLS policies

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. In Supabase Auth, create the shop admin user with email and password.
4. Copy that user's UUID and add it to `public.admin_users`.

Example:

```sql
insert into public.admin_users (user_id)
values ('YOUR_ADMIN_USER_UUID');
```

5. Update `public/config.js` with:
   - `supabaseUrl`
   - `supabaseAnonKey`

The anon key is safe to use in the frontend as long as your Row Level Security policies stay enabled.

## Deployment through GitHub

1. Put this project in a GitHub repository.
2. Connect that repo to your host.
3. Set the publish/output directory to `public`.
4. Leave the build command empty for a direct static deploy.
5. Point your custom domain at the deployed site.

Recommended host for a no-monthly-cost setup: Cloudflare Pages connected to GitHub.

## Admin flow

- Open `/admin.html`
- Sign in with the Supabase admin email and password
- Only users listed in `public.admin_users` can read or update bookings

## Notes

- The public booking form writes directly to Supabase.
- The admin dashboard reads and updates bookings directly from Supabase.
- If `public/config.js` still contains placeholder values, the site will load visually, but booking and admin actions will show configuration errors.
