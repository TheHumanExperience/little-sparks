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

## Upgrading: unique names and sync codes
This adds unique names and device sync codes, and merges existing duplicate names. Do it in this order:

1. In Supabase, open **SQL Editor → New query**, paste all of the new [`supabase/schema.sql`](../supabase/schema.sql), and press **Run**.
   - Players with the same name (ignoring case and extra spaces) are merged into the oldest one. Their solves move across, and a puzzle solved on both counts once.
   - Running it again is safe. The current site keeps working in the meantime.
2. Push the new site code to `main`.
3. On a browser whose player was merged away, the site will say the name is taken. To keep playing as the same player:
   1. On the browser that still owns the name, tap 🏆 → **Use on another device** to get a code like `K7QM-2XPA`.
   2. On the other browser, enter that code under "Is it you?".

## How it works
- **Points.** A first solve earns Gentle 1, Medium 3, Tricky 5 points.
  - Reveals, replays and re-solves after ↺ earn nothing.
  - Each date × level × game counts only once; the server enforces this with its primary key.
- **Time.** Day, Week (starting Monday) and Month follow India time. Only puzzles dated today ±1 day count, so archive days don't.
- **Offline.** Points earned offline are queued in the browser and sent later.
- **Identity.** Each browser gets a random id kept in localStorage. There is no login, and clearing site data starts a new player.
- **Unique names.** Names are unique, ignoring case and extra spaces. Renaming yourself to a different case of your own name is fine.
- **Sync codes.** 🏆 → **Use on another device** makes an 8-character code.
  - Entering it on another device links that device to the same player and name.
  - Any points the device already had move across, and duplicates count once.
  - Each code works once, for 24 hours. Asking again makes a new one.

## Security notes
- **Restricted access.** The browser can only call five functions: `upsert_player`, `record_solve`, `leaderboard`, `sync_code` and `claim_code`.
  - The tables have row-level security with no policies, and anon has no table rights.
  - The functions use fixed SQL with typed parameters, so there is no SQL injection, and they pin `search_path`.
  - Points are computed on the server.
- **Ids stay private.** Player ids are never returned, so nobody can rename someone else.
- **Sync codes.**
  - Codes are 8 random characters (40 bits). The server stores only a SHA-256 hash, and never stores or shows the player id.
  - Codes are single-use and expire after 24 hours.
  - Wrong guesses are logged, and claiming pauses for everyone after 100 misses in an hour. Someone could abuse this to block linking for an hour, but they can't steal a player.
- **Name rules.** Names must be 1–20 characters with no control or hidden characters. They are escaped before display.
- **Spam limits.** Without logins, a determined person could still script fake players. Two caps limit this: 60 solves per player per day and 60 new players per hour. If that ever matters, enable Supabase anonymous sign-ins with a captcha.
- **Housekeeping (SQL Editor).**
  - Remove a player (their solves go too, via cascade): `delete from public.players where name = '…';`
  - Reset the board: `truncate solves;`
- **Free projects pause** after about a week without traffic. Open the dashboard to resume. While paused, solves wait in each browser's queue for up to a day.
