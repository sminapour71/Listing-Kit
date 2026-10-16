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

This is a visual prototype. It does not have accounts, a database, payments, CRM functionality, or external API integrations. PDF downloads use a small stateless renderer within this Next.js application. Listing details and selected property images remain available while navigating within the current tab, including when returning from the brochure. Refreshing or closing the tab clears them. Opening or refreshing the Marketing Package address without an in-memory listing opens a clearly labelled sample brochure. Brand Profile details and resized brand images are saved only when you click **Save Brand Profile**, using storage in the current browser on the current device. They do not sync to other browsers or devices. When you request a PDF, a temporary copy of the brochure artwork and its images is sent to this application’s renderer; it is not stored. Clearing site data removes the saved brand profile. Property photos and floor plans are resized/rendered locally in your browser; they are not saved to a database. PDF export sends the selected artwork and images for temporary rendering only. The sample listings and initial Jamie Davis sidebar profile are demonstration content; saving your name and headshot personalises the sidebar. The onscreen brochure reuses the shared saved Brand Profile now. Other marketing materials are future features.

## Preview the brochure online

Open https://listing-kit-pink.vercel.app/#marketing-package . This opens the sample property with the Brand Profile saved in that browser. If no profile has been saved, clearly labelled sample realtor details are shown.

To use your own property:

1. Open **Listings → + Create Listing**.
2. Fill in your listing details and choose your photos. The first photo becomes the cover; use the arrows beside photos to change the order.
3. Optionally choose a floor plan (JPG, PNG, WEBP, or PDF). For a PDF, the first page is rendered inside the brochure, with its page count noted.
4. Click **Generate Marketing Package**.
5. Browse **Cover**, **Property**, **Floor plan & details**, and **Realtor** with the thumbnails or page controls.
6. Click **Back to Listing** to make changes, then generate again.

The template uses up to six property photos: one cover image, up to four property-page images, and an optional detail-page image. You can select up to 16 photos and reorder them to choose which appear. Each file may be up to 20 MB. Missing photos, floor plans, and profile images have clear placeholders; demonstration photos are never silently substituted into your own listing. **Download PDF** offers Standard Letter and Folded 11 × 17 downloads. The property QR area is a placeholder, not a working QR code.

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
- These are RGB, exact-size PDFs without extra commercial bleed or crop marks. Text, headshots, logos and the existing QR placeholder stay within safe margins. Edge-to-edge photos/backgrounds require a borderless printer or print-shop handling; confirm additional bleed/CMYK requirements with your shop if needed.
- There is no database, account system, payment system, CRM/MLS integration, or generated QR code. The existing future QR placeholder is unchanged. PDFs are returned directly and are not stored on our server. Listing data is still temporary tab state; the downloaded PDF is the copy you can keep.

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

Automated browser checks (after the build, with no process already using port 3100):

```sh
npx playwright install chromium
npm run test:e2e
```

On a machine with an existing Chromium installation, set `BROWSER_PATH` to its executable instead of downloading a browser. The suite runs 42 tests across desktop and mobile, including profile persistence, image handling, storage failures, complete brochure data binding, branding, PDF floor plans, navigation, editing, missing assets, responsive layouts, validation, listing regressions, and both real PDF download formats (including exact page geometry, panel order, dynamic data, image resolution, text bounds, retries, cancellation, and long descriptions).

Requires Node.js 24 LTS, matching the tested environment and the version selected for Vercel by package.json. `npm run start` runs the built website; `npm run dev` runs the editable development version. If the cloud machine cannot write npm's default cache, use `npm ci --cache /tmp/listingkit-npm-cache`.

## Publishing later

The application is compatible with Vercel's standard Next.js settings. No environment variables or secrets are required. The current online prototype is at https://listing-kit-pink.vercel.app . Once the files are on GitHub, you can import the repository in Vercel and click Deploy without configuring a database.

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
