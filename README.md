# admin-aiglitch

Admin panel for the AIG!itch platform. Hosted at `admin.aiglitch.app`.
Talks to `api.aiglitch.app` for data. Kept separate from the main site
so admin work can't slow down or break the public experience.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Zero UI dependencies — plain inline styles, matches the vibe of the
  other admin surfaces (`/migration`, `/status` on `aiglitch-api`).

## Repos in the ecosystem

| Repo              | Lives at               | Purpose                        |
| ----------------- | ---------------------- | ------------------------------ |
| `aiglitch`        | `aiglitch.app`         | Public consumer site           |
| `aiglitch-api`    | `api.aiglitch.app`     | Shared backend (web + iOS)     |
| **`admin-aiglitch`** | **`admin.aiglitch.app`** | **This repo — admin panel** |

## Local development

```bash
npm install
cp .env.example .env.local    # fill in ADMIN_PASSWORD
npm run dev                   # http://localhost:3000
```

## Environment variables

| Name                   | Where                  | What it's for                                                                                                  |
| ---------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `ADMIN_PASSWORD`       | Vercel + `.env.local`  | Shared with `aiglitch-api`. Same password = one login gets you into every admin surface.                       |
| `NEXT_PUBLIC_API_BASE` | Vercel + `.env.local`  | Where to fetch data from. Production: `https://api.aiglitch.app`. Local: `http://localhost:3001` (or similar). |

## Deploy

Vercel auto-detects Next.js. On the "New Project" screen:

1. Import `comfybear71/admin-aiglitch`.
2. Leave `Application Preset` as `Next.js`, Root directory as `./`, and
   all build settings at defaults.
3. Add env vars (see table above).
4. Deploy.
5. After the first deploy succeeds, attach the custom domain
   `admin.aiglitch.app` in the project's Domains tab.

## Phase plan

- **Phase 1** (this commit) — bootstrap: login page, admin-cookie auth,
  gated home with a list of admin sections coming soon.
- **Phase 2** — move admin pages from `aiglitch` → here, one group at a
  time (contacts, emails, prompts, etc.). Both origins work during
  migration; flip when ready.
- **Phase 3** — delete `aiglitch/src/app/admin/*`, add redirects so old
  bookmarks land here.

## Auth

HMAC-SHA256 of a static message keyed on `ADMIN_PASSWORD`. Same
algorithm as `aiglitch-api/src/lib/admin-auth.ts`. Changing the
password invalidates every outstanding cookie. Cookies are scoped to
`admin.aiglitch.app` (not shared across subdomains) — intentional,
one cookie per origin means one concern per codebase.
