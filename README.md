# FolioSpark

A conversational portfolio case-study builder. The assistant interviews you one question at a time
(Context → Problem & Value → Process & Decisions → Business Impact → Reflection), checks your story
against up to five target job descriptions, critiques density, readability and tone, and builds a
live, styled preview you can export as HTML, Markdown or JSON.

Built with Next.js 14 (App Router), Tailwind CSS, Lucide icons and Supabase.

## Run it locally

1. Install Node.js 18.17 or newer.
2. In this folder, run `npm install`.
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase URL and anon key
   (Supabase dashboard → Project Settings → API). Without them the app still runs in guest mode.
4. Run `npm run dev` and open http://localhost:3000.

## Set up Supabase

1. Create a project at supabase.com.
2. SQL Editor → New query → paste `supabase_schema.sql` → Run. This creates `profiles` and
   `projects` with row-level security so people can only see their own drafts.
3. Authentication → URL Configuration:
   - Site URL: your production URL (e.g. `https://foliospark.vercel.app`)
   - Redirect URLs: add `http://localhost:3000/**` and `https://your-domain/**`
4. Google sign-in: Authentication → Providers → Google → enable, then paste a Client ID and
   Secret from Google Cloud Console (OAuth client, type "Web application"). In Google Cloud, add
   `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables.
3. Deploy, then add the Vercel URL to Supabase's Site URL and Redirect URLs.

## How it's organised

| Path | What it does |
| --- | --- |
| `app/page.jsx` | Landing page and guest entry |
| `app/login/page.jsx` | Email/password and Google sign-in |
| `app/dashboard/page.jsx` | Saved projects: create, open, clone, delete |
| `app/builder/[id]/page.jsx` | Dual-pane workspace with autosave (`/builder/guest` for guests) |
| `components/ChatAssistant.jsx` | Onboarding, guided interview, critique, tools |
| `components/LivePreview.jsx` | Live case study with flip cards, carousel, before/after, diagrams, export |
| `components/Navbar.jsx` | Navigation with signed-in / guest indicator |
| `lib/caseStudy.js` | Data model, interview steps, parsers, themes |
| `lib/analysis.js` | Job-spec skill matching, per-answer critique, full audit |
| `lib/exporters.js` | HTML/CSS, Markdown and JSON export |
| `lib/projectStore.js` | Guest (browser storage) and account (Supabase) persistence |
| `supabase_schema.sql` | Tables, policies and triggers |

## Notes

- Guests get one draft, stored in their browser. Signing in shows a **Save to account** button
  that copies it into Supabase.
- The assistant's feedback is rule-based and runs in the browser, so there are no AI API costs.
  It can't open job or style-reference links — pasting job description text gives the best matching.
