# CLAUDE.md — admin-aiglitch

> This file is the project's brain. Every Claude session in this repo reads it automatically.
> Never delete. To update, edit and commit on a feature branch.

---

## ⚠️ MANDATORY — Sister repos

This repo is ONE OF THREE in the AIG!itch ecosystem. The other two:

- **comfybear71/aiglitch-api** — the headless backend at api.aiglitch.app.
  Every API route lives there. All crons, business logic, on-chain
  writes. NEVER duplicate backend code in this repo.

- **comfybear71/aiglitch** — the consumer-facing UI at aiglitch.app.
  Same pattern as admin-aiglitch but for end users. Reference for shared
  components, design tokens, animations.

### Run this at the start of every session

```bash
if [ -d /home/user/aiglitch-api ]; then
  git -C /home/user/aiglitch-api pull --ff-only
else
  git clone https://github.com/comfybear71/aiglitch-api /home/user/aiglitch-api
fi
if [ -d /home/user/aiglitch ]; then
  git -C /home/user/aiglitch pull --ff-only
else
  git clone https://github.com/comfybear71/aiglitch /home/user/aiglitch
fi
```

Both repos are read-only references. Never edit, never push.

Before answering ANY question, read these first:
- `/home/user/aiglitch-api/HANDOFF.md` — current backend state + recent decisions
- `/home/user/aiglitch-api/CLAUDE.md` — locked architectural decisions
- `/home/user/aiglitch/src/app/admin/` — original admin pages (reference for component patterns, design tokens, animations)

## What this repo IS

`admin.aiglitch.app` — a Next.js 16 UI-only admin app. Strangler-proxies to api.aiglitch.app for ALL data. Mirrors the consumer aiglitch.app pattern but for the admin audience.

## What this repo is NOT

- Not a backend. NO DB connections, NO Solana RPC clients, NO AI SDK imports.
- Not a copy of aiglitch-api code. We CALL the backend, never duplicate.
- Not a cron host. NO entries in vercel.json crons section.

## Locked architectural decisions

| # | Decision | Value |
|---|---|---|
| 1 | Architecture pattern | UI-only Next.js + strangler-proxy to api.aiglitch.app. ZERO `/api/*` routes of this repo's own (except `/api/health` for Vercel). |
| 2 | Data flow | Every admin page calls `fetch("/api/admin/...")` which the `beforeFiles` rewrite proxies to api.aiglitch.app. |
| 3 | Auth | Login form POSTs to `/api/auth/admin` (proxied). Backend sets `aiglitch-admin-token` cookie with no Domain attribute → auto-scopes to admin.aiglitch.app. NO SSO across aiglitch.app + admin.aiglitch.app. |
| 4 | New backend endpoints | If admin needs a new endpoint, that endpoint ships in aiglitch-api FIRST (coordinated PR there). THEN this repo adds the strangler rewrite + UI page. NEVER add the endpoint here. |
| 5 | Visual fidelity | 1:1 with aiglitch.app/admin — same Tailwind tokens, same Geist Mono font, same dark theme, same animations. |
| 6 | Component pattern | Duplicate shared components from aiglitch (don't try to share via npm package). Solo dev, two repos, duplication is fine. |
| 7 | Deploy workflow | PR-first. Every change goes through a GitHub PR. Vercel auto-creates a preview deployment for each PR. Test the preview URL before merging. NEVER push to master directly. |

## Deploy workflow (PR-first — mandatory)

1. Create a feature branch: `claude/<short-name>` off master.
2. Make changes. Commit atomically.
3. Push the branch and open a PR on GitHub.
4. Vercel auto-creates a preview deployment for the PR.
5. Test the preview URL in incognito:
   - Login works
   - Tabs load real data from api.aiglitch.app via the proxy
   - Network tab shows `/api/admin/*` calls returning 200
   - Cookies scope correctly to admin.aiglitch.app
6. If preview is green, squash + merge the PR via GitHub UI.
7. Vercel auto-deploys master to the production URL (admin.aiglitch.app).
8. Tag a release (`v<semver>-<YYYY-MM-DD>`) via GitHub Releases UI.

**NEVER push directly to master. NEVER skip the preview test.**

## Hard rules — DON'T DEVIATE

- **No backend code.** No `/api/*` routes of your own except `/api/health` if Vercel needs one. If you find yourself reaching for `@/lib/db`, `@neondatabase/serverless`, `@solana/web3.js`, or any AI SDK, you're solving the wrong problem. The right answer is always `fetch("/api/admin/...")` via the strangler proxy.

- **No crons.** `vercel.json` has no crons section.

- **No new endpoints here.** If a feature needs a new backend endpoint, STOP, write a coordination note in HANDOFF.md, and tell the user to coordinate a PR on aiglitch-api first.

- **PR-first always.** No direct pushes to master.

- **Strict TS in production.** If a previous session relaxed TS for bootstrap, future sessions should tighten it back. Loose TS hides bugs that surface in production.

- **Spiral protocol.** Stop after 2 failed attempts on the same problem. Report the issue + what you tried. Don't fix-spiral.

## Sacred files (never delete)

`CLAUDE.md`, `HANDOFF.md`, `README.md`. If corrupted or deleted, restore from git history, not memory.

## Owner

Stuart French (comfybear71) — solo developer. Works from PC, iPad, and phone. Drives all merges and release tags via GitHub web UI.
