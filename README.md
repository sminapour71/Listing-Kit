# ListingKit

A visual prototype for real estate agents, made with Next.js, TypeScript, and Tailwind CSS.

## What you can try

- Browse three clearly marked sample listings.
- Search by address or neighbourhood and filter Active or Draft listings.
- Click **+ Create Listing** to open the property form.
- Fill in all property details and select photos or a floor plan from your computer.
- Click **Generate Marketing Package** to see a coming-soon message.

This is a visual prototype. It does not have accounts, a database, payments, API integrations, or marketing generation. Form information disappears when you leave the form or refresh. Selected files remain on your computer; they are not uploaded. The profile and sample listings are demonstration content.

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

## Checks for development

```sh
npm ci
npm run build
npm run typecheck
npm run start
```

Requires Node.js 20.9 or newer; Node.js 24 LTS is recommended. `npm run start` runs the built website; `npm run dev` runs the editable development version. If the cloud machine cannot write npm's default cache, use `npm ci --cache /tmp/listingkit-npm-cache`.

## Publishing later

The application is compatible with Vercel's standard Next.js settings. No environment variables or secrets are required. Publication is a separate step; this prototype has not been deployed. Once the files are on GitHub, you can import the repository in Vercel and click Deploy without configuring a database.

## Demo photo credits

Bundled architectural demo photos were sourced from the public Bedimcode real estate template assets at https://github.com/bedimcode/responsive-real-state-website/tree/main/assets/img . They are illustrative and do not depict the fictional addresses. Replace with your own licensed property photographs before a commercial launch.
