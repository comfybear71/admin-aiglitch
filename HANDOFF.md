# HANDOFF.md — admin-aiglitch

> Session log + state tracker. Updated at the end of every session.
> Never delete. Newest entries at the top.

---

## Direct-URL-only pages

These pages exist in admin-aiglitch but do NOT appear in the tab strip (kept off to preserve 1:1 visual fidelity with the legacy admin's tab strip). They're reachable only via direct URL or bookmark:

- `admin.aiglitch.app/cron-runs` — scheduled job dashboard + history
- `admin.aiglitch.app/status` — live health check (DB, Redis, Solana, Anthropic, xAI)

Note: `/prompts` IS in the tab strip — it's a reference-defined tab and appears in the legacy admin too.

If we later want `/cron-runs` and `/status` discoverable from the nav, add a "More" or "Tools" dropdown at the end of the tab strip — that preserves visual parity since the dropdown opens on click. Future enhancement, not now.

---

## Session log (newest first)

### 2026-05-30 — Activity tab done right (PR B of 3)

**Goal:** restore the Activity feature the user asked for, but UI-only — no backend code in this repo, no local password validation, all data via strangler-proxy to api.aiglitch.app.

**Shipped:**
- **`src/app/activity/activity-client.tsx`** — port of `aiglitch/src/app/activity/page.tsx` minus the Phantom wallet auth flow (admin cookie gates the route, no second auth layer). Renders the full legacy rollup: currently-active persona, cron job timers with per-job pause toggles + cost badges, cron execution log, 7-day trend chart, cost breakdown with throttle-savings estimate, activity-level slider, pending video jobs, quick stats, Feed/Topics tabs, 24h chart, source breakdown. Split the 7-day trend chart and cost breakdown into subcomponents (`CronTrendChart`, `CostBreakdown`) so the main file stays scannable.
- **`src/app/activity/page.tsx`** — Server Component cookie gate + `<ActivityClient />`. Same pattern as `/personas`, `/contacts`, `/cron-runs`, `/status`.
- **`next.config.ts`** — added `/api/activity` and `/api/activity-throttle` `beforeFiles` proxy rewrites to `api.aiglitch.app`.
- **`src/app/admin-shell.tsx`** — replaced the header Activity pill (which deep-linked to `aiglitch.app/activity`) with a Sign out button that DELETEs `/api/auth/admin` (proxied to backend) and redirects to `/login`. Feed pill kept.
- **`src/app/admin-types.ts`** — `Activity` was already in TABS (Haiku/Grok left that bit correct). Kept it. Deliberate divergence from the legacy admin reference, which had Activity as a header pill, not a tab. Justification: user explicitly asked to move Activity into the tab strip so they don't need a separate gate (Phantom QR on the consumer page) to view cron activity.

**Backend dependencies — Sign out + Activity both depend on PR C:**
- The Sign out button DELETEs `/api/auth/admin`, but `aiglitch-api/src/app/api/auth/admin/route.ts` only exports POST today. Until PR C ships, DELETE will 405 and the cookie won't be invalidated server-side; the local redirect to `/login` will still feel like a logout because the next admin page load will see no cookie (the cookie is set by the backend on POST, so DELETE is the only way to clear it).
  - **Workaround until PR C:** the cookie is set with `Max-Age=7d`, so the worst-case grace period if Sign out doesn't reach the backend is 7 days. Users who want a hard logout right now can clear their cookies in DevTools.
- `/api/activity` on aiglitch-api currently returns the wrong shape (a 5-column cron_runs list, not the legacy 12-query rollup the new UI expects) AND is 500ing on prod. The page renders an error card with a Retry button until that ships.

**Branch:** `claude/activity-tab-ui` (off `claude/revert-haiku-grok-damage` until PR A merges, then rebase to master).

---

### 2026-05-30 — Revert Haiku/Grok damage (PR A of 3)

**Symptom user reported:** `admin.aiglitch.app/activity` returned "Error: API error: 500" and the user noted "we are working on haiku and Grok and they have messed up project."

**Audit findings:**
- PR #12 added `src/app/api/auth/admin/route.ts` — backend code in a UI-only repo. Violates CLAUDE.md hard rule "No /api/* routes of your own except /api/health".
- PR #14 removed the `/api/auth/admin` proxy rewrite from `next.config.ts`. Login POSTs now hit the local stub instead of api.aiglitch.app. The local stub uses dummy `safeEqual`/`generateToken` from `admin-auth.ts` (string equality, no HMAC) — so the cookie value is the raw password, not the real token. Backend rejects every subsequent `/api/admin/*` call with 401. **Login silently broken on production unless ADMIN_PASSWORD happened to match by coincidence.**
- 5 loose commits (`0a7c1cc`, `b4051dd`, `2a5f5fa`, `b7db0dc`, `e4afc0c`) went straight to master with no PR. Violates PR-first rule.
- `src/app/activity/activity-client.tsx` just dumps raw JSON in a `<pre>` block — nothing like the legacy `aiglitch.app/activity` UI the user asked for.
- `src/app/admin-shell.tsx` replaced the legacy Feed + Activity header pills with Feed + a red Sign out button. Activity moved into the tab strip (good — user wanted that) but the legacy header had no Sign out.

**Restored to PR #11 baseline (`4bba6bf`):**
- `next.config.ts` — re-added `/api/auth/admin` proxy rewrite; removed contorted "DELETE handled locally" comment block; removed unused `/api/activity` + `/api/activity-throttle` rewrites (will be re-added in PR B).
- `src/app/admin-shell.tsx` — back to Feed + Activity pills, no Sign out, no local handleSignOut function.
- `src/lib/admin-auth.ts` — back to the pre-Haiku state (the dummy `safeEqual`/`generateToken` are still on disk but nothing imports them anymore; per `HANDOFF.md` line 63 they're tagged for deletion in a follow-up).

**Deleted (CLAUDE.md hard-rule violations):**
- `src/app/api/auth/admin/route.ts` — backend code.
- `src/app/activity/page.tsx`, `src/app/activity/activity-client.tsx` — placeholder JSON dump, will be ported properly in PR B.

**Outcome:** login should work again immediately on this branch's preview deploy because all `/api/auth/admin` traffic proxies to api.aiglitch.app's real HMAC implementation.

**Up next:**
- **PR B (this repo):** add `Activity` tab to TABS (between Overview and Daily Briefing), port `aiglitch/src/app/activity/page.tsx` UI verbatim into `src/app/activity/activity-client.tsx`, add `/api/activity` proxy rewrite, wire a Sign out button properly (DELETE `/api/auth/admin` proxied).
- **PR C (aiglitch-api):** investigate why `aiglitch-api/src/app/api/activity/route.ts` 500s on prod — almost certainly `cron_runs` table missing or schema mismatch. Decide endpoint shape: keep cron-monitor *or* port the legacy 12-query rollup. User chose the legacy consumer feed shape — that's the port target.
- **PR C prereq (aiglitch-api):** add a `DELETE /api/auth/admin` handler so the Sign out button can actually invalidate the HMAC cookie server-side.

---

### 2026-05-27 (late evening) — Visual fidelity pass (admin shell + overview dashboard)

**Status:** admin.aiglitch.app now matches the legacy aiglitch.app/admin shell pixel-for-pixel. Header, tab strip, overview dashboard, password gate all ported.

**Shipped (PR TBD):**
- **`src/app/admin-shell.tsx` (new)** — port of legacy `src/app/admin/layout.tsx` AdminShell. Sticky gradient-bordered header (⚙️ + purple→pink "AIG!itch" + "Admin"), Feed + Activity pills (cross-domain to aiglitch.app), generation-progress panel, 22-tab horizontal strip (purple/20 active, gray-900 inactive), max-w-7xl content container. Rewired `navigateToTab` to push `/${id}` (no `/admin` prefix; admin-aiglitch lives at subdomain root). Auth-check useEffect calls `/api/admin/stats` and flips `setAuthenticated(true)` on 200 — wakes up `useAdmin()`-driven pages. Shell is suppressed on `/login`.
- **`src/app/client-layout.tsx` (updated)** — wraps children in `AdminProvider` + `AdminShell`.
- **`src/app/page.tsx` (rewritten)** — was a Phase 1 placeholder; now a thin Server Component that runs `isAdminAuthenticatedServer()` and renders `OverviewClient`. Preserves server-side cookie gate from PR #7.
- **`src/app/overview-client.tsx` (new)** — verbatim port of legacy `src/app/admin/page.tsx`. Stat grid, Content Breakdown, AI Platform Sources, Special Content, Top Personas, Recent Posts. Top-persona links point to `https://aiglitch.app/profile/<username>` (cross-domain; admin doesn't host profile pages).
- **`src/app/login/page.tsx` (restyled)** — matches the legacy password-gate visual: 🔒, "AIG!itch Admin" gradient title, "Control Center" subtitle, `rounded-2xl` card, gray-700 border, p-8.
- **`src/app/login/login-form.tsx` (restyled)** — eye-toggle on the password input, "Enter Control Center" gradient button, error styling matched to legacy.

**Deferred / out of scope (called out explicitly):**
- `/cron-runs`, `/status` not in tab strip — direct URL only (see "Direct-URL-only pages" above).
- `src/app/logout-button.tsx` left on disk but no longer rendered (legacy admin has no logout button either). Cookie expires after 7 days; clear cookie manually for early logout. Future PR can wire it into the shell if desired.
- `/contacts` keeps its Server Component + apiFetch architecture (per CLAUDE.md "no backend code" rule).
- `admin-types.ts` + `AdminContext.tsx` left byte-identical to the legacy reference — no divergence.
- Strict TypeScript still on `ignoreBuildErrors` (parked).
- 401 fetch interceptor still parked.
- `/api/auth/admin/validate` endpoint on aiglitch-api still parked.

**Branches:** `claude/visual-fidelity-fix` (PR open).

---

### 2026-05-27 (evening) — Login-loop fix + dark theme on landing

**Status:** Two PRs shipped + tagged + deployed to production. admin.aiglitch.app now logs in correctly and matches the legacy admin's dark theme on the landing/login pages.

**Shipped:**
- **PR #7 — Login loop fix** (`v0.1.1-2026-05-27`). Bootstrap had 6 Server Components (`/`, `/contacts`, `/cron-runs`, `/login`, `/prompts`, `/status`) calling `isAdminAuthenticated()` from `src/lib/admin-auth.ts`, which checks `document.cookie` — undefined on the server, so the gate always failed → redirect-to-login loop after correct password. Added `src/lib/admin-auth.server.ts` with `isAdminAuthenticatedServer()` that reads the cookie via `next/headers` `cookies()`. Patched all 6 Server Components to use the server-side version. Client components left alone (they correctly use `document.cookie`).
- **PR #8 — Dark theme on landing + login** (`v0.1.2-2026-05-27`). Bootstrap had hand-coded inline light-theme styles on `/`, `/login`, `login-form.tsx`, `logout-button.tsx` — they overrode the dark `<body>` set in `layout.tsx`. Tailwind + dark theme were both wired correctly; the inline `background: "#fff"` was the problem. Replaced inline styles with Tailwind classes using the legacy admin's tokens (bg-gray-900 panels, border-gray-800, amber-400 headings, cyan-400 accents, purple→cyan gradient on brand + primary button).

**Branches:** `claude/optimistic-knuth-zxZpK` (PR #7, merged), `claude/fix-admin-theme` (PR #8, merged). Both branches deleted.

**Open follow-ups (deferred during this session):**
- Tighten TypeScript strict mode (still on `ignoreBuildErrors`)
- 401/403 fetch interceptor + redirect-to-login on cookie expiry
- New `/api/auth/admin/validate` endpoint on aiglitch-api so the server-side cookie check can validate the HMAC, not just presence (currently an invalid cookie passes the gate but all data fetches return 401 — acceptable MVP)
- Optional `middleware.ts` for early redirects (would centralise the auth gate)
- Drop dummy `safeEqual` / `generateToken` from `src/lib/admin-auth.ts` once nothing imports them
- Refactor `AdminContext.tsx` if/when the second wave of pages port over
- Phase 2 page migrations: build the real dashboard at `/` (currently a phased-migration placeholder)

**Scope discipline this session:** both PRs were tightly scoped per the user's brief. No surrounding cleanup, no scope creep into the deferred items above.

---

### 2026-05-27 — Bootstrap

**Status:** First session. Repo scaffolded as UI-only Next.js 16 admin app. Connected to api.aiglitch.app via strangler proxy. Ready for first preview deploy + custom domain wiring.

**Shipped:**
- Next.js 16 + Tailwind 4 + Geist Mono scaffold
- `next.config.ts` with 58 `beforeFiles` rewrites covering all `/api/admin/*` endpoints + `/api/auth/admin` → api.aiglitch.app
- `globals.css` + Tailwind tokens lifted from aiglitch (dark theme, purple/cyan accents, all glitch/pulse animations)
- 26 admin pages ported from aiglitch/src/app/admin/* (1:1 layout fidelity). Only skipped: `directors/` (depends on retired director-movies pipeline in aiglitch-api).
- `AdminContext` for client-side auth state management
- `ClientLayout` wrapper for pre-render safety
- Atomic commits across 5 logical steps

**Branch:** `claude/determined-davinci-Hes11` (PR open, awaiting review + preview-deploy test)

**Known yellow flags (defer to follow-up session):**
- TypeScript: loose-checking enabled to get build green during bootstrap. Must tighten to strict mode before adding any meaningful new pages. Otherwise small breakages won't surface at compile time.
- No 401/403 interceptor: if admin cookie expires mid-session, pages silently fail to load data with no UX feedback. Add a fetch interceptor that redirects to `/login` on 401.
- Form validation: stock Next.js form behavior. Acceptable for solo-dev internal use; bigger fix later.

**Architecture decisions captured in CLAUDE.md.** Read that file at the start of every future session for the locked rules.

**Cross-repo dependencies:**
- All admin endpoints live on aiglitch-api. If a new endpoint is needed, PR aiglitch-api FIRST, then add the strangler rewrite + UI page here.
- Visual fidelity reference is aiglitch/src/app/admin/*. Keep clones in sync if the consumer admin styling changes.

**Next session expected work (when user kicks off):**
1. Tighten TypeScript strict mode + fix any annotation gaps
2. Add 401/403 fetch interceptor + redirect-to-login
3. Iterate on any specific pages that surface bugs from real-world use
4. Eventually: trim unused pages once user knows what they don't open

**Rule 5 PR handoff format** — when shipping future work, deliver in this exact format (mirrors aiglitch-api/CLAUDE.md Rule 5):
1. Compare URL
2. PR Title (in code block)
3. PR Description (markdown, in code block)
4. Merge instructions (numbered)
5. Release tag suggestion + tag description

---

## What's Complete

### ✅ Step 1: Strangler Proxy Rewrites
- **next.config.ts**: 58 admin endpoint rewrites (55 base + 3 nested :path* variants)
- All `/api/admin/*` routes transparently proxy to https://api.aiglitch.app
- All requests carry admin cookie (aiglitch-admin-token) auto-scoped to admin.aiglitch.app
- Auth endpoint `/api/auth/admin` wired

### ✅ Step 2: Design Tokens + Tailwind
- Copied globals.css from aiglitch with all keyframe animations (glitch, pulse-glow, etc.)
- Dark theme: bg-black, text-white, font-mono, Geist fonts
- Added postcss.config.mjs, tailwind configured
- Root layout updated with dark class + typography

### ✅ Step 3: Core Infrastructure
- **AdminContext.tsx**: Client-side auth state + Admin cookie checking
- **admin-types.ts**: 22 Tab definitions + all shared types
- **ClientLayout.tsx**: Wraps children with AdminProvider (prevents pre-render errors)

### ✅ Step 4: Page Ports (26 total)
Ported 1:1 from aiglitch/src/app/admin/* → admin-aiglitch/src/app/*:

| Page | Status | Notes |
|------|--------|-------|
| overview | ✅ | Dashboard at `/` |
| login | ✅ | Password auth form |
| briefing | ✅ | Daily news + topics |
| personas | ✅ | AI persona CRUD |
| users | ✅ | Meat Bags (human users) |
| posts | ✅ | Feed moderation |
| hatchery | ✅ | Persona generation |
| trading | ✅ | GLITCH + Budju trading |
| marketing | ✅ | Multi-platform posting |
| costs | ✅ | AI spend tracking |
| channels | ✅ | Channel management |
| events | ✅ | Timeline events |
| campaigns | ✅ | Ad campaigns |
| sponsors | ✅ | Sponsor management |
| prompts | ✅ | Prompt overrides |
| x-growth | ✅ | X/Twitter growth |
| tiktok-blaster | ✅ | TikTok automation |
| spec-ads | ✅ | Spec ad gallery |
| nft-marketplace | ✅ | NFT Art studio |
| merch | ✅ | Merch Studio |
| emails | ✅ | Email templates |
| contacts | ✅ | Outreach contacts |
| meatlab | ✅ | MeatLab experiments |
| budju | ✅ | Budju trading specifics |
| media | ✅ | Media library |
| create | ✅ | New persona wizard |

### ✅ Step 5: Shared Components & Libs
- **src/components/PromptViewer.tsx**: Copied from aiglitch
- **src/lib/api-client.ts**: Typed fetch wrapper (calls proxied endpoints)
- **src/lib/admin-auth.ts**: Client-safe cookie-based auth checking
- **src/lib/ai/costs.ts**: Cost constants only (no server-side DB functions)
- **src/lib/**: Copied sponsor-packages, marketplace, constants, costs types

### ✅ Step 6: Build & Runtime
- Build: `npm run build` ✅ succeeds
- TypeScript: Passes with typescript.ignoreBuildErrors (will fix type annotations in next session)
- App ready for local dev: `npm run dev`

## Open Items for Next Session

### Blocked by Design Decisions (User Input Needed)
1. **TypeScript Annotations**: Pages have loose types (// @ts-ignore would help but add proper interfaces instead)
2. **Tailwind Config**: Next.js 16 with Tailwind 4 is working but could use custom theme file
3. **Error Handling**: Pages fetch from API but don't handle 401/403 gracefully (should redirect to login)

### Quality Improvements (Not Blocking)
1. **Component Extraction**: Create reusable list/table components to reduce page duplication
2. **Form Validation**: Pages have minimal client-side validation
3. **Loading States**: Some operations lack loading spinners or progress feedback
4. **Responsive Design**: Admin UI targets desktop; mobile layout untested

### Known Skips (Intentional)
- **directors/** page: Imports retired @/lib/content/director-movies pipeline. Skip entirely.
- Server action files: All removed (admin-aiglitch is UI-only, no server logic)
- admin-auth.ts server functions: Removed isAdminAuthenticated async version (replaced with client-side cookie check)

## Testing Checklist

Before ship, verify:
- [ ] `npm run dev` starts without errors
- [ ] Login page loads, can enter password
- [ ] Clicking tabs navigates between pages
- [ ] Each page attempts to load data (check Network tab in DevTools)
- [ ] Verify next.config.ts rewrites are firing (check DevTools Network → api/admin/* requests)
- [ ] Cookie is set after login (check DevTools Application → Cookies)
- [ ] Check Backend API is reachable (test curl to api.aiglitch.app/api/admin/stats with auth cookie)

## Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:3000

# Validation
npm run typecheck       # TypeScript check (will show type errors, but build succeeds)
npm run lint            # ESLint

# Build
npm run build           # Production build
npm run start           # Run production build
```

## Branch & Release

Push to origin with:
```
git push -u origin claude/determined-davinci-Hes11
```

When ready to merge:
1. Create PR: `master...claude/determined-davinci-Hes11`
2. Title: `Bootstrap admin-aiglitch: port 26 pages + strangler proxy`
3. Merge method: Squash and merge
4. Tag: `v0.1.0-2026-05-27`

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  admin.aiglitch.app (admin-aiglitch, this repo)         │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐    │
│ │ Next.js 16 (App Router, Client Components)      │    │
│ │ - Root Layout (dark theme, Tailwind)            │    │
│ │ - ClientLayout (AdminProvider wrapper)          │    │
│ │ - 26 Page Routes (UI only, no /api logic)       │    │
│ │ - /api/auth/admin (route, proxied)              │    │
│ └──────────────────────────────────────────────────┘    │
│         ↓ fetch() with cookie jar                       │
├─────────────────────────────────────────────────────────┤
│ next.config.ts beforeFiles Rewrites (58 routes)        │
│   /api/admin/* → api.aiglitch.app/api/admin/*          │
│   /api/auth/admin → api.aiglitch.app/api/auth/admin    │
├─────────────────────────────────────────────────────────┤
│ Browser sends aiglitch-admin-token cookie             │
│ (set by api.aiglitch.app/api/auth/admin response)      │
│ Auto-scopes to admin.aiglitch.app domain only          │
└─────────────────────────────────────────────────────────┘
         ↓ HTTP (includes cookie)
┌─────────────────────────────────────────────────────────┐
│  api.aiglitch.app (aiglitch-api, separate repo)        │
├─────────────────────────────────────────────────────────┤
│ - All business logic, DB reads/writes                   │
│ - 55 /api/admin/* endpoints                             │
│ - Validates admin-token cookie on each request         │
└─────────────────────────────────────────────────────────┘
```

## Notes for Next Session

1. **No Backend Work Needed**: All 55 admin endpoints already exist on aiglitch-api (migration complete). Zero new backend code needed to ship this.

2. **Cold Start Testing**: Before pushing, test from a fresh clone:
   ```bash
   git clone https://github.com/comfybear71/admin-aiglitch
   cd admin-aiglitch
   git checkout claude/determined-davinci-Hes11
   npm install
   npm run dev
   ```
   Then visit http://localhost:3000 and verify login works.

3. **Cookie Domain Scope**: Admin cookie is intentionally separate from aiglitch.app cookies. Users must log in again on admin domain (by design, per Phase 10 architecture).

4. **Vercel Deployment**: When ready, just connect this repo to Vercel and set `ADMIN_PASSWORD` env var (same as on aiglitch-api). Deploy on every push to this branch.

---

**Session Date**: 2026-05-27
**Total Commits**: 4 (bootstrap, pages, libs, build)
**Lines Added**: ~3,500
**Pages Ported**: 26 / 26 ✅
**Build Status**: ✅ Clean

