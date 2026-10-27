# IMO Shortlist Tracker & Database (2006–2026)

A mobile-friendly, LaTeX-enabled IMO Shortlist (`ISL`) problem database, study tracker, and gamified progress dashboard built from *Big Beautiful Shortlist v2.1*.

## Features

1. **Mark & Unmark Completed Problems**
   - 1-click completion toggle or detailed logging modal.
   - Record **completion dates** (`YYYY-MM-DD`), attach **multiple solution links** (Overleaf, AoPS post, GitHub, Google Drive, Notion), and write **personal LaTeX notes / key lemmas**.
2. **Filter by Genre & Shortlist Position (Difficulty)**
   - Multi-select subject filters (`A • Algebra`, `C • Combinatorics`, `G • Geometry`, `N • Number Theory`).
   - Shortlist Position range filter (`Pos 1` to `Pos 10`) with quick difficulty presets (*Easy 1–2*, *Medium 3–4*, *Hard 5–6*, *Boss 7+*).
   - Filter by Year range (`2006–2026`), completion status (`All`, `Unsolved`, `Solved`, `Bookmarked`, `Has Solution Link`), and official **IMO Selected** (`\boxed{}`) flag.
3. **Random Shortlist Problem Picker**
   - Pick a random problem tailored to your chosen genres and shortlist position range.
   - Includes a built-in **Practice Stopwatch**, **Blind Mode** (hides problem year/position to practice without bias), and 1-click reroll.
4. **Full-Text Search & Bookmarks (`Review Later`)**
   - Instant client-side search across problem statements, codes (e.g., `2024 A1`), and your personal notes.
   - Dedicated **Review Later** queue for bookmarked problems.
5. **Progress Dashboard & Gamification**
   - **XP & Olympiad Ranks**: Earn XP scaled by shortlist position (`Pos 1 = 15 XP` up to `Pos 8+ = 110+ XP`), plus bonuses for official IMO problems and attached solution links.
   - **Daily Study Streak** counter and 16 **Olympiad Badges**.
   - **Interactive Yearly Shortlist Matrix (2006–2025)** showing your completion status across every year and category.
6. **Local Mode + Supabase Cloud Sync (Sign in with GitHub)**
   - Works out-of-the-box offline using `localStorage` with 1-click JSON Export/Import backups.
   - Connect your free **Supabase** project and **Sign in with GitHub** to sync across your PC and phone in real time.

---

## Local Development

### 1. Parse the TeX Database (Already pre-generated)
To regenerate `problems.json` from `Big Beautiful Shortlist v2.1.tex`:
```bash
python3 parse_isl.py
```

### 2. Run the Web App
```bash
cd app
npm install
npm run dev
```

---

## Hosting on GitHub Pages + Supabase Setup

### Deploying to GitHub Pages
1. Push this repository to GitHub.
2. In your GitHub repository, go to **Settings → Pages**, and under **Build and deployment**, select **GitHub Actions** as the source.
3. Every push to `main` or `master` will automatically build and deploy the app via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### Setting up Supabase + GitHub Sign-In
1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and run the setup SQL shown inside the app's **Cloud Sync Settings** modal (creates the `user_progress` table with Row-Level Security).
3. In Supabase, go to **Authentication → Providers → GitHub** and enable GitHub OAuth (using a GitHub OAuth App Client ID & Secret), and add your GitHub Pages URL under **Authentication → URL Configuration → Redirect URLs**.
4. Paste your **Supabase Project URL** and **Anon Key** into the app's **Cloud Sync** modal (or set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your GitHub Repository Secrets).
