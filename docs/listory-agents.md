# Listory Agents workspace directory

## Use

Sign in, then choose **Listory Agents** below **Brand Profile** in the existing sidebar. On a phone open the navigation menu first. The workspace link is https://listing-kit-pink.vercel.app/#listory-agents.

Type in **Search Listory Agents**. Search updates after a short 200 ms pause, matches names first and also matches public team, brokerage and subareas. It is a literal, case-insensitive substring search, not a wildcard or ranking system. Stale search requests are cancelled so old results cannot replace a new search. No matches shows **No Listory agents found.**, with a Clear search action.

Cards show a square, undistorted headshot and name, with public team/brokerage when supplied. Missing or unreadable images have an initials fallback. Click a card to open its existing public Agent Portfolio in the same tab. No duplicate profile is created. The current agent can appear normally; they are not pinned or labelled using a public account identifier.

Use normal page scrolling with a wheel, trackpad or phone. Twenty-four results are loaded at a time in alphabetical name order with public slug as a stable tie-breaker. **Load More Agents** appends the next page. The query fetches at most 25 rows, using the extra result to decide whether another page exists. It never sends every account to the browser. If agents change their public name/visibility while someone is browsing, refreshing/searching again gives the current results; duplicate cards are filtered when appending pages.

## Eligibility and security

An entry requires all of:

- Existing Supabase Auth account and matching existing Brand Profile.
- Confirmed email; not deleted, anonymous or currently banned/disabled in Supabase Auth. An expired ban no longer disqualifies the account.
- Explicitly published portfolio with a valid public address.
- Non-empty first and last names. Headshot, biography, team, brokerage and contact fields remain optional as in the existing profile.

There is no subscription status or second agent-profile system. Hiding a portfolio or disabling/deleting an account removes it from subsequent directory requests. The directory does not change existing public portfolio visibility behavior or previously opened browser pages.

**GET /api/agents** verifies the session with Supabase Auth before querying. It is covered by the existing session-refresh Proxy and returns `Cache-Control: private, no-store` and `Vary: Cookie`. Logged-out callers get 401; the workspace redirects to sign-in. Search length and offset bounds are validated.

The entire card response contains only `slug`, `name`, `team`, `brokerage`, `headshot` (existing public portfolio asset URL) and `url` (existing portfolio URL), plus `nextOffset` for pagination. It never returns email, phone, private account metadata, Auth records/tokens/IDs, raw Brand Profile JSON, base64 images, bio, Open House data, drafts or ownership identifiers. Contact details intentionally published on the existing portfolio can still be viewed by opening that page, as before.

## Database and deployment

Run `supabase/migrations/202610170004_listory_agents.sql` after the previous portfolio migration. It adds **one read-only function**, `listory_directory_agents`, and changes no account/profile data, tables, columns or existing RLS policies. It joins existing profiles to Auth internally and returns only a safe public projection. Execution is revoked from PUBLIC, anon and authenticated roles and granted solely to service_role. The verified-session Next.js endpoint is its only browser-facing entry point. It uses SECURITY DEFINER with a fixed search path, bounded pagination and parameterized literal search; it cannot update records.

No new Vercel settings, services, packages or secrets are needed. Existing Supabase server credentials and site-origin configuration are reused. There is no public directory route/API access. Existing portfolio asset URLs remain deliberately public as they were before this feature.

## Validation and manual check

`node --test scripts/agents-directory.test.mjs` verifies the SQL in actual Postgres-compatible execution: active/private/banned/deleted/unconfirmed/anonymous/incomplete filtering, safe output columns, forbidden direct RPC execution, literal name/team/subarea search, bounded deterministic pagination and repeatable migration.

Live browser tests create only disposable test accounts and profiles, then clean them up. They verify session requirements, live Auth bans/deletion and portfolio visibility, safe responses, real headshot rendering, search and existing portfolio URLs. Presentation checks cover desktop/tablet/phone widths, wheel/page scrolling, 24→30 result pagination, actual card navigation, empty/error/retry states and cancellation of obsolete searches. Existing regression tests cover Brand Profile, accounts, listings, portfolios, Open House, property/PDF QR and brochures.

To check manually after Vercel is Ready:

1. Sign in and click **Listory Agents** (on a phone: menu → Listory Agents).
2. Search your name. If you have saved first/last names and published your portfolio, your card should appear with its saved headshot.
3. Click the card and confirm the existing portfolio opens. Use your browser Back button to return.
4. Search a nonexistent name to see the empty state; clear it to browse again. Scroll normally. Load More appears when more than 24 matching agents exist.
5. Open an InPrivate/Incognito window (Ctrl+Shift+N in Edge/Chrome) and paste the workspace link: it should ask you to sign in.
6. Optionally hide your own portfolio in Brand Profile, save, then search again: it should be absent. Restore public visibility afterward if desired.
