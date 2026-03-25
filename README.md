# Field Journal App

A small private web app for two people to track body measurements and notes over time from separate devices.

## Repo structure

- `index.html` - app shell
- `styles.css` - field-note theme
- `app.js` - app behavior
- `config.js` - Supabase URL and anon key
- `config.example.js` - blank template for `config.js`
- `supabase_schema.sql` - database schema and RLS policies
- `vercel.json` - lightweight Vercel config
- `DEPLOYMENT_CHECKLIST.md` - exact deployment steps

## Quick start

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase_schema.sql`.
3. Open `config.js` and replace:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_ANON_KEY`
4. Push this folder to GitHub.
5. Import the repo into Vercel.
6. In Supabase Auth settings:
   - set **Site URL** to your Vercel production URL
   - add the same URL to **Redirect URLs**
7. Open the deployed app.
8. Create accounts on both devices.
9. One person creates a journal and shares the invite code.
10. The second person joins with that code.

## Notes

- This app uses the Supabase anon key in the browser, which is normal for client-side apps. Keep Row Level Security enabled.
- If you use a custom domain later, add that exact domain to Supabase redirect settings too.
- Magic links work best when the redirect URL exactly matches your deployed site URL.

See `DEPLOYMENT_CHECKLIST.md` for the full walk-through.
