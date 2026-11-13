# Listory Brochure Studio

## Existing system audited before implementation

- `brochure-paper.tsx` provides four Letter panels: cover, property story/photos,
  floor plan/specifications, Realtor/contact/QR. Its complete-data artwork and page sequence are retained.
- `brochure-preview.tsx` fits fixed 816 × 1056 CSS-pixel sheets, using the same
  fitting policy as the isolated Chromium PDF renderer.
- `export-brochure.tsx` serializes artwork and same-origin/blob images only.
  `/api/brochure-pdf` sanitizes markup, embeds local fonts, blocks external requests,
  checks printable fit and emits vector-text PDFs. Existing payload limits remain.
- Letter output is four 612 × 792 point pages. Folded output is two 1224 × 792
  point pages: outside `[back, front] = [3,0]`, inside `[1,2]`.
- `getBrochureStyles` supplies brand colours and contrast. `PropertyPhoto` and
  `photo-position-editor` implement aspect-aware fitting and normalized focal points.
- Floor-plan uploads are rasterized by the existing image preparation system.
- `PublishProperty` generates the property QR from the published URL; `siteOrigin`
  keeps `https://listory.ca` canonical. Studio never changes this URL or public
  photo ordering. Property and Open House QRs remain different products.

## Available designs and formats

| Design | Composition |
|---|---|
| Listory Original | Existing typography, colours and complete four-panel artwork; new two-page version uses its forest-green and serif language. |
| Montserrat Minimalist | Geometric sans typography, warm white, fine rules, numbered labels, generous margins and asymmetric photo grids. |
| Classic Editorial | Bodoni display and selective italics, original magazine title, near-full-width cover image, ivory paper and editorial spreads. |

Every design supports Double-Sided Letter (two portrait pages), Existing Letter
(four portrait pages), and Large Folded (two 11 × 17 landscape spreads). Duplex
preferences are long edge for Letter, short edge for Folded. Print at actual size.
There is no added professional bleed/crop-mark support; pages use safe inset type.

The studio renders only the active preview (one page or one two-panel spread).
PDF generation renders only the selected format/design. Format changes never
truncate the original four-page format to produce the two-page product.

## Photographs and text

Choose a brochure cover independently of public property photo order. Its focal
position uses the existing editor and appears in the actual preview crop. Original
photo focal points are retained; the brochure-specific cover override is separate.
Cover choices and captions follow their photographs when photos are reordered;
removing the selected cover safely chooses the first remaining photograph.
Optional photo captions (100 characters) appear below selected photos in the new
compositions. Legacy Original four-panel artwork does not gain caption blocks.
No captions or factual claims are generated. Generic editorial labels describe
sections, not architectural features.

New compositions use bounded, explicitly labelled story excerpts and selected
features; source listing text is unchanged. Full facts remain on the property
page. Complete Original four-page artwork keeps its full description/facts and
existing readable-fit rejection policy. Original retains its full text/page structure for incomplete real listings too,
omitting upload prompts and using a supporting photo in place of a missing floor
plan when available. Sample previews retain existing guidance. Missing floor plans use property photography/specifications instead.
Optional fields are omitted rather than invented. Logos and floor plans use
contain fitting; property images are never stretched.

## Persistence and security

`listing.brochure` stores the normalized design, format, cover index, optional
cover focal point and captions in the existing listing JSON. There are no new
tables or migrations. Existing listings default to Original / four-page Letter.

Publishing includes the current studio choices. `Save brochure choices` uses a
narrow owner-authorized endpoint with same-origin and existing JWT/RLS checks.
An updated-at compare-and-set prevents concurrent edits/publishing from being
overwritten. It updates only the listing JSON preferences, retaining status, ownership, brand,
property data and lifecycle dates. Choices remain in the in-memory draft when
returning to the listing form. Unpublished/unsaved previews do not survive refresh;
the UI explains this. No private property data is placed in localStorage.

No new Vercel environment variable is required. Existing Supabase server bindings
remain server-only. No public URLs, database permissions or RLS policies change.

## Fonts

Montserrat Light/Regular/Medium/SemiBold and Bodoni Moda Regular/Italic are local
Fontsource packages, licensed SIL OFL 1.1 for commercial design and document
embedding. Original Arimo/Gelasio and existing Bodoni weights remain available.
The new Bodoni regular/italic faces use a private CSS family alias, leaving the
existing Bodoni 500 public/Yaletown typography unchanged. The PDF function embeds
the font data and includes it in its deployment trace.
No Vogue logo, masthead artwork or other publication branding is bundled.

## Validation and manual review

The studio matrix uses three realistic fixtures (detached home, long-address
condominium and loft), tests all nine combinations, decodes each PDF QR, checks
page dimensions and folded panel order, verifies font resources and captures
preview screenshots. Publishing is mocked in this design matrix; PDF rendering
is real. Separate integration regressions exercise real isolated publishing,
Open House attendee privacy and preference ownership/persistence.

Before approval, use the feature Preview (not Production) to:

1. Open an existing listing and compare Original Letter/Folded with previous PDFs.
2. Switch all designs/formats; inspect every page/spread at readable zoom.
3. Select a different cover, adjust position and confirm public photo order stays
   unchanged. Add an accurate caption; switch designs without losing listing data.
4. Download all nine combinations with your real branding; inspect logos, long
   names/addresses, floor plans and missing optional data. Scan property QRs.
5. Save preferences, reopen the listing and confirm restoration. Try another
   account to confirm listing access remains private.
6. Print a Double-Sided Letter and Folded PDF at 100% with the stated duplex edge;
   inspect actual paper margins, QR scanning and fold order. Automated dimensions
   do not substitute for a physical printer proof.
7. Spot-check property pages, portfolios, Fresh, Open Houses and Yaletown.

Known boundaries: no professional bleed; captions are optional and only selected
photos appear; extreme text remains subject to the existing readable-fit error;
new concise compositions intentionally show selected excerpts. Existing model
has no separate property-type/lot-size/city fields: studio uses supplied existing
fields and full address, without inferring or inventing missing facts. Original
filenames are preserved for its existing formats; new products use design names.

Font license notices are distributed at `/font-licenses/Montserrat-OFL.txt` and
`/font-licenses/Bodoni-Moda-OFL.txt`; PDF document content is not placed under the
font license. The fonts are embedded, not substituted with system fonts.

## Final results

- Production build and standalone TypeScript: passed.
- All 14 script test files: passed, including lifecycle/RLS, PDF deployment trace,
  data immutability and cover/caption remapping contracts.
- All 90 unique desktop/mobile browser cases have passing results across the
  broad regression run and focused reruns. Initial failures were not hidden:
  fixture cleanup/upstream 401s, short asynchronous test waits and a panel-check
  assertion that assumed a long surname stayed in one PDF text run were corrected
  or rerun. The final focused runs were clean.
- All nine combinations passed for detached, condo and loft fixtures on desktop
  and mobile. PDF page counts/sizes, font resources and embedded font streams,
  text vertical bounds, outside back/front order and decoded QR destinations
  were checked. Floor-plan fixtures explicitly wait for conversion before export.
- Font isolation was explicitly checked: existing public/Yaletown Bodoni remains
  weight 500; new editorial regular/italic faces use their own CSS family alias.
- Public discovery/navigation, property publishing, portfolios, Open House attendee
  privacy, Brand Profile, auth/session/login and workspace protection passed.
- Physical printer proof remains manual. Dense floor plans should be inspected
  at actual size; the larger formats offer more room than the two-page version.

Screenshots of all nine combinations and PDF-rendered interior/back proofs are
in `docs/brochure-studio-previews/README.md`.

## Changed files

```text
app/api/brochure-pdf/route.ts
app/api/properties/[slug]/brochure-settings/route.ts
app/components/brochure-paper.tsx
app/components/brochure-preview.tsx
app/components/download-brochure.tsx
app/components/listing-form.tsx
app/components/marketing-package.tsx
app/components/studio-chooser.tsx
app/components/studio-paper.tsx
app/components/workspace.tsx
app/globals.css
app/layout.tsx
app/lib/brochure-layout.ts
app/lib/brochure-studio.ts
app/lib/export-brochure.tsx
app/lib/listing.ts
app/lib/pdf-contract.ts
app/lib/server/brochure-pdf.ts
app/lib/server/properties.ts
docs/brochure-studio-previews/README.md
docs/brochure-studio-previews/classic-editorial-double-sided-back.png
docs/brochure-studio-previews/classic-editorial-double-sided.png
docs/brochure-studio-previews/classic-editorial-folded.png
docs/brochure-studio-previews/classic-editorial-letter-page-2.png
docs/brochure-studio-previews/classic-editorial-letter-page-3.png
docs/brochure-studio-previews/classic-editorial-letter.png
docs/brochure-studio-previews/listory-original-double-sided-back.png
docs/brochure-studio-previews/listory-original-double-sided.png
docs/brochure-studio-previews/listory-original-folded.png
docs/brochure-studio-previews/listory-original-letter-page-2.png
docs/brochure-studio-previews/listory-original-letter-page-3.png
docs/brochure-studio-previews/listory-original-letter.png
docs/brochure-studio-previews/montserrat-minimalist-double-sided-back.png
docs/brochure-studio-previews/montserrat-minimalist-double-sided.png
docs/brochure-studio-previews/montserrat-minimalist-folded.png
docs/brochure-studio-previews/montserrat-minimalist-letter-page-2.png
docs/brochure-studio-previews/montserrat-minimalist-letter-page-3.png
docs/brochure-studio-previews/montserrat-minimalist-letter.png
docs/brochure-studio.md
next.config.ts
package-lock.json
package.json
playwright.studio.config.ts
public/font-licenses/Bodoni-Moda-OFL.txt
public/font-licenses/Montserrat-OFL.txt
scripts/brochure-studio.test.mjs
scripts/prepare-pdf-assets.mjs
tests/agent-portfolio.spec.ts
tests/brochure-settings.spec.ts
tests/brochure-studio.spec.ts
tests/marketing-package.spec.ts
tests/pdf-export.spec.ts
tests/property-publishing.spec.ts
```
