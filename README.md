# SPS Nexus UAT

An Arabic, shared UAT project workspace built with Vite, React, TypeScript, Tailwind CSS, and Supabase. See [TDD.md](./TDD.md) for the product and security requirements.

## Local setup

1. Install Node.js 20.19+ and the Supabase CLI.
2. Copy `.env.example` to `.env` and fill in the **public** Supabase project URL and anon/publishable key:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Install packages and start the local Supabase stack:

   ```powershell
   npm install
   supabase start
   supabase db reset
   ```

   `db reset` applies `supabase/migrations/` and loads `supabase/seed.sql`.

4. Configure Google OAuth in Google Cloud and Supabase Authentication → Providers → Google. Set `http://localhost:5173` as the site URL and add the Supabase callback URL displayed in the provider settings to the Google authorized redirect URIs. For local Supabase, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the Supabase CLI environment before starting the stack.
5. Start the app:

   ```powershell
   npm run dev
   ```

   Vite listens on all network interfaces. To open the app from another device on
   the same Wi-Fi/LAN, find this computer's IPv4 address with `ipconfig` and visit
   `http://<computer-ip>:5173` (for example, `http://192.168.1.25:5173`). Allow
   Node.js/Vite through Windows Defender Firewall on private networks if prompted.
   For Google sign-in from that device, add `http://<computer-ip>:5173/**` to
   Supabase Authentication → URL Configuration → Redirect URLs. The Google
   authorized redirect URI remains the Supabase callback URL.

New Google users are pending by default. After confirming the account in `auth.users`, manually activate it in the Supabase SQL editor:

```sql
update public.profiles
set status = 'active',
    role = 'admin',
    updated_at = now()
where id = '<verified-auth-user-uuid>';
```

Use `role = 'tester'` for normal users. Do not grant roles based on email/provider metadata. A trusted operator must promote at least one account to admin before creating a round.

Admins can select issue reports on the Issues page and export the selection as an Excel workbook or a print-ready PDF. PDF export opens the browser print dialog; choose **Save as PDF** to download it.

## Development checks

```powershell
npm test
npm run build
```

The browser uses only Supabase's anon/publishable key. Never expose the service-role key or Google client secret in the Vite environment.
