# GitHub review publication

GitHub stores the project and description. GitHub Pages publishes the interactive app so Dr. Rana can open a website link without downloading or running anything.

Suggested repository name: `laura-ngo-map`.

Suggested repository description:

> Interactive map of NGOs accepting surplus food donations across Lebanon. An NFS review project for Dr. Rana Rizk at the Lebanese American University.

## Publish

1. Create the repository in the intended GitHub account and add the project files to its `main` branch. Include the hidden `.github/workflows/pages.yml` directory and `app-source/`. The release ZIP excludes local counts, credentials, node_modules, review spreadsheets and unrelated hosting identity.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the publishing source.
3. Open **Actions → Publish review to GitHub Pages → Run workflow**. Later pushes to `main` publish updates automatically.
4. Wait for a successful run, then copy the actual website URL from the deployment. Test both the 3D atlas and street map, searching, an NGO detail and the credits before emailing the link.

The usual project URL has the form `https://OWNER.github.io/REPOSITORY/`. This is a format example, not an already published link. The workflow reads the actual repository path from GitHub; it also supports account sites and custom domains at `/`.

GitHub Free supports Pages for public repositories. Other GitHub plans can support private source repositories. A normal Pages review link is publicly accessible; private source does not by itself restrict website visitors.

## What Dr. Rana can review

The supplied v1.2 map, its 63 NGO entries, terrain and street views, filters, contact links, reception-hours display, credits and wording are included. General-area pins still need the exact-location confirmation already listed separately. The project name remains provisional.

## Visitor counter

GitHub Pages serves static files and cannot run the Node.js visitor API. The Pages build now configures the public Abacus aggregate counter, with a browser-storage marker to avoid counting ordinary reloads more than once. Refreshing the displayed count sends a read-only request. No API secrets are embedded in the website. The Windows/server build continues using its same-origin visitor API. See [visitor tracking](docs/visitor-tracking.md) for configuration, verification and limitations.

## Build locally

With Node.js 22.12 or newer:

    node scripts/build-github-pages.mjs /laura-ngo-map/

Static output is written to `github-pages/`. No npm install is needed because this version retains its supplied production bundles. Normal `npm run build` still builds the Windows/server version into `dist/`.

GitHub references: [About Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [custom deployment workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
