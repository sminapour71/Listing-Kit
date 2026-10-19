# Fresh Listings and listing promotion

Fresh Listings lives at `/fresh` and works without signing in. Links are added on Sign In and Agent Portfolios. Existing property pages, QR destinations, ownership, image handling, Open Houses and PDF exports retain their existing routes and implementations.

## Timing

The first successful publication sets `first_published_at` once in a database trigger, using database time. Fresh means less than 168 elapsed hours since that instant, and still published and Current. At exactly 168 hours, Fresh ends. Edits, unpublishing, republishing and extensions never restart that clock.

First publication sets `current_until` to 720 elapsed hours (30 days) later. Before that instant the home is Current (with Fresh taking precedence as a display label during the first seven days). At that instant it is Past. No cron or database label update is required. Display dates use Pacific time; the underlying timestamps are timezone-aware instants. Future explicit sale statuses can be evaluated before this promotion classifier without changing publication status.

Owners can select Extend 30 Days for Fresh/Current listings. The database adds 720 hours to the existing expiry, not today's date. The call verifies ownership and the expected previous expiry atomically, so a stale duplicate request cannot extend twice. It cannot extend a draft, another agent's home, or an already Past home. Restarting Past promotion is intentionally outside this feature. Within five days of expiry, the dashboard shows a countdown. Past is neutral and never means sold, cancelled or expired in an MLS sense.

Past homes remain published at their original URLs, so printed QR codes continue to open them. They remain editable in the owner's account with all property assets. They leave Fresh and Featured/Current portfolio sections and appear in a clickable Past Listings section. The Past section is omitted when empty.

## Migration and legacy homes

Run `supabase/migrations/202610190001_listing_lifecycle.sql` in Supabase SQL Editor **before deploying the application code**, after the existing four migrations. It is additive and repeatable. It adds:

- `first_published_at timestamptz` (nullable)
- `current_until timestamptz` (nullable)
- `publication_date_unknown boolean not null default false`

The original property schema contains only `updated_at`; edits and legacy claims change it. There is no trustworthy original publication timestamp. Existing published rows are therefore marked `publication_date_unknown=true`, with both dates left null. They behave as Past, keep their public URLs and assets, and do not appear Fresh. Existing drafts get real dates on their first publication after migration. Previously published legacy homes stay unknown even if unpublished and republished.

If a legacy home's original publication date is independently verified, a database administrator can backfill that exact date and its original 30-day expiry in a maintenance transaction, temporarily disabling only `listory_publication_dates`, then re-enabling it before committing. Never use `updated_at` or migration time as a substitute. No legacy dates were invented or backfilled by this change.

No live migration is executed by the application. A Supabase REST secret does not provide arbitrary SQL execution. No new Vercel environment variables are needed; retain the existing server-only Supabase configuration and `NEXT_PUBLIC_SITE_URL`. Deploy the code after the SQL migration. Migration alone takes legacy homes out of active promotion when the new code is deployed, so review that policy before release.

## Public data and permissions

Existing owner RLS stays unchanged. Authenticated users receive SELECT permission on the three new fields but no direct INSERT/UPDATE permission for them. Only the owner-scoped, fixed-amount extension RPC changes expiry for clients. Its execution is denied to anonymous users. First publication history is protected by the trigger.

The server-only `listory_fresh_listings` view projects address, price, beds, baths, size, cover photo, publication/expiry timestamps and public agent name/portfolio slug. It joins Auth internally to exclude missing, unconfirmed, deleted, banned or anonymous owners. It does not expose owner IDs, auth records, private profiles, management tokens, notes or attendees. Direct anonymous and authenticated access to the view is revoked; only the existing server credential can read it. Public pages receive the projected fields only. No browser secret is introduced.

Fresh results sort by first publication descending and paginate 24 homes at a time. V1 filters support address/location text, minimum bedrooms, and numeric price bounds. Price comparisons omit nonnumeric prices such as “Contact agent” when a numeric bound is selected. There is no reliable property-type, city or neighbourhood field, so no invented type or neighbourhood filters are added. Location searches match the stored address.

## Verification

Automated database tests: `node scripts/listing-lifecycle.test.mjs`. Existing security/logic tests remain in `scripts/*.test.mjs`. Production verification: `npm run typecheck` and `npm run build`.

Before production release, run the migration in a staging Supabase project and test:

1. Publish a new owned home. Confirm one first-publication timestamp and an expiry exactly 30 days later; find it logged out at `/fresh`.
2. Edit and republish it. Both lifecycle dates should stay unchanged.
3. In staging only, use admin SQL with the publication trigger temporarily disabled to simulate first publication eight days ago and a future expiry. It must disappear from Fresh but stay Current. Restore the trigger in the same transaction.
4. Extend Current promotion. Confirm exactly 30 days added to its old expiry and no change to first publication. It must not re-enter Fresh. Retry the same old expiry request; it must fail rather than extend twice.
5. Simulate expiry four days away. Check the dashboard reminder and extension button.
6. Simulate elapsed expiry. Confirm Past dashboard/portfolio classification; absence from Fresh and Featured/Current; and the original public link and scanned QR still opening the same home. It must not say Sold.
7. Confirm drafts, unpublished, deleted and unowned properties never appear in Fresh. Sign in as another agent and verify extensions are denied. Inspect public HTML for owner IDs, tokens, private notes and attendee information.
8. Test filters, newest-first ordering, agent links and mobile/tablet/desktop layouts. Check a portfolio with no Past homes has no empty Past section.
9. Confirm Listory Agents search, Open House QR sign-in/private attendee lists, brochures/PDF exports, focal photo positioning and safe deletion still work.
10. Confirm legacy homes remain public and Past/undated, retain ownership/assets, and never appear as newly published.
