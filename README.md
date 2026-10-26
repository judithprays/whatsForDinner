# whatsForDinner

A minimal personal dinner planner built with plain HTML, CSS, JavaScript, and Supabase.

## MVP scope

- Email/password sign-up and sign-in
- Personal recipe collection, including a "Recipes to Try" flag
- Weekly dinner menu
- Shopping list generated from the week's recipes
- Check off ingredients you already have and print only what you still need
- Saved weekly menus / dinner history

Not in the first version: friends/feed, public sharing, comments, social features, photo uploads, automated nutrition or cost calculations, or advanced ingredient quantity consolidation.

## Files

- `index.html` — page structure
- `styles.css` — minimal, responsive styling
- `script.js` — app behavior
- `config.js` — Supabase project URL and publishable key
- `supabase/schema.sql` — database tables and Row Level Security policies

## 1. Create the GitHub repository

Create an empty repository named `whatsForDinner` in your GitHub account. Do not add a README or license there (this folder already contains a README).

Then, from Terminal:

```bash
cd /path/to/whatsForDinner
git init
git add .
git commit -m "Initial whatsForDinner MVP scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/whatsForDinner.git
git push -u origin main
```

Replace the path and username placeholders.

## 2. Create the Supabase project

1. Create a new project in Supabase.
2. Open **SQL Editor** in the Supabase dashboard.
3. Paste and run the contents of `supabase/schema.sql`.
4. In **Project Settings → API**, copy the Project URL and the publishable key (or legacy anon key).
5. Put those values into `config.js`.

Do **not** use a `service_role` or secret key in browser code.

## 3. Test sign-in

- Open the app through a local web server (not by double-clicking `index.html`).
- Create an account, confirm your email if Supabase requires it, then sign in.
- Add two or three recipes.
- Plan the current week and save it.
- Build the shopping list, check off items you already have, and test printing.

For local preview, if Python is installed:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## 4. Publish with GitHub Pages

In the repository, open **Settings → Pages**. Select **Deploy from a branch**, choose `main` and `/ (root)`, and save. GitHub will show the published URL after deployment.

If email confirmation is enabled, add your local and published URLs to Supabase **Authentication → URL Configuration** (Site URL and Redirect URLs).

## Important MVP notes

- Ingredients are currently one text line per ingredient. The shopping list combines exact duplicate lines, but does not yet understand equivalent quantities (for example, "1 onion" and "2 onions").
- Recipe photo is currently an optional image URL, not an upload. Add Supabase Storage upload only after the core workflow works.
- Ratings are personal estimates, not health or nutrition calculations.
- Menu history stores each saved weekly plan. Save after changing a previous week to preserve the changes.
