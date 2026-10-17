# Listory agent accounts — setup and handover

This update adds email/password agent accounts and verified ownership. It does not change brochure artwork, PDF dimensions, photo fitting, focal positions, property-page design or existing public URLs. It does not add Open House registration.

The account migration was applied and verified against the connected project on 17 October 2026. Do not repeat it for that project just to use the app. The instructions below are retained for future environments.

## One-time database step

The existing Supabase server connection can read/write records and use Authentication, but cannot execute database schema changes. A project administrator must run this once:

1. Open [the migration on GitHub](https://github.com/sminapour71/Listing-Kit/blob/agent-accounts/supabase/migrations/202610170001_agent_accounts.sql).
2. Click **Raw**, then press **Ctrl + A** and **Ctrl + C**.
3. Open your **Listory** project in Supabase. Click **SQL Editor** in the left sidebar.
4. Click **+ → Create a new snippet**. Click in the editor and press **Ctrl + V**.
5. Click **Run**. The expected result is **Success. No rows returned**.

This transaction is additive and repeatable. It does not delete listings or photos, rename slugs or assign old listings to whoever signs in first. Running it before deploying the account code is backward-compatible with the current live app. If an error appears, stop and share the error text without keys/passwords.

## Email links and Vercel settings

In Supabase, click **Authentication → URL Configuration**:

1. Set **Site URL** to `https://listing-kit-pink.vercel.app`.
2. Under **Redirect URLs**, click **Add URL** and enter `https://listing-kit-pink.vercel.app/**`. Save.
3. For a Vercel branch preview, also add that preview's exact origin followed by `/**`. Do not allow all Vercel websites.
4. Under **Authentication → Sign In / Providers → Email**, keep email/password signup enabled and **Confirm email** enabled.

The app uses Supabase's normal confirmation/reset emails. Their default templates work with the app's PKCE callback. Open those emails in the same browser where you requested them. If a confirmation link was opened elsewhere and your email is confirmed, return to Sign In. Request another recovery link in your intended browser if necessary. The callback also supports Supabase server email templates using a valid `token_hash` and `type=signup` or `type=recovery`.

Supabase's default email sender has recipient restrictions and delivery/rate limits. For agents beyond your own test addresses, configure a genuine SMTP sender in Supabase's email settings. Delivery into a real mailbox must be tested after these settings are saved; automated tests do not send mail to arbitrary recipients.

No additional Vercel environment variables or public Supabase keys are needed. Keep the existing **SUPABASE_URL** and **SUPABASE_SECRET_KEY** as server-only settings. **NEXT_PUBLIC_SITE_URL** should remain `https://listing-kit-pink.vercel.app` for production. Never prefix the privileged key with `NEXT_PUBLIC_` or paste it into chat/GitHub.

For an isolated Vercel preview, set **NEXT_PUBLIC_SITE_URL** to that preview's origin for the Preview environment and redeploy the branch. Production remains unchanged. Vercel environment changes need a redeployment.

## Connect your earlier branding and listings

After the account version is deployed to your existing production domain:

1. Open Listory in the **same browser and browser profile you originally used**, at `https://listing-kit-pink.vercel.app`.
2. Click **Create an account**. Enter your email and a new password of at least eight characters. Click **Create Account**.
3. Open the confirmation email in that browser, then sign in.
4. Open **Brand Profile**. If your old branding is detected, click **Import Browser Brand Profile**. Review the form, then click **Save Brand Profile**. The original browser copy remains intact.
5. Open **Listings**. For each entry under **Connect your earlier listings**, check **I own this listing…**, then click **Connect Listing to My Account**.
6. The listing appears in your account with **Edit Listing**. Its public URL, property data, photos, published status and QR destination are unchanged.

Each connection requires both a signed-in account and the correct original browser proof. The database atomically associates that specific unowned row with your user ID and clears its old secret hash. The old local entry is removed only after successful connection. Another account cannot claim the same listing or use that old key to edit it.

If your original browser data is missing, do **not** create replacements just to reclaim URLs. The project administrator can use [the explicit fallback](../supabase/admin/assign-legacy-listings.sql): replace its account-email placeholder with your confirmed signup email and list only the exact property slug(s) you own. Run it in SQL Editor after verifying each listing. Its untouched placeholders refuse to run, and it refuses to transfer any listing already owned by someone else. It does not bulk-assign arbitrary legacy records.

Unconnected legacy listings remain publicly readable and unchanged. They cannot be managed by the new app until safely connected. Old app deployments should be retired after upgrading; the old code intentionally remains functional until the migration/deployment is complete.

## What changed technically

- Supabase Authentication supplies a stable `auth.users.id`. Passwords stay in Supabase Auth, not a Listory table. Sign In, Create Account, Forgot Password, Reset Password and Sign Out use server endpoints.
- Browser sessions use HttpOnly, SameSite=Lax cookies, Secure on real websites. Session tokens are not written to localStorage or exposed to client JavaScript. The proxy refreshes sessions; each protected page/API independently verifies the user with Supabase Auth.
- `listory_agent_profiles` contains `id` (linked to `auth.users`), the existing Brand Profile fields in private `brand` JSON, and creation/update timestamps. The account email comes from Auth; the public contact email can be different. There is one reusable profile, not competing profile systems.
- `listory_properties.owner_id` links to `auth.users`. It is nullable only for unclaimed legacy rows. `management_hash` becomes nullable; original legacy proofs remain until explicitly claimed. No existing row data is replaced by the schema migration.
- PostgreSQL Row Level Security allows authenticated agents to select/insert/update/delete only their own listings and profile. Listing ownership/hash columns cannot be updated by the authenticated role. Normal management requests always send the verified user's JWT to the database, rather than privileged service-role authorization.
- The server verifies ownership before image upload, asset restoration, updates and unpublishing. A client-supplied owner ID, slug, localStorage entry or legacy header cannot grant access.
- Raw tables are closed to anonymous users. Public property pages use the server's explicit **published snapshot** projection (listing, public brand, sample flag, slug/status), never private profile/account/ownership/hash fields. Public photo URLs remain deliberately public, as before.
- The dashboard reopens account-owned saved listings. Restored photos and brand assets become local blobs through an owner-checked endpoint, preserving existing dimensions/focal data and compatibility with the unchanged PDF exporter.
- The one-time legacy-claim function requires a verified auth ID and matching proof. It never authorizes normal edits, and never reassigns a row to another owner.

## Test it yourself after deployment

1. **Account:** Create Account → confirm email → Sign In. Refresh; you should remain signed in. Use **Forgot password?**, open the recovery email in the same browser and save a different password.
2. **Ownership:** Create a uniquely named listing, upload photos and generate its Marketing Package. Publish it. Return to Listings: it should appear with **Edit Listing**.
3. **Public access:** Copy its link, Sign Out, then open the link in an InPrivate window (**Ctrl + Shift + N** in Chrome/Edge). The property page should work without signing in.
4. **Resume:** Sign back in, open **Edit Listing**, change a detail and publish again. The same public URL should update.
5. **Second account:** In a separate browser profile/InPrivate window, sign into a different account. The first account's listing/profile must not appear there. Opening a public link is allowed; private edits are denied.
6. **Legacy:** Connect an original listing using the explicit process above. Test its old link and scan its existing QR code; both should still open that property.
7. **Brochures:** Generate both **Standard 8.5 × 11** and **Folded 11 × 17** PDFs, also after reopening a saved listing. Check photos, branding and QR links. Letter remains four portrait pages; Folded remains two landscape pages, outside [4|1], inside [2|3].

## Automated checks and boundaries

- `npm run typecheck` and `npm run build`.
- `node --test scripts/auth-rls.test.mjs scripts/auth-options.test.mjs scripts/photo-fitting.test.mjs scripts/brochure-layout.test.mjs scripts/site-url.test.mjs` tests real PostgreSQL roles/RLS with PGlite, migration repeatability, cross-account denial, explicit claims and shared artwork rules.
- `node --test scripts/check-pdf-bundle.test.mjs` tests the built PDF deployment bundle in isolation.
- `NODE_USE_ENV_PROXY=1 VERCEL=1 BROWSER_PATH=/usr/bin/chromium npm run test:e2e` tests real Supabase sessions plus browser/print regressions. Presentation tests explicitly mock account API data, using isolated test identities and genuine sign-in; they are not evidence of live database RLS.
- Add `LISTORY_LIVE_STORAGE_TEST=1` after the migration to run the real two-account publishing/resume/public-page/QR/PDF integration tests. These create and remove only uniquely identified test accounts and their listings/assets. Never point cleanup at normal users.
- `playwright.live.config.ts` runs just the opt-in real publishing checks. `playwright.accounts.config.ts` runs the focused real-auth checks; `playwright.visual.config.ts` runs the presentation suite. Production build first; port 3100 must be available unless the selected focused config reuses the test server.

Unsaved edits/uploads remain in the current tab until publishing; this task does not add autosave. Reopening a published listing uses its saved website images (up to 2400 pixels), so reupload original print photos if additional resolution is needed. Existing Vercel PDF/image size limits still apply. The dashboard currently lists the latest 100 owned records plus labelled sample cards. Unpublishing does not erase intentionally public image URLs or already downloaded PDFs. None of these limitations introduce a new public/private data boundary.

### Validation record — 17 October 2026

Verified the production build, TypeScript, isolated PDF deployment bundle, PostgreSQL/RLS migration tests, all 50 desktop/mobile presentation checks, and 12 real account/publishing checks across desktop/mobile (including the corrected focused RLS test). Real tests confirmed email-proof confirmation, password recovery, refresh/logout, HttpOnly sessions, owner-only publication and restored assets, cross-account denial, one-time legacy claims, anonymous property viewing, and decoded QR destinations in both PDF formats. The final data audit found all eight original published rows present and none automatically assigned. No real mailbox or physical printer was tested.
