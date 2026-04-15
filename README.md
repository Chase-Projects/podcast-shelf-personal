# Podcast Shelf

A static, single-user personal podcast library. Forked in spirit from a Next.js + Supabase app, but with no backend — your library lives in `content/library.json`, committed to the repo.

## How it works

- **Canonical data** lives in [`content/library.json`](content/library.json) and is bundled into the static build at compile time.
- **In-browser edits** are stored in `localStorage` on top of the canonical data. When you have unsaved changes, an **Unsaved** badge appears in the header.
- **To persist edits back to the repo:** click **Export** in the header, save the downloaded `library.json` into `content/library.json`, commit, push. GitHub Actions rebuilds and deploys.
- **To discard unsaved edits:** click **Revert** (appears when there are unsaved changes).
- **iTunes search + episode lookup** runs directly against `itunes.apple.com` from the browser (CORS-enabled), so no API routes are needed.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Importing from a Supabase pg_dump

If you have a `.backup` file (plaintext pg_dump) from the original multi-user app, convert it:

```bash
npm run import:backup -- /path/to/db_cluster-XX.backup [username]
```

This writes `content/library.json`. The `username` argument is optional — if there's only one profile in the dump it's picked automatically.

## Deploying to GitHub Pages

1. Create a new GitHub repo named `podcast-shelf` under your account (the `basePath` in [`next.config.ts`](next.config.ts) assumes this name — change it there if you pick a different name).
2. Push this project to that repo.
3. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
4. The included workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds on every push to `main` and publishes the static `out/` directory.

The site will be available at `https://<your-username>.github.io/podcast-shelf/`.

## Going public later

If you want to open this up to other users, the JSON shape in `src/types/index.ts` maps 1:1 back to the original Supabase schema (`podcasts`, `user_podcasts`, `custom_ratings`, `favorite_episodes`). The Supabase-backed version of this app lives in a separate repo.
