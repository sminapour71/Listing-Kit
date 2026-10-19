# Public Listory site

The root `/` is now a public editorial homepage. It includes a property discovery form, a Fresh Listings scroll row, participating agents, Open Houses Today, and clearly labelled future guide categories. Existing Listory photography is decorative in the hero; no fictional listing or article is published.

## Routes and navigation

The shared public header and footer link to `/buy`, `/agents`, `/fresh`, `/open-houses`, `/guides`, `/neighbourhoods`, `/for-agents`, and the existing `/sign-in`. Header/footer logos link home. Public property pages, portfolios and Open House sign-in pages retain their existing URLs and contents inside the public navigation shell. Authentication-page logos also link home.

The protected workspace moves from `/` to `/workspace`. Its existing hash views, tools and APIs are retained. Known old root hash links, such as `/#brand-profile`, forward to `/workspace#brand-profile`. Sign-in, sign-up confirmation and password recovery return to the protected workspace using the existing strict return-path allowlist, updated for the new path. Guests at `/workspace` are sent to Sign In. A logged-in visitor can still view the homepage; the public header/footer show Workspace instead of Sign In after server-side identity verification.

No private tool becomes public. Listing edits, Brand Profile, internal Listory Agents, attendee management, portfolio edits, deletion and settings remain behind workspace authentication and owner RLS. `/api/agents` retains its authentication requirement; public discovery uses a server-only helper rather than exposing that private endpoint.

## Existing data, safe projections

- Fresh homepage cards call the exact same `getFreshListings` helper and database view as `/fresh`, with the same seven-day eligibility and expiry rules. Up to eight appear on the homepage, linked to existing property pages. View All opens `/fresh`.
- `/buy` selects published owned homes whose persisted `current_until` is still in the future, using the existing property table. Only the public card fields are selected/returned. Draft, unowned and Past homes are excluded. Results support address/location, minimum bedrooms and numeric price filters; they paginate 24 homes at a time and sort by first publication.
- Homepage and `/agents` reuse the existing service-only `listory_directory_agents` function. It checks active confirmed accounts, published portfolios and discovery eligibility. The mapping returns only public names, team/brokerage, portfolio slugs and headshot asset links. Search by name, team, brokerage and portfolio subareas is the existing SQL search, not a new profile system. The private workspace directory uses the same helper while retaining its authenticated API.
- Open Houses Today selects open existing events dated today in `America/Vancouver`. The current Open House system already fixes all events to that zone. It shows the day's events (including earlier time slots), in start-time order, on published owned properties still in their Current promotion period. Past/unpublished properties and closed events are excluded from discovery. Old sign-in/property URLs are unchanged. Only event ID/date/times/zone and public property-card information are selected; never notes, owner IDs, attendee counts or attendees. Cards open existing property pages.
- Missing real content produces honest empty states. Service failures produce unavailable messages, not fabricated data. Guides and Neighbourhoods are coming-soon routes with no CMS, fake articles or legal documents.

## Database and deployment

No schema, migration, RLS or environment-variable changes are introduced by this feature. The already-installed account, portfolio, directory, Open House and lifecycle migrations are prerequisites. No existing migration is edited.

This work stays on `feature/fresh-listing-lifecycle`. Do not push while deployment is on hold: this repository's Vercel integration may create a Preview deployment even for a feature-branch push. Nothing should merge to main or be promoted to production without the requested review.

## Checks

- `npm run build -- --webpack`: supported production build for this cloud runtime, where Turbopack's internal local port can be restricted.
- `node scripts/public-discovery.test.mjs`: Pacific midnight/DST and filter handling.
- `node scripts/auth-options.test.mjs`: protected return-path allowlist, legacy destinations, secure cookie options.
- Existing lifecycle, account/RLS, portfolio/RLS, directory, Open House/RLS, photo-fitting, brochure and PDF packaging checks remain applicable.
- `LISTORY_LIVE_STORAGE_TEST=1 NODE_USE_ENV_PROXY=1 BROWSER_PATH=/usr/bin/chromium npx playwright test --config=playwright.public.config.ts`: logged-out desktop/mobile public pages, menu/keyboard/overflow, live isolated listing and agent cards, Fresh carousel, today events, private attendee data exclusion, existing links, signed-in navigation and private workspace. Only newly provisioned test identities and their data are removed afterward.
- `LISTORY_LIVE_STORAGE_TEST=1 NODE_USE_ENV_PROXY=1 BROWSER_PATH=/usr/bin/chromium npx playwright test --config=playwright.regression.config.ts`: the 72 existing desktop/mobile browser checks, serialized for stable PDF rendering.
- Existing browser regressions now open `/workspace` instead of `/`; assertions on brochure design, photos, PDFs, privacy and ownership remain intact.

Before merging, verify both anonymous and authenticated navigation at desktop, tablet and mobile widths; existing property/portfolio/QR destinations; real Fresh and Current results; public agent search and headshots; Pacific-date events and absence of attendee details; and sign-in/recovery/old workspace links.

## Validation record

The final production Webpack build and TypeScript checks passed. All 37 relevant logic, security and PDF-package checks passed. The 72 existing desktop/mobile browser checks were exercised: 66 passed on the initial run; six failures identified an overlapping new footer class and outdated workspace/filter expectations. After isolating the new footer styles and updating those expectations, all six passed against the final build. The four new public-site desktop/mobile tests also passed against the final build, including actual touch swiping, horizontal mouse-wheel browsing, card destinations, live isolated events/attendees, public-data privacy, authenticated navigation, and legacy hash changes. Test-owned public portfolios/listings/drafts were cleaned up; no migrations or deployment were performed.
