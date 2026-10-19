# Yaletown neighbourhood guide

Route: `/neighbourhoods/yaletown`. Branch: `feature/yaletown-neighbourhood-guide`.
The neighbourhood index keeps its existing layout and links to the first guide.
Production is not changed by this feature branch.

## Film

User-supplied `Yaletown_Listory_Background_Web_720p.mp4`: H.264, 1280×720,
30 fps, 15.5 seconds, approximately 5.1 MB. Remuxed with `-c copy -movflags
+faststart`; video quality is unchanged. No audio track is present.
Public assets live in `public/media/yaletown/`.
`poster.webp` is extracted at 10 seconds; `old-yaletown.webp` at 1 second.
The waterfront still is intentionally not attributed to a specific park.
The park artwork is original decorative illustration, explicitly not a map.

The hero uses 100svh, object-fit cover, muted looping inline autoplay and no native
controls. Centered crop is 50%/55% desktop, 53%/53% mobile to retain the central
street/water subject. A subtle dark green overlay provides contrast. A small
pause/play button makes ongoing motion controllable. On autoplay refusal the
poster remains visible; on media failure it remains the fallback. Reduced-motion
visitors never mount/request the video and see the extracted poster. Changing the
preference at runtime removes/pauses video. Only one video is loaded; editorial
images are lazy-loaded. The shared public header opts into the overlay only on
this page and returns to its usual cream styling after the hero. No second nav.
The existing refresh-only proxy matcher includes neighbourhood child routes, so
the new page retains the same private/no-store and session refresh behavior.

## Data and security

No migrations, RLS changes, new credentials or public endpoints.

- Fresh reuses `getFreshListings()` and the existing `listory_fresh_listings` view.
- Current reuses `getCurrentListings()` and its existing ownership/publication and
  current_until filters. Legacy unknown/Past homes stay out of discovery.
- Open houses reuse `getOpenHousesToday()` for Pacific today, open events and
  Current published homes. No attendees, event notes or attendee counts are read.
- The schema has no dedicated listing neighbourhood field. Include only published
  addresses with an exact comma-delimited Yaletown component and an explicit
  Vancouver city component. No guessed street boundaries/postcodes/descriptions.
- Agents first pass the existing service-only directory RPC (confirmed active
  accounts with published valid portfolios). Directory free-text search can
  match names/brokerages as well as specialties, so a second server-only query
  reads only portfolio_slug and portfolio_subareas for those eligible candidates.
  Require an exact trimmed, case-insensitive Yaletown specialty. Cards receive
  only the existing public directory fields and public headshot URLs. No auth
  rows, IDs, subarea arrays or private profile fields are sent to the browser.
- All data sections query in parallel behind Suspense. Editorial content is not
  blocked by inventory; independent failures show an error, successful zero
  results show the normal neighbourhood empty state. Card counts are limited to
  six per home/event section with links to existing discovery pages.

## Editorial sources (checked 19 October 2026)

- City of Vancouver, Downtown / Yaletown history:
  https://vancouver.ca/news-calendar/downtown.aspx
  Name from Yale; railway equipment/repair shops; planned eight-block warehouse
  district in 1900; recognized loading docks/canopies; loft conversions.
- Vancouver Heritage Foundation, Yaletown Historic Area:
  https://www.heritagesitefinder.ca/area/yaletown-historic-area
  Railway origins and the transition from industry to residential uses.
- Destination Vancouver, Yaletown and neighbourhood overview:
  https://www.destinationvancouver.com/neighbourhoods/yaletown
  https://www.destinationvancouver.com/inspirations/city/vancouver-neighbourhoods-yaletown
  Warehouse character, restaurant/patio streets, lofts, waterfront and marina life.
- City of Vancouver park finder:
  https://app.vancouver.ca/ParkFinder/parks/16 (David Lam)
  https://app.vancouver.ca/ParkFinder/parks/225 (George Wainborn)
  https://vancouver.ca/parks-recreation-culture/parks-gardens-and-beaches.aspx
  David Lam: 1300 Pacific Boulevard, recreation and False Creek views.
  George Wainborn: 450 Beach Crescent, lawns, water feature, waterfront setting.
- City seawall map and overview:
  https://vancouver.ca/files/cov/seawall-printable-map3.pdf
  https://vancouver.ca/parks-recreation-culture/seawall.aspx
  False Creek/English Bay waterfront connections. No travel times claimed.

No individual loft-building dates, amenities, market statistics, rankings or MLS
claims are published. Descriptions of pace/atmosphere are editorial observations.

## Validation

`node --test scripts/neighbourhoods.test.mjs scripts/public-discovery.test.mjs scripts/auth-options.test.mjs scripts/agents-directory.test.mjs scripts/listing-lifecycle.test.mjs scripts/auth-rls.test.mjs`

`npm run build -- --webpack`

`NODE_USE_ENV_PROXY=1 BROWSER_PATH=/usr/bin/chromium npx playwright test --config=playwright.yaletown.config.ts`

Existing public and regression configs cover the unchanged homepage, property,
portfolio, account, PDF/QR, Brand Profile and Open House flows. Live regression
fixtures use isolated disposable identities and clean up only their own data.

Validation result: production Webpack build and TypeScript passed. All 72 existing
regression browser cases passed. All four public-site scenarios passed with the
new positive/negative Yaletown fixtures. All four guide cases passed (the mobile
image case was rerun after teaching the harness to scroll lazy images into view
and route public storage through the managed network). Desktop/mobile playback,
pause, landscape viewport, navigation and reduced-motion no-video-request checks
passed. Focused logic, RLS, lifecycle, portfolio, Open House and PDF-bundle tests
passed. Read-only cleanup audit found zero remaining public-guide test portfolios
or listings. No production deployment or database migration is part of this work.
