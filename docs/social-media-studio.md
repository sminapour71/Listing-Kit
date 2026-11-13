# Listory Social Media Studio V1

## Route and workflow

The private view is `/workspace#social-media-studio`, matching the existing Brand
Profile and Listory Agents hash-based workspace architecture. The new sidebar
item uses a clapperboard. The existing `/workspace` server authentication guard
redirects guests to `/sign-in`; new APIs independently validate the session and
listing ownership. The sidebar now scrolls on short screens so adding the fourth
item does not place Sign Out below the viewport.

1. Choose one of your own saved listings (the most recently updated 100).
2. Choose Property Reel, Instagram Carousel, Just Listed, Just Sold, Open House
   Story or Open House Reel. Just Sold requires an explicit acknowledgement.
   Open House creations use an existing upcoming event selected by the owner.
3. Generate, preview the actual finished file, download, then upload it to your
   preferred social platform. There is no direct publishing/account connection.

The studio uses one original architectural editorial collection: generous ivory
space, charcoal type, a restrained saved-brand accent, local Gelasio/Arimo type,
large property photographs and quiet numbered labels. It does not reproduce any
publication's masthead or branding and has no theme selector or manual editor.

## Existing architecture audited and reused

- `requireAgent`, `agentRequest` and `ownedProperty` validate Supabase sessions and
  carry the agent's verified JWT through existing RLS. No new account system.
- Listings/photos remain in existing `listory_properties` JSON and the existing
  listing asset store. Private asset reads reuse the owner-checked assets route.
- Existing saved brochure cover selection, photo order, custom captions and
  normalized cover/photo focal points are reused through `brochureListing`.
  The source photo array and settings are never rewritten by the studio.
- The actual account's saved `listory_agent_profiles.brand` supplies names,
  title/team, brokerage, phone, website/email, portrait, logos and brand accent.
  Empty branding remains empty; demonstration identities/logos are never used as
  a fallback. Missing images leave no placeholder. The UI links to Brand Profile
  if the brokerage name is missing.
- Existing lifecycle values are Draft/Fresh/Current/Past. **Past does not mean
  Sold.** There is no existing verified Sold field, so both UI and API require
  `soldConfirmed === true`. Creating a graphic does not change publication,
  ownership, lifecycle dates, listing facts or the saved Brand Profile.
- Open House data comes from `listory_open_houses` through the same JWT/RLS
  infrastructure. The projection contains only event ID/date/start/end/time zone
  and state. It never selects notes, attendees or attendee counts. Only open,
  non-expired Vancouver events are eligible; expired/closed/foreign events are
  rejected again at generation time. No duplicate event database.
- Existing Brochure Studio/PDF export, publishing, public URLs and QR generation
  retain their current paths. Social public links use the central `siteOrigin()`
  and point to listory.ca; drafts do not get invented public links.

## Export formats and rendering

| Creation | Finished download |
|---|---|
| Property Reel | 1080 × 1920 H.264 MP4, 24 fps, no audio |
| Instagram Carousel | ZIP of numbered 1080 × 1350 PNG files |
| Just Listed | 1080 × 1350 PNG |
| Just Sold | 1080 × 1350 PNG; no invented sale price, sale date or results |
| Open House Story | 1080 × 1920 PNG with saved Vancouver date/time |
| Open House Reel | The same MP4 renderer with the selected event's invitation |

`SocialCanvas` paints the same unified composition for images and video frames.
Foreground photographs use uniform contain scaling, retaining the whole image;
a softly blurred cover-scaled background derives from that same photograph.
Saved focal points guide the small movement within spare margins. No AI changes,
filters or fabricated architectural details are applied to the foreground.
Portraits, logos and floor plans use proportional contain fitting.

The video path lazily loads Mediabunny and uses native browser WebCodecs H.264
encoding with encoder backpressure, MP4 fast start and an in-memory buffer. It is
not MediaRecorder/WebM renamed to MP4, an HTML animation, or a server video job.
The preview plays the same MP4 Blob that the Download link saves. PNG previews
and carousel slides are likewise the exact exported bytes, not approximations.
Fades are restrained; the photo foreground has a small slow zoom/pan.

Standard duration adapts to photo count: five photos produce 11.5 seconds,
eight about 17 seconds, twenty 40 seconds, with a 45-second / 24-photo cap. Short
uses at most the first ten selected photos and 18 seconds. The cover goes first,
then remaining saved order. Photos excluded by the cap remain in listing data.
There is no audio track, music library, voiceover or audio synchronization.

Carousel uses up to eight ordered photographs plus available features,
specifications, an eligible plan and a final contact/property-link slide: at
most 12 slides, shorter for sparse listings. Filenames are numbered by actual
role (`01-cover.png`, `02-photo.png`, etc.); room names are not invented.
A floor plan appears only when existing source-PDF metadata estimates at least
24-pixel labels at native export size. Unverified raster/legacy or multi-page
plans and overly detailed plans are omitted from this condensed carousel. Source
plans remain in the listing, full-size property page and brochure workflow.

## Security, resource limits and cleanup

- `GET /api/social-media` returns only the owner's safe card projection.
- `GET /api/social-media/[slug]` returns safe eligible events for that owned row.
- `POST /api/social-media/[slug]` rereads the owned listing and current saved
  Brand Profile. It accepts only a known action ID, event selection and Sold
  acknowledgement. Caller-supplied listing/brand data cannot override them.
- All server operations require the existing verified account; cross-account
  access is denied. POST uses the existing same-origin protection.
- DTOs explicitly whitelist listing/photo/branding/event fields and omit owner
  IDs, account email, tokens, private notes, attendee records and counts.
- Responses are private/no-store. No secrets are embedded in browser code.
- No generated files, drafts, URLs or video buffers are uploaded or persisted.
  Blob URLs are revoked when replaced/cleared or when leaving the view.
- Image loading is sequential/on demand, downsampled to at most 2048 pixels on
  the long edge, with a seven-bitmap LRU. Existing asset size/access checks apply.
- Only one creation/encoder runs at a time. AbortController cancels network work
  and active encoding; bitmaps/canvases/encoder buffers are released. A three-minute
  wall-clock timeout offers short-Reel guidance. Actual photo/slide stages are
  shown, never a fake progress percentage. Ready appears only after finalization.
- Successful empty data and failed requests have different UI states. Unsupported
  H.264 browsers get clear desktop Chrome/Edge guidance; image exports remain usable.

## Hosting, compatibility and boundaries

No new backend service, paid API, database/table/migration or environment variable
is needed. Existing Supabase server bindings remain server-only. Video processing
runs on the agent's device, avoiding long-running Vercel functions, server video
cost and the function response-size limit for MP4 files. Normal existing Vercel
and Supabase request/storage quotas still apply to source data and image reads.

Reel generation targets current desktop Chrome/Edge over HTTPS (localhost also
works). Browser H.264 support is checked before encoding. Mobile layout and image
exports are supported; desktop is recommended for reliable longer video encoding.
Encoding speed and available memory depend on the device. Keep the tab open;
a long Reel can take a couple of minutes. Real Instagram upload remains a manual
platform compatibility check; this feature does not connect to Instagram.

**Existing authoring limit:** the current listing editor/server accepts at most
16 saved photos. That limit is deliberately unchanged to preserve the existing
brochure workflow. The social engine supports larger imported/legacy collections
up to 24 selected photos; its 25-photo stress test seeds an isolated imported row,
not a new 25-photo upload capability. Expanding the shared authoring limit needs
its own brochure/content-fit review.

Extremely long/unbreakable addresses or branding text that cannot fit at readable
size produce a clear error rather than clipped text. Unknown/scanned plan label
sizes cannot be verified automatically. Social selections and generated files
are not restored after a page refresh; download finished files before leaving.

The optional Launch Collection bulk ZIP is deferred. Individual exports work;
reliably budgeting several MP4s plus PNG collections and a final ZIP in browser
memory needs separate validation. The shared `SocialProject` / `createSocial`
contract supports a later sequential bundle without redesigning the renderers.
There is no non-working bulk button. Scheduling, publishing integrations, music,
AI narration, advanced editing, MLS, CRM and multiple social themes are excluded.

Mediabunny 1.66.0 (MPL-2.0, unmodified) and fflate 0.8.2 (MIT) are pinned locally.
Notices and the pinned library source location are available at
`/licenses/social-media.txt`. Existing locally hosted Gelasio/Arimo font assets
are reused. No external font or rendering service is required.

## Manual review before merge

1. Open the feature Preview, sign in and choose Social Media Studio.
2. Choose your own listing; compare its saved cover, photo order and focal points.
3. Generate every asset with your real Brand Profile. Check brokerage identity,
   portraits/logos, long addresses/names and missing optional values.
4. Open the carousel ZIP outside Listory and inspect every numbered slide.
5. Play both MP4s outside the browser and upload a draft to Instagram. Check
   portrait framing, transitions, pacing, silent audio behavior and device support.
6. Select among your upcoming Open Houses; verify the displayed Pacific date/time.
7. Confirm Sold acknowledgement is required and generating it leaves the listing
   lifecycle unchanged. Cancel a running Reel, then regenerate a shorter one.
8. Review mobile navigation, previews and Sign Out; check supported static exports
   on your actual phone. Prefer desktop for long MP4 generation.
9. Spot-check the existing brochure, property site/QR, portfolio, Fresh Listings,
   Open Houses and Yaletown. Do not merge until the design and files are approved.

Screenshots, actual exported images and a native MP4 example are listed in
`docs/social-media-previews/README.md`. They use clearly fictional test fixtures,
not actual private client marketing.

## Final verification

- Production webpack build and TypeScript checks passed.
- All 46 cases across 16 script suites passed.
- All 68 existing browser regression cases have passing results across broad and focused runs. A mobile sidebar overflow uncovered by the added navigation item was fixed; desktop/mobile session and Sign Out checks passed afterward.
- All nine existing Brochure Studio combinations exported correctly with the expected page counts, dimensions, font handling and listory.ca QR destinations.
- Four public discovery/navigation cases passed across desktop and mobile.
- All 15 applicable Social Studio browser cases passed across focused runs; the duplicate long-video mobile stress case is intentionally skipped. Both MP4 types were probed and fully decoded independently, with one H.264 video stream and no audio. The 25-photo imported-fixture stress export selected 24 photos and produced a 45-second MP4; cancellation during encoding and regeneration passed.
- Final ownership/privacy and successful-empty versus failure checks passed again on desktop and mobile. Tests included a real private attendee record that never entered the social projection.

One transient Supabase 401 and a delayed thumbnail required retries; final results passed. An interrupted environment was resumed rather than discarding completed evidence. No physical device/Instagram upload is claimed; those remain manual review items.

Exports use saved server listing data. Save normal listing edits before generating marketing; unsaved form edits are not exported.
