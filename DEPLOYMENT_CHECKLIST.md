# Vercel + Supabase deployment checklist

This is the exact copy-paste guide for getting the Field Journal app live.

## 1) Create a Supabase project

- Go to Supabase and create a new project.
- Wait for the database to finish provisioning.

## 2) Run the database schema

In Supabase:

- Open **SQL Editor**
- Create a new query
- Paste everything from `supabase_schema.sql`
- Run it

That creates the tables, relationships, indexes, Row Level Security, and policies for the shared journal.

## 3) Copy your project values from Supabase

In Supabase:

- Open **Project Settings**
- Open **Data API** or **API settings** depending on the dashboard section name
- Copy:
  - **Project URL**
  - **anon public key**

## 4) Paste those values into `config.js`

Open `config.js` and replace the placeholders.

```js
export const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

It should end up looking like this:

```js
export const SUPABASE_URL = 'https://abcd1234efgh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

Do not use the service role key here.
Only use the anon public key in the browser.

## 5) Put the app in GitHub

Create a new GitHub repository and upload these files:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `config.example.js`
- `supabase_schema.sql`
- `README.md`
- `DEPLOYMENT_CHECKLIST.md`
- `vercel.json`

Suggested repo name:

`field-journal-app`

## 6) Deploy the repo to Vercel

In Vercel:

- Click **Add New...**
- Choose **Project**
- Import your GitHub repo
- Keep the default project settings

For this app, Vercel usually detects it as a static site and does not need a special build command.

Recommended values if it asks:

- **Framework Preset:** Other
- **Build Command:** leave blank
- **Output Directory:** leave blank

Then click **Deploy**.

## 7) Copy your live Vercel URL

After deploy, Vercel will give you a production URL like:

`https://field-journal-app.vercel.app`

Copy that exact URL.

## 8) Add the Vercel URL to Supabase Auth settings

In Supabase:

- Open **Authentication**
- Open **URL Configuration**

Set:

- **Site URL** = your Vercel production URL
- **Redirect URLs** = add your Vercel production URL

Example:

- Site URL: `https://field-journal-app.vercel.app`
- Redirect URL: `https://field-journal-app.vercel.app`

If you later add a custom domain, add that exact domain here too.

## 9) Optional: make sign-up easier

In Supabase:

- Open **Authentication**
- Open **Providers** or **Sign In / Providers**
- Make sure **Email** is enabled

You can use either:
- email + password
- magic link

If email confirmation is enabled, people will need to confirm their email before signing in normally.

## 10) Test on both devices

On device 1:
- open the Vercel URL
- create an account
- sign in
- create a journal
- copy the invite code

On device 2:
- open the same URL
- create a second account
- sign in
- join with the invite code

Now both devices should see the same entries.

## 11) First entry test

Create one entry on device 1 with:
- weight
- hips
- tummy
- under bust
- tummy sucking-in count
- observed/reported/both
- water intake
- notes

Then check device 2.
The new entry should appear after refresh, and realtime updates may also appear automatically.

## Troubleshooting

### “Add your Supabase URL and anon key in config.js”
You still have placeholder values in `config.js`.

### Magic link sends but does not log in correctly
Your Supabase **Site URL** or **Redirect URLs** do not exactly match your live app URL.

### I can sign in but cannot save entries
Double-check that:
- `supabase_schema.sql` ran successfully
- Row Level Security policies were created
- the user joined or created a journal before saving entries

### I deployed but only see a blank page
Usually this means:
- `config.js` is missing
- there is a typo in the Supabase URL or anon key
- a file did not get pushed to GitHub

## Optional next upgrades

If you want version two, these are the highest-value additions:
- edit and delete entries
- charts over time
- export to CSV
- separate profile labels for each person
- custom domain
