# Listory

A visual prototype for real estate agents, made with Next.js, TypeScript, and Tailwind CSS.

## What you can try

- Browse three clearly marked sample listings.
- Search by address or neighbourhood and filter Active or Draft listings.
- Click **+ Create Listing** to open the property form.
- Fill in all property details and select photos or a floor plan from your computer.
- Click **Generate Marketing Package** to open a branded four-page brochure preview.
- Use **Previous Page**, **Next Page**, or the four page thumbnails to browse the brochure.
- Click **Back to Listing** to edit details without losing your work.
- For a quick demonstration, click **Preview sample brochure** on a dashboard property card. It uses your saved Brand Profile when available.
- Open **Brand Profile** in the sidebar to enter your realtor details, headshot, logos, and colours.
- See a live brand preview, then click **Save Brand Profile** to reuse it after refreshing or returning later.

This prototype has no accounts, payments, CRM, or MLS integration. Unpublished listing drafts and their uploads remain in the current tab until refresh. Brand Profile information remains in this browser until explicitly saved and does not sync between devices. Publishing saves a public snapshot of the listing and selected branding to Supabase; only the fields intended for the property page are published. PDFs are rendered temporarily and returned without being stored. Published photos/logos are stored separately as public assets. Sample listings and any sample public page are clearly labelled demonstrations. Clearing browser data removes saved branding and the private controls for managing published pages; it does not delete published pages.

## Preview the brochure online

Open https://listing-kit-pink.vercel.app/#marketing-package . This opens the sample property with the Brand Profile saved in that browser. If no profile has been saved, clearly labelled sample realtor details are shown.

To use your own property:

1. Open **Listings → + Create Listing**.
2. Fill in your listing details and choose your photos. The first photo becomes the cover; use the arrows beside photos to change the order.
3. Optionally choose a floor plan (JPG, PNG, WEBP, or PDF). For a PDF, the first page is rendered inside the brochure, with its page count noted.
4. Click **Generate Marketing Package**.
5. Browse **Cover**, **Property**, **Floor plan & details**, and **Realtor** with the thumbnails or page controls.
6. Click **Back to Listing** to make changes, then generate again.

The template uses up to six property photos: one cover image, up to four property-page images, and an optional detail-page image. You can select up to 16 photos and reorder them to choose which appear. Each file may be up to 20 MB. Missing photos, floor plans, and profile images have clear placeholders; demonstration photos are never silently substituted into your own listing. **Download PDF** offers Standard Letter and Folded 11 × 17 downloads. Publishing activates a real property-page QR code in the existing Page 4 QR area, including both PDF formats. Unpublished listings keep a tasteful placeholder.

Brand colours apply inside the brochure. The rest of Listory keeps its original design. Brand colour text contrast is adjusted automatically for light and dark palettes.

Vercel normally deploys updates pushed to the connected GitHub `main` branch automatically. If an update has just been uploaded, allow the deployment to finish and refresh the website. A profile saved on your local computer's localhost website is separate from the one saved on the Vercel website.

## Download and print a brochure

1. Open https://listing-kit-pink.vercel.app/#marketing-package in the browser where you saved your Brand Profile. This opens the sample property. To export your own property, create a listing, add the details and uploads, and click **Generate Marketing Package**.
2. Click **Download PDF**.
3. Choose **Standard 8.5 × 11** or **Folded 11 × 17**.
4. Wait for **Preparing brochure...** to finish. Your browser downloads the PDF to its usual **Downloads** folder. Names use the street address, for example `2847-West-35th-Avenue-Listory-Letter.pdf` or `2847-West-35th-Avenue-Listory-Folded.pdf`.

**Standard Letter:** 4 portrait pages, each exactly 8.5 × 11 inches, in order 1, 2, 3, 4. This is the best format for emailing. To print it double-sided, open the PDF, press **Ctrl + P**, choose Letter paper, portrait orientation, **Actual size / 100%**, one PDF page per printed side, and **Print on both sides → Flip on long edge**. Four pages use two Letter sheets.

**Folded:** 2 landscape pages, each exactly 17 × 11 inches. The outside is **4 | 1** and the inside is **2 | 3**. Open it, press **Ctrl + P**, select your printer, choose **11 × 17 / Tabloid**, landscape orientation, **Actual size / 100%**, one PDF page per printed side, and **Print on both sides → Flip on short edge**. Turn OFF booklet, multiple-pages-per-sheet, and fit/shrink options: the panels are already arranged. Print both pages onto one sheet, then fold vertically down the middle. The result reads cover → property → floor plan/details → realtor back cover. A print shop can use these same instructions. Printer wording may vary; a proof sheet is recommended before a larger run.

Choose colour printing and high quality when the printer offers those options. The PDF has backgrounds included automatically; you do not need a browser background-graphics setting. If your printer cannot duplex Tabloid paper, ask a print shop to print the two imposed sides.

### Export limitations

- The onscreen brochure design is unchanged. Export always uses its desktop artwork, regardless of phone or monitor size, with only print-fitting adjustments and safe edge margins. Dense pages may use shorter photo frames and uniform scaling; no words or photos are silently removed. If content would become too small to read, export asks you to shorten it instead of cutting it off or adding a fifth page.
- Text remains sharp/selectable, icons remain vector, and fonts are embedded. The Listory wordmark uses the exact Bodoni Moda font; the operating-system Georgia/Arial fonts use compatible embedded Gelasio/Arimo print versions so files render consistently on other computers.
- Quality depends on the original uploads. New property photos retain up to 3300 pixels, new headshots/logos up to 1600, and PDF floor plans are rendered at up to roughly 300 dpi. Older resized images cannot regain detail; reupload higher-resolution originals if they look soft. PDF floor plans still use the first page only.
- The renderer respects Vercel’s transfer limits: roughly 4 MB of encoded artwork/images per request, with a maximum PDF just under 4.5 MB. Landscape photos can be compressed modestly at a 300-dpi Letter-width resolution; logos and floor plans remain lossless PNG. If a large set still exceeds the limits, a clear message asks for fewer/smaller images rather than silently producing a blurry file.
- These are RGB, exact-size PDFs without extra commercial bleed or crop marks. Text, headshots, logos and the property QR area stay within safe margins. Edge-to-edge photos/backgrounds require a borderless printer or print-shop handling; confirm additional bleed/CMYK requirements with your shop if needed.
- There is no account system, payment system, or CRM/MLS integration. Published property pages use Supabase. PDFs are returned directly and are not stored on our server. Unpublished listing drafts are still temporary tab state.

## Preview on your computer (first time)

1. Download the project ZIP and extract it. On Windows, right-click the ZIP and choose **Extract All**, then **Extract**. On Mac, double-click the ZIP.
2. Open https://nodejs.org in your browser. Download the version labelled **LTS** for your computer, open the downloaded installer, and follow its installation screens with the default options. Node.js is the tool that runs this website on your computer.
3. Open the extracted **ListingKit** folder. Make sure you can see `package.json` inside it.
4. Open a command window in that folder:
   - **Windows:** click the folder's address bar in File Explorer, type `powershell`, and press Enter.
   - **Mac:** open the **Terminal** app (press Command + Space, type Terminal, press Enter). Type `cd ` including the space, drag the extracted ListingKit folder into the window, and press Enter.
5. Type this command and press Enter. Wait until it finishes:

   ```sh
   npm install
   ```

   If Windows blocks `npm.ps1`, use `npm.cmd install` instead.

6. Type this command and press Enter:

   ```sh
   npm run dev
   ```

   On Windows, if needed, use `npm.cmd run dev`.

7. In your browser's address bar, enter **http://localhost:3000**. This address works on your own computer while that command window is running; it is not a public website.
8. Click **+ Create Listing** to try the form. To stop the website, return to the command window and press **Control + C**.

Next time, repeat steps 4, 6, and 7. You do not need to install Node.js or dependencies each time.

## Get the updated version on Windows

If you downloaded an earlier ZIP, it will not update itself when GitHub changes.

1. In the command window running the old website, press **Ctrl + C**. If asked to terminate the batch job, type **Y** and press Enter.
2. Open https://github.com/sminapour71/Listing-Kit . Click **Code → Download ZIP**.
3. Extract the new ZIP to a new folder so you keep your old copy.
4. Open the new folder containing `package.json`. Click File Explorer's address bar, type `cmd`, and press Enter.
5. Run `npm.cmd install` and wait for it to finish.
6. Run `npm.cmd run dev`. Open **http://localhost:3000** in your browser.
7. Click **Brand Profile** in the sidebar. On a phone-sized screen, open the three-line menu first.

## Get an online preview with Vercel

The repository is already connected to Vercel for the preview above. To set up your own separate deployment, connect a GitHub repository once:

1. Visit https://vercel.com/signup and choose **Continue with GitHub**. Follow the sign-in and authorization screens. Choose **Hobby** for a personal prototype if asked for a plan.
2. From the Vercel dashboard, click **Add New → Project**.
3. In **Import Git Repository**, find **Listing-Kit** and click **Import**. If it is missing, click the GitHub permissions/configuration link, grant Vercel access to **Listing-Kit**, and return to the import screen.
4. Keep the framework as **Next.js**, the root directory as the default repository root, and all build settings at their defaults. No environment variables are needed.
5. Click **Deploy** and wait for the success screen.
6. Click **Visit** to open your public website. Copy its address to share the preview; add `/#brand-profile` to open the Brand Profile screen directly.

Future updates pushed to the connected GitHub branch will deploy automatically. Brand profiles saved on localhost do not transfer to the Vercel address because browser storage is separate for each website.

## Checks for development

```sh
npm ci
npm run build
npm run typecheck
npm run start
```

PDF deployment packaging check (after the build):

```sh
node --test scripts/check-pdf-bundle.test.mjs
```

This copies only the PDF route’s traced deployment files into a temporary isolated directory and initializes the renderer there. It catches missing runtime assets that normal local browser tests cannot detect. The deployment explicitly includes Playwright’s runtime package, including its dynamically loaded `browsers.json` file.

Automated browser checks (after the build, with no process already using port 3100):

```sh
npx playwright install chromium
npm run test:e2e
```

On a machine with an existing Chromium installation, set `BROWSER_PATH` to its executable instead of downloading a browser. The suite runs 42 tests across desktop and mobile, including profile persistence, image handling, storage failures, complete brochure data binding, branding, PDF floor plans, navigation, editing, missing assets, responsive layouts, validation, listing regressions, and both real PDF download formats (including exact page geometry, panel order, dynamic data, image resolution, text bounds, retries, cancellation, and long descriptions).

Requires Node.js 24 LTS, matching the tested environment and the version selected for Vercel by package.json. `npm run start` runs the built website; `npm run dev` runs the editable development version. If the cloud machine cannot write npm's default cache, use `npm ci --cache /tmp/listingkit-npm-cache`.

## Publishing later

The application uses Vercel's standard Next.js settings. Existing brochure previews and PDFs work without Supabase. Property publishing needs the server-only Supabase settings described below. The current online prototype is at https://listing-kit-pink.vercel.app .

## Demo photo credits

Bundled architectural demo photos were sourced from the public Bedimcode real estate template assets at https://github.com/bedimcode/responsive-real-state-website/tree/main/assets/img . They are illustrative and do not depict the fictional addresses. Replace with your own licensed property photographs before a commercial launch.

## Floor plan rendering

PDF.js renders uploaded PDF floor plans entirely in the browser. The `predev` and `prebuild` scripts copy its matching worker, fonts, character maps, and WebAssembly files from the locked npm package into ignored `public/pdf-assets/`. This happens automatically with `npm run dev` and `npm run build`, including on Vercel. No third-party PDF viewer or API is used. A generated brochure and its listing uploads are temporary tab state; the Brand Profile continues to use its existing browser storage key.

## Product wordmark

The visible product brand is **Listory.**, set in self-hosted Bodoni Moda in the existing forest green. The shared text-only wordmark appears in the sidebar (including mobile navigation) and brochure footers. Repository, folder, package names, and browser storage keys deliberately keep their existing technical names so saved Brand Profiles continue to work.

## PDF renderer for development

The visible preview and export share `BrochurePaper`; there is no duplicate static brochure. The browser serializes just four artwork articles, embeds the current images once, and posts to `/api/brochure-pdf`. The Node route sanitizes the markup and accepts only bounded inline image assets. Packaged Chromium prints the artwork with backgrounds and embedded fonts; all external/file/network access is blocked. The renderer fits and checks each page and creates exactly four Letter pages. `pdf-lib` embeds those vector pages at their original size into `[4,1]` and `[2,3]` Tabloid spreads. No fold line is added. The PDFs include actual-size and recommended duplex viewer preferences.

Vercel uses the bundled `@sparticuz/chromium` executable with no extra service, browser download, credentials, or configuration. `next.config.ts` includes its compressed binaries and print fonts/styles in the function trace. Node.js 24 is already pinned. The route has a 60-second maximum, a render timeout, bounded requests/responses, and a two-render per-instance concurrency limit.

For local Windows development, an installed Microsoft Edge or Google Chrome is detected automatically. macOS development detects Chrome/Edge in Applications. Linux uses the bundled browser. Developers can optionally set `PDF_CHROMIUM_PATH` to an installed Chromium executable on a non-Vercel machine. No such setting is needed on Vercel.


## Publish a property page and activate its QR code

1. Save your Brand Profile, create your listing, then click **Generate Marketing Package**.
2. In the **PROPERTY PAGE** panel click **Publish Property Page**. This makes the listing photos, details, and saved Realtor contact information public.
3. Wait for **Published**. Use **Copy Link** or **View Property Page** to open the real public address. Another browser or phone can view it without signing in.
4. Page 4 and both PDF downloads now use a high-contrast real QR code with its own quiet zone. It encodes the complete HTTPS property link. Print at actual size and proof-scan before distributing a large print run.
5. Edit the listing as usual, regenerate the brochure, and click **Update Property Page** to refresh the public snapshot. Edits do not silently change published information.
6. **Unpublish Property Page** immediately makes its URL show a tasteful unavailable page. Previously printed QR codes continue pointing to that URL. Republish with the same address in the same browser to reuse it.

### One-time Supabase setup

Run `supabase/setup.sql` in Supabase's SQL Editor. It creates one private JSON-backed listing table with row-level security and no anonymous/authenticated access, plus one bucket for deliberately published images. Only the server's secret key can write either. In Vercel's Production environment variables save `SUPABASE_URL` and `SUPABASE_SECRET_KEY`; never use `NEXT_PUBLIC_` for the secret or put it in a file, commit, chat, or client bundle. The prototype author has already completed this setup.

All property links, QR codes, copied/viewed URLs and public sharing metadata use one setting: `NEXT_PUBLIC_SITE_URL`. Its safe default is the verified production alias `https://listing-kit-pink.vercel.app`. Vercel's automatically preferred custom hostname and request headers are deliberately ignored. To switch to an owned, connected custom domain later, change `NEXT_PUBLIC_SITE_URL` in Vercel's Production environment variables and redeploy; no code change is needed. Use a full HTTPS origin without a path, port, query or credentials. Development/loopback addresses are rejected.

Existing database records store slugs, not canonical site URLs, so existing published pages automatically use the corrected origin. Opening the original listing's Marketing Package refreshes the saved browser URL from the server and writes it back to local storage, updating Copy Link, View Property Page and QR exports. Existing downloaded or printed brochures must be regenerated; a PDF or printed QR already distributed cannot be rewritten remotely.

The server creates a unique street-address slug, reserves collisions atomically with a random suffix, stores a SHA-256 hash of a random per-listing management capability, accepts individually bounded/re-encoded photos and logos, then publishes the completed snapshot. Failed uploads leave the listing in draft, not a partially published page. The raw capability stays in the creating browser's local storage; it is not placed in public URLs or the public page. Updates and unpublishing require that capability. Supabase keys, private management hashes, and unpublished records are never sent to public visitors.

### First-version limits

- There are no accounts yet. Anyone who can use the prototype can create a new page; the private management capability protects existing pages but is not account authentication or production abuse prevention. Keep this as a controlled prototype until publisher access controls are added.
- Management belongs to the creating browser and website origin. Changing devices/domains or clearing browser data loses those controls; there is no account-based recovery UI yet. Saved property records can be managed by the project owner in Supabase.
- The dashboard remains the approved sample dashboard. It is not yet a synced inventory of published records. The current address's publishing controls reappear in the creating browser. Draft editing and unsaved uploads still clear on refresh.
- Unpublishing removes the webpage, but deliberately public photo URLs, downloaded PDFs, and copies cached or saved by visitors are not revoked. Repeated updates can leave older image assets in storage; a deletion/cleanup interface is not included.
- The public page uses up to all 16 selected photos, while the brochure retains its approved six-photo layout. Website photos are resized to 2400 pixels and floor plans/logos to 1800; PDFs continue using the original print-prepared assets. PDF floor plans use page 1 only. Individual publishing uploads must fit below Vercel's request size limit.
- QR codes are software-decoded from both actual PDF exports at 300 dpi in testing. Physical iPhone/Android camera and printer proof testing is still recommended; no physical devices are connected to this workspace.

### Real-storage integration test

After a production build, opt in to `tests/property-publishing.spec.ts` with `LISTORY_LIVE_STORAGE_TEST=1`, both Supabase settings, and optionally `NEXT_PUBLIC_SITE_URL` for a configured owned production domain. Run the normal Playwright suite. This writes uniquely named test records, publishes actual uploaded images, opens pages in a fresh browser at desktop/tablet/phone widths, checks duplicate-address drafts and unauthorized management, decodes the real QR and both PDF QR codes, and unpublishes. It removes only its own test records and referenced assets afterward. In this cloud workspace start Node with `NODE_USE_ENV_PROXY=1` so server requests use the managed HTTPS proxy; do not copy or print the injected key. With the opt-in flag absent, the two real-storage project runs are skipped and all existing browser checks still run.

Site-origin regression check: `node --test scripts/site-url.test.mjs`. The real-storage browser tests also cover stale browser URLs, the actual clipboard, View Property Page links, and QR decoding from both PDF formats.

## Property-photo responsiveness and fitting

Property photos share one `PropertyPhoto` renderer and the pure policies in `app/lib/photo-fitting.ts`. This is limited to property photos: Realtor headshots, logos, QR codes and floor-plan layouts are unchanged.

- Public hero photos use full width, automatic height and `contain`. Very tall originals are capped relative to the viewport and shown completely against a quiet neutral background. Gallery photos keep their natural proportions and existing lazy loading.
- Uploads record optional width, height, aspect ratio and orientation. Public publishing uses the actual resized asset dimensions reported by the server. These are fields inside the existing JSON photo objects, not new database columns or tables. No SQL migration is required. Older records still work: images are measured on load without changing their saved data.
- Brochure frames keep the approved surrounding artwork and page structure. Feature photos are allowed at most 5% total cropping, secondary photos 15%; significantly different aspect ratios use `contain` with a subtle neutral surround. Nothing is stretched. A single portrait among three or four secondary photos can use a tall side slot while the grid keeps its original total height. The cover remains the first selected photo.
- `position` optionally accepts `center`, `top`, `bottom`, `left`, or `right`, defaults to center, and is preserved when publishing. There is no new editor or image-position UI.
- PDF rendering decodes the actual image assets and runs the same fit policy and mixed-grid helper at print dimensions. It recomputes fitting after any existing print compaction. Both Letter and Folded formats retain their exact original page sizes and order; photo fitting does not affect property URLs or QR generation.
- Existing quality limits remain: up to 3300 pixels for prepared print photos, 2400 for published website photos, with no separate image service or enormous original files fetched by the public website. Fitting cannot add detail to a low-resolution original.

Run `node --test scripts/photo-fitting.test.mjs` for the fitting policies. The browser suite now has 46 regular checks and two opt-in real-storage checks. It tests a portrait in different three-photo positions, responsive frame geometry, panorama/portrait/landscape/square website heroes, metadata persistence, and both PDF formats. Saturated source-edge markers are checked in the actual rasterized cover artwork to detect cropping; decoding the existing QR codes confirms export/publishing still work.

### Manual photo positioning

In **Create Listing → Property photos**, click **Adjust Position** beside a photo. Drag with a mouse or finger, then choose **Save**. Arrow keys are also supported (hold Shift for a larger move). **Cancel**, Escape, or closing the dialog discards unsaved adjustments. **Reset Position → Save** removes the override and restores automatic centring. Reordering photos keeps the adjustment with its photo.

The editor uses a representative cropped cover frame. The website and each brochure frame retain their existing automatic `contain`/gentle-`cover` fitting. Full-image frames still show the entire photo, so positioning may have no visible effect there; cropped frames centre the chosen source point as far as the image edges allow. Photos are never stretched, enlarged for editing, or destructively cropped.

Optional normalized `focalX`/`focalY` values (0–1) live on each listing photo. The public snapshot validates and stores them in the existing JSON fields, with no SQL migration. Existing photos without them remain unchanged. Draft edits stay in the current tab, like the existing listing form; click **Generate Marketing Package**, then **Publish Property Page** or **Update Property Page** to save the public version. Exported PDFs and the onscreen brochure use the same saved focal point and shared positioning calculation, recalculated for each actual frame, including print compaction. Different frame shapes can show different crops while preserving the same important point.

`tests/photo-position.spec.ts` exercises mouse and real browser touch dragging, independent photos, reordering, cancel/reset/save and keyboard dismissal. It generates both PDF formats, checks their dimensions/page counts, and inspects rendered coloured edge markers to prove the focal crop reached the final artwork. The real-storage integration checks the same values survive publishing, appear in a clean public browser, and reject invalid coordinates.
