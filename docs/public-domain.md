# Public production URL: listory.ca

## Central configuration

`app/lib/site-url.ts` is the only production-origin authority. Its former fallback
was `https://listing-kit-pink.vercel.app`; the fallback is now `https://listory.ca`.
The existing optional `NEXT_PUBLIC_SITE_URL` overrides it. It is public
configuration, not a credential. Both client and server use this helper.
Vercel's automatic domain variables, Host headers and the current browser origin
are deliberately not used to generate share/QR/SEO URLs. Current origins remain
in use for same-origin request protection and local image-export safety.

Read-only Vercel inspection found no NEXT_PUBLIC_SITE_URL override. No new variable
is required. For explicit configuration, Vercel → Listory → Settings → Environment
Variables → add/update `NEXT_PUBLIC_SITE_URL` to `https://listory.ca` for Production
and Preview, then redeploy the corresponding environments. Do not prefix any
Supabase privileged credential with NEXT_PUBLIC_. Do not change either existing
server-only Supabase variable.

Only intentionally isolated previews should use a branch-specific Preview
NEXT_PUBLIC_SITE_URL override pointing to that preview's origin. Such an override
changes the destinations of its generated public links. This feature Preview uses
the canonical listory.ca default; its local navigation remains on the preview.

## URL consumers audited

- `propertyUrl()` and `productionOrigin()`: property-create/read/publish/claim
  API URLs, legacy claim responses, property links from portfolios, and the
  View Property confirmation after an Open House sign-in.
- `PublishProperty`: generates the displayed Property QR from publication.url;
  Copy Link and View Property use that same URL.
- `MarketingPackage` and the PDF exporter: embed the property QR generated above
  in both Letter and Folded brochures. PDF_ASSET_ORIGIN is an intentionally
  isolated rendering origin, not a public share destination, and is unchanged.
- `portfolioUrl()`: portfolio settings Copy/View actions, workspace directory
  cards, property-to-agent links and portfolio canonical metadata.
- `eventUrl()`: Open House API responses, Copy Sign-In Link, View Sign-In Page
  and the separate Open House Sign-In QR.
- `app/api/auth/[action]`: signup/reset callback URLs also use siteOrigin().
- `app/layout.tsx`: metadataBase now comes from siteOrigin().
- `app/lib/public-metadata.ts`: canonical and Open Graph URLs for homepage, Buy,
  Fresh, Agents, Open Houses Today, Guides, Neighbourhoods and For Agents. Search
  and pagination query parameters do not become canonical URLs. No root canonical
  is inherited by every child; each public page supplies its own route.
- Published property and portfolio metadata already used the central helper and
  now point at listory.ca. Sample noindex flags remain unchanged. Open House
  sign-in remains noindex; login/private pages do not inherit a public canonical.
- Relative navigation, contact/Instagram links, Supabase asset URLs, HTTP request
  origins, and PDF's local asset sandbox are not production-base configuration.

## Supabase Auth configuration check before release

The app already derives confirmation/recovery callbacks from siteOrigin(). In
Supabase → Authentication → URL Configuration, check Site URL is `https://listory.ca`
and that the redirect allowlist permits `https://listory.ca/auth/callback**`.
Keep existing legacy/Vercel callback entries for older emails. Exact origins may
be added for deliberately isolated previews; do not allow arbitrary Vercel hosts.
These settings and actual email delivery cannot be verified from the server-only
REST credential. No Supabase settings are changed by this branch. Start new
confirmation/recovery flows on the intended domain and use the same browser.

## Existing URLs and printed QRs

No routes, slugs, event IDs, portfolio aliases, stored assets, database data or
Vercel domain settings are changed. Canonical metadata does not redirect visitors.
Already downloaded PDFs and printed QRs keep their original encoded destinations.
Keep the existing Vercel aliases attached to this project; do not remove them.
Old property/portfolio/Open House paths continue to resolve on those aliases as
long as the underlying resource remains published/open under existing rules.
Opening a saved property after release obtains a newly constructed listory.ca
URL from its normal API; regenerating its QR/PDF uses that URL. No stored URL or
old PDF is rewritten.

## Branch scope and validation

Updated from production main (including the released Yaletown guide) on
`feature/listory-production-domain`. Yaletown guide files and metadata remain
identical to main; the neighbourhood index retains its guide link plus canonical
metadata. No production merge/deploy,
new database migration, credential or visual change is included here.

`node --test scripts/site-url.test.mjs scripts/auth-options.test.mjs`

`npm run build -- --webpack`

`NODE_USE_ENV_PROXY=1 BROWSER_PATH=/usr/bin/chromium LISTORY_LIVE_STORAGE_TEST=1 npx playwright test --config=playwright.regression.config.ts agent-accounts.spec.ts agent-portfolio.spec.ts agents-directory-layout.spec.ts open-house.spec.ts property-publishing.spec.ts public-domain.spec.ts`

The live suites create disposable accounts/properties/events and clean up only
their own records. They decode property QR codes in both PDF formats, decode the
Open House QR, exercise portfolio clipboard URLs and preserve attendee privacy.
The canonical test uses existing published public pages without changing them.

Final validation: production build and TypeScript passed; all 13 script test
files passed (`node --test scripts/*.test.mjs`); all 26 relevant desktop/mobile
browser tests passed, including Yaletown guide and reduced-motion regressions. Next.js normalizes the root canonical to
`https://listory.ca` without a trailing slash. Existing public property and
portfolio URLs returned successfully on both listory.ca and the old Vercel
alias. Delivered auth emails and the Supabase Auth redirect allowlist still
require the manual checks described above.

Main synchronization: merged `fc7547623923dd589d97afe10c61db8df2542940`.
The only conflict was the neighbourhood index; retained main’s complete guide
introduction/link and the domain branch’s canonical metadata helper. The PDF
bundle check was rerun successfully after the production build finished.
