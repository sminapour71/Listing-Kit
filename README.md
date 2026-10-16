# ListingKit

A visual prototype for real estate agents, made with Next.js, TypeScript, and Tailwind CSS.

## What you can try

- Browse three clearly marked sample listings.
- Search by address or neighbourhood and filter Active or Draft listings.
- Click **+ Create Listing** to open the property form.
- Fill in all property details and select photos or a floor plan from your computer.
- Click **Generate Marketing Package** to see a coming-soon message.
- Open **Brand Profile** in the sidebar to enter your realtor details, headshot, logos, and colours.
- See a live brand preview, then click **Save Brand Profile** to reuse it after refreshing or returning later.

This is a visual prototype. It does not have accounts, a database, payments, API integrations, or marketing generation. Listing form information disappears when you leave the form or refresh. Brand Profile details and resized brand images are saved only when you click **Save Brand Profile**, using storage in the current browser on the current device. They are not sent to a server and do not sync to other browsers or devices. Clearing site data removes the saved brand profile. Property photos are not saved or uploaded. The sample listings and initial Jamie Davis sidebar profile are demonstration content; saving your name and headshot personalises the sidebar. Marketing materials will be able to reuse the shared brand profile in a later feature; they are not generated yet.

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

The cloud chat does not currently have a hosting connection, so it cannot create a public website link directly. You can connect the GitHub repository once:

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

On a machine with an existing Chromium installation, set `BROWSER_PATH` to its executable instead of downloading a browser. The suite runs 14 tests across desktop and mobile, including persistence, image handling, storage failures, validation, and listing regressions.

Requires Node.js 20.9 or newer; Node.js 24 LTS is recommended. `npm run start` runs the built website; `npm run dev` runs the editable development version. If the cloud machine cannot write npm's default cache, use `npm ci --cache /tmp/listingkit-npm-cache`.

## Publishing later

The application is compatible with Vercel's standard Next.js settings. No environment variables or secrets are required. Publication is a separate step; this prototype has not been deployed. Once the files are on GitHub, you can import the repository in Vercel and click Deploy without configuring a database.

## Demo photo credits

Bundled architectural demo photos were sourced from the public Bedimcode real estate template assets at https://github.com/bedimcode/responsive-real-state-website/tree/main/assets/img . They are illustrative and do not depict the fictional addresses. Replace with your own licensed property photographs before a commercial launch.
