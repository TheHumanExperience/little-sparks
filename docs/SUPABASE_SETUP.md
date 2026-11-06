# Leaderboard setup (Supabase)

The leaderboard is optional. While `dist/leaderboard-config.js` is empty, the 🏆 button stays hidden and the site works exactly as before.

1. **Create a project.** Sign in at <https://supabase.com>, choose **New project**, and set:
   - Name: `little-sparks`
   - A strong database password (you won't need it here)
   - Region: **Mumbai (ap-south-1)**

   Then wait for the project to finish setting up.
2. **Create the tables.** Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](../supabase/schema.sql), and press **Run**. You should see "Success. No rows returned". Running it again later is safe.
3. **Copy the URL and key.** Go to **Project Settings → API** (shown as **API Keys** in newer dashboards) and copy:
   - the **Project URL**, e.g. `https://abcd1234.supabase.co`
   - the **anon public** key (starts with `eyJ…`) or the **publishable** key (`sb_publishable_…`)

   Never use the `service_role` or secret key: the site's code is public.
4. **Fill in the config.** Edit `dist/leaderboard-config.js`:
   ```js
   const SUPABASE_URL = "https://abcd1234.supabase.co";
   const SUPABASE_ANON_KEY = "sb_publishable_…"; // or the legacy anon "eyJ…" key
   ```
   Commit and push to `main`. GitHub Pages redeploys in about a minute.
5. **Check it.**
   1. Open the site. It asks for a name once.
   2. Solve a puzzle, then tap 🏆.
   3. In Supabase, **Table Editor → solves** should show the row.

## How it works
- **Points.** A first solve earns Gentle 1, Medium 3, Tricky 5 points.
  - Reveals, replays and re-solves after ↺ earn nothing.
  - Each date × level × game counts only once; the server enforces this with its primary key.
- **Time.** Day, Week (starting Monday) and Month follow India time. Only puzzles dated today ±1 day count, so archive days don't.
- **Offline.** Points earned offline are queued in the browser and sent later.
- **Identity.** Each browser gets a random id kept in localStorage. There is no login, and clearing site data starts a new player.

## Security notes
- **Restricted access.** The browser can only call three functions: `upsert_player`, `record_solve` and `leaderboard`.
  - The tables have row-level security with no policies, and anon has no table rights.
  - The functions use fixed SQL with typed parameters, so there is no SQL injection, and they pin `search_path`.
  - Points are computed on the server.
- **Ids stay private.** Player ids are never returned, so nobody can rename someone else.
- **Name rules.** Names must be 1–20 characters with no control or hidden characters. They are escaped before display.
- **Spam limits.** Without logins, a determined person could still script fake players. Two caps limit this: 60 solves per player per day and 60 new players per hour. If that ever matters, enable Supabase anonymous sign-ins with a captcha.
- **Housekeeping (SQL Editor).**
  - Remove a player (their solves go too, via cascade): `delete from public.players where name = '…';`
  - Reset the board: `truncate solves;`
- **Free projects pause** after about a week without traffic. Open the dashboard to resume. While paused, solves wait in each browser's queue for up to a day.
