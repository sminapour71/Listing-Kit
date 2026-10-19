# Agent portfolios and safe listing deletion

## Setup

Run `supabase/migrations/202610170003_agent_portfolios_safe_delete.sql` in Supabase SQL Editor after the account and Open House migrations. It is transactional, repeatable and does not publish profiles or delete existing records. No additional packages, services, secrets or Vercel settings are needed. Existing `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and optional `NEXT_PUBLIC_SITE_URL` are reused. The production fallback is https://listory.ca.

## Using your portfolio

1. Sign in and open **Brand Profile**. Save your contact details, images and colours using **Save Brand Profile**.
2. Scroll to **Your Agent Portfolio**. Enter a biography, up to five distinct free-text subareas and a public address. The address starts from your saved name and can be edited; it is checked before saving and protected by database uniqueness.
3. Select **Show my portfolio publicly** and click **Save Portfolio**. Copy/open the exact link displayed there. With the address `shahin-mina-pour`, the URL is https://listory.ca/agent/shahin-mina-pour. This address is an example until saved by its owner.
4. Choose up to six published homes under **Featured listings**. Checkbox changes save immediately. Published featured homes appear above Current Listings; no empty featured heading appears. Current Listings includes every published listing owned by this agent (including featured homes), never drafts, samples owned by someone else or unassigned legacy listings.
5. Each property page links to its owner's public portfolio, when enabled. A renamed portfolio keeps its old address as a redirect, reserved to that owner. Unchecking public visibility and saving hides the page and profile asset endpoints.

The public page reuses the authoritative saved Brand Profile. Saving Brand Profile later updates the portfolio, but does not rewrite existing published property snapshots/brochures. There is no duplicate agent profile or directory. Subareas are flexible text, not Area Pages.

## Safe deletion

Open one of your saved listings with **Edit Listing**, scroll below Open House, and click the separate **Delete Listing** button. Review the saved address and counts, type exactly `DELETE`, then click the final **Delete Listing**. **Keep Listing** cancels. The server verifies the signed-in owner, same-origin request and exact confirmation; an optimistic version check rejects deletion if the listing changed while the modal was open. Unpublish remains a separate reversible action.

Deletion removes the property row (including snapshot, saved brochure source and legacy management hash), its featured flag, all related Open House events and all their private attendee records in one database transaction. Existing composite foreign keys cascade both levels. Public property/sign-in pages become unavailable. A slug-only retirement record prevents a future property from taking that URL, protecting old QR codes. The workspace drops the editor state and removes only matching legacy browser keys.

Storage image binaries are deliberately retained: shared/public URLs might still be used elsewhere. They are no longer referenced by the deleted property record, but previously known public image URLs remain accessible. This is not a secure erasure of already-public photographs. PDFs already downloaded, browser copies, third-party caches, the agent's Brand Profile, other listings and unrelated events/attendees are not removed. No PDF files are stored by Listory.

## Database and privacy

- Existing `listory_agent_profiles`: add `portfolio_slug`, `portfolio_bio`, `portfolio_subareas`, `portfolio_published`. Existing owner-only RLS applies to every field. Default visibility is private.
- `listory_agent_slugs`: slug reservations/rename aliases, FK to existing profile. Owner can read only their reservations; no authenticated writes; security-definer validation trigger reserves slugs. Anonymous access revoked. Slugs cannot be UUID-shaped, malformed or duplicated; biography max 4,000 characters; at most five distinct subareas of 80 characters.
- Existing `listory_properties`: add boolean `portfolio_featured`; grant owner-scoped select/update on that column. Existing ownership RLS remains. Trigger serializes additions using the profile row lock and enforces six, published-only additions. An unpublished flagged listing remains selected privately, counts toward six and never appears publicly; unfeature it to release the slot.
- `listory_deleted_property_slugs`: slug and deletion timestamp only, service-only table with RLS enabled. Trigger records deleted slugs and prevents their reallocation.
- `listory_delete_owned_property`: security-invoker RPC, authenticated-only, calls `auth.uid()`, exact confirmation, expected version, existing owner RLS and atomic cascades. Trigger functions have fixed search paths and no public execution grants.
- Private profile/feature/deletion requests always use the verified agent JWT and never accept an owner ID from the browser. Public server queries use explicit projections and owner/published filtering; auth IDs are never returned to public components. Public data excludes account email, drafts, private notes and attendees. Profile images are served through public, visibility-checked, whitelisted JPEG/PNG/WEBP endpoints instead of embedding large base64 images in the page.

## Verification

`node --test scripts/*.test.mjs` includes actual Postgres-compatible RLS, alias collision, field validation, max-six, cross-owner access, stale/incorrect confirmation, deletion cascade and retired URL tests.

After `npm run build`, run:

```
NODE_USE_ENV_PROXY=1 VERCEL=1 BROWSER_PATH=/usr/bin/chromium LISTORY_LIVE_STORAGE_TEST=1 npm run test:e2e -- --workers=1
```

These cloud-specific settings use the configured HTTPS proxy and local Chromium. Live tests provision isolated disposable accounts/data and clean up only their own records and image paths. One worker avoids overlapping memory-intensive PDF exports. Portfolio coverage includes private/public opt-in, copy/open link, brand preservation, slug conflict/rename, responsive public images/cards, published-only selection, feature/unfeature, forged identity, two-stage deletion/cancel/version, attendee cascades, unrelated listing survival and retired URL reuse denial. Existing regression suites exercise QR decoding in real Letter/Folded PDFs, property pages, Open House, auth, focal positions and brochure layouts.
