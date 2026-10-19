# Open House QR sign-in and private attendees

Create an event for an owned, published listing → share its separate sign-in QR → a visitor signs in → only the listing owner can view the attendee.

The existing application, property-page QR, brochure artwork, photo positions and PDF formats are unchanged. No emails, SMS, CRM, campaigns, scoring, analytics, payments or team features were added.

## Use it — no installation required

After Vercel finishes deploying the latest main commit:

1. Open https://listory.ca and sign in.
2. Under **Listings**, choose **Edit Listing** on one of your own published listings.
3. Scroll below the listing form to **Open House**.
4. Enter **Date**, **Start time**, **End time**, and optional private event notes. All times are **Pacific Time (Vancouver)**, with start/end on the same day.
5. Click **Create Open House**.
6. The section displays the address, date/time, **Open House Sign-In QR**, **Copy Sign-In Link**, **View Sign-In Page**, and attendee count. This QR is deliberately separate from the Property Page QR.
7. If you have several events, select one under **Your Open Houses**.
8. Under **Attendees**, click **Refresh Attendees** to retrieve new sign-ins. Newest sign-ins appear first. **Load More Attendees** appears when more than 50 are available.
9. After the event, click **Close Sign-In**. Existing attendees remain saved; you can **Reopen Sign-In** using the same URL/QR.

For a new listing, generate its Marketing Package and **Publish Property Page** first. Then click **Back to Listing** and scroll to Open House. A draft or unconnected legacy listing cannot be used to create an event through the app; connect ownership and publish first.

Optional event notes are **private to the agent**, not visitor instructions. Visitor notes are also private. Public event branding comes from the listing's already-published branding, never the private account profile. Publish an updated property snapshot to change the branding shown to visitors.

## Visitor experience

The public URL is `https://listory.ca/open-house/<random-event-id>` (or the configured `NEXT_PUBLIC_SITE_URL`). It needs no Listory account.

The page shows a property photo, address, event date/time and the public agent branding. The visitor enters first/last name, email and phone; answers whether they work with a Realtor; chooses buyer/seller status; and can add a note.

The exact disclosure is visible above submission:

> By submitting this form, you agree that the listing agent may contact you regarding this property and related real estate services.

The visitor must actively check **I agree to this contact disclosure**. Nothing is prechecked. The server also requires consent; removing browser validation cannot bypass it. The saved record includes the disclosure version and server consent timestamp.

On success, **You’re signed in.** appears with **View Property**, linking to the listing's existing public property page. Signing in does not send any email/SMS or subscribe the person to a campaign.

## Database setup

The additive migration is [202610170002_open_houses.sql](../supabase/migrations/202610170002_open_houses.sql). It was applied to the connected Supabase project during implementation and the two tables were verified. **You do not need to run it again for this project.** For a future project, run it after `setup.sql` and the account migration.

If applying it elsewhere:

1. Open the migration on GitHub → **Raw** → **Ctrl+A → Ctrl+C**.
2. Supabase → your project → **SQL Editor → + → Create a new snippet**.
3. Paste with **Ctrl+V** and click **Run**.
4. Expected result: **Success. No rows returned**.

It adds:

- **`listory_open_houses`**: random event ID, listing slug, verified owner ID, date/time, timezone, private notes, open/closed state and creation timestamp.
- **`listory_open_house_attendees`**: attendee ID, event/listing/owner references, name, email, phone, Realtor answer, buyer/seller status, private notes, server sign-in/consent timestamps, disclosure version and a private abuse-throttling fingerprint.

Composite foreign keys require an event's listing and owner to match, and each attendee's event, listing and owner to match. New indexes support owner lookups, attendee ordering and throttling. No existing listing/profile/image/public-URL data is rewritten.

## Security

- Supabase Row Level Security permits signed-in owners to manage their own events and read their own attendee rows. Other agents cannot read this owner’s rows. Ownership/identity columns cannot be reassigned by the authenticated role.
- Anonymous users have **no raw table access**. Authenticated agents cannot directly insert/update attendee rows or invoke the server-only submission function.
- Private owner APIs validate the session with Supabase Auth, check the resource owner, then query using that user's JWT so database RLS also applies. The attendee API returns an explicit field whitelist, paginates and sends `private, no-store`; it never returns tracking fingerprints or privileged keys.
- Public pages query only an open event and its already-published property snapshot. They exclude attendee records/counts, private event notes, account email/IDs and private profile data. Public event pages are marked noindex and use no-referrer metadata.
- Public POST validates contacts, required answers, length bounds, consent, same-origin submission and a honeypot. Only the server may invoke `listory_submit_open_house`. The restricted function locks and reads the event/listing, derives the owner/listing IDs itself, checks open/published status, then inserts. It does not accept owner/listing IDs or timestamps from the visitor. Even malicious extra body fields are ignored.
- A duplicate email within the same event is an idempotent success, with no extra row or overwrite. Responses never disclose another attendee, attendee IDs or counts.
- Durable database throttling limits each event/source fingerprint to 30 new sign-ins per ten minutes and each event to 2,000 attendees. The fingerprint is a keyed hash scoped to the event; raw IP addresses are not stored. A row lock keeps concurrent state/rate checks and insertion atomic across Vercel workers. This is basic spam protection, not a replacement for a future CAPTCHA/abuse service.
- Closing sign-in or unpublishing the property prevents further public submissions while preserving existing attendance. Deleting an owned listing/event at database level cascades its dependent events/attendees; the UI's **Close Sign-In** does not delete anything.
- Attendee payloads and contact details are not logged by the application. The public client receives no Supabase secret, owner credentials or attendee collection.

## Vercel

**No new environment variables or services are needed.** The feature reuses the existing server-only Supabase connection and `NEXT_PUBLIC_SITE_URL`. Do not add a public service-role key. A main-branch push triggers the connected Vercel deployment; wait for **Ready** before testing the live UI.

## Test it yourself

1. Follow the owner steps above and create a test event on your own published listing.
2. Click **Copy Sign-In Link**. Open an InPrivate window (**Ctrl+Shift+N** in Chrome/Edge) and paste it. You should see the visitor form without signing into Listory. Also scan the **Open House Sign-In QR** with your phone camera.
3. Enter your own test contact details, answer both questions, read/check the disclosure and submit. You should see **You’re signed in.**
4. Click **View Property**. Your existing public property page should open.
5. Back in your signed-in owner window, click **Refresh Attendees**. Your test visitor should appear with all answers, notes and sign-in time.
6. In a separate browser profile, sign in to another test account. That account must not see your listing's management controls or attendees. Public viewing is still allowed.
7. Click **Close Sign-In** in the owner window, then reload the visitor page. It should show that sign-in is unavailable. Attendees should remain in your dashboard.
8. Generate both normal brochure PDFs. Their QR codes must still open the **property page**, not the Open House form.

## Boundaries and validation

This V1 uses Pacific Time and same-day events. Sign-in remains open until the agent closes it or unpublishes the property; it does not automatically close at the scheduled end time. Refresh is manual. Email/phone are format-validated, not verified by sending a code, and one email counts once per event. There are no public attendee lists, automated messages, exports, scheduling integrations or analytics.

Validation commands (Node 24, production build first):

- `npm run typecheck` and `npm run build`.
- `node --test scripts/open-house.test.mjs scripts/open-house-rls.test.mjs` checks form validation, forged relationships, SQL roles/RLS, repeatable migration, required consent, duplicate retries, rate limiting, closed/unpublished events and preservation of listings.
- `NODE_USE_ENV_PROXY=1 VERCEL=1 BROWSER_PATH=/usr/bin/chromium LISTORY_LIVE_STORAGE_TEST=1 npm run test:e2e -- --workers=1` runs the real-storage desktop/mobile checks plus the existing application regressions. A single test worker respects the existing PDF renderer’s two-job limit, including cleanup of a cancelled export. It creates isolated test users/listings/events/attendees and removes only those test records afterward.

The Open House browser test checks: owner creation, QR decoding and clipboard links, anonymous mobile sign-in, unchecked/mandatory consent, private notes excluded from public HTML, server rejection of cross-origin/missing-consent requests, idempotent retries, ignored forged ownership, newest-first attendees, 51-record pagination, denial to guests/another agent, raw database RLS, closing, property-page availability, and property QR decoding from both real PDF formats with no attendee data in the PDFs. Physical phones/printers are not connected to this workspace; a camera scan is included in the manual steps above.

Validation record: production build and TypeScript passed; all 26 distinct unit/database/package checks passed. Desktop/mobile coverage comprises 64 browser checks. The initial parallel run passed 62; a preview-scale measurement assumption and the existing two-render PDF concurrency limit affected two mobile tests. After normalizing the test's coordinates and running those PDF checks sequentially, both passed with all original visual assertions retained. No brochure or PDF application code was changed. All eight existing published property routes returned HTTP 200. Isolated test accounts, events and contact records were cleaned up.
