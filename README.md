# Rossell

A marketing site for a fictional workspace-intelligence product, plus an optional backend
(Node.js, Express, MongoDB).

The front end is plain HTML, CSS and JavaScript — no framework, no build step, no external
requests. The animation library (GSAP) and both fonts are vendored in the repository, so the
site runs offline.

---

## What is in the repository

| Path                  | Contents                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| `index.html`          | the whole site: hero, features, analytics, integrations, blog, contact     |
| `404.html`            | not-found page (same header and theme)                                    |
| `styles/`             | design tokens, sections, responsive rules, dark/light theme, fonts         |
| `scripts/`            | interactions: theme, navigation, modals, charts, forms, filters, reveals   |
| `shared/content.js`   | all demo content, used by the site **and** by the database seeder          |
| `assets/`             | placeholder images and the favicon                                        |
| `server/`             | Express API with Mongoose models and `seed.js` (optional)                  |
| `tests/`              | jsdom test suites for the front end                                        |

All copy, names, numbers and photos are placeholders. Search for `TODO` to find everything
meant to be replaced:

```bash
grep -rn "TODO" --include="*.js" --include="*.html" --include="*.css" .
```

---

## Run it on your own computer

Requirements: **Node.js 18 or newer**. A database is optional — the site is fully functional
without one.

```bash
git clone https://github.com/edonis175/Rossell.git rossell
cd rossell
npm --prefix server install    # Express and Mongoose (only for the built-in server)
npm start                      # open http://localhost:4000
```

`npm start` serves the site from `server/server.js` on one port. No MongoDB running? The API
answers `503` and every page still renders from `shared/content.js`; form submissions are stored
in the browser instead.

If you would rather not use Node at all, open `index.html` directly or serve the folder with any
static server (for example `npx serve .`).

### Optional: the database

```bash
cp server/.env.example server/.env   # then edit MONGODB_URI (local MongoDB or MongoDB Atlas)
npm run seed                         # fill the collections with the demo content
npm run dev                          # restart on changes
```

Content endpoints return `503 { offline: true }` while the database is unavailable; writes
(contact, newsletter, trial) are validated and rate limited server-side.

---

## Commands

| Command             | What it does                                                    |
| ------------------- | --------------------------------------------------------------- |
| `npm start`         | serve the site and API from `server/server.js`                  |
| `npm run dev`       | same, restarting on file changes                                |
| `npm run seed`      | clear and repopulate MongoDB from `shared/content.js`           |
| `npm test`          | front-end suite — 53 tests (markup, styles, every interaction)   |
| `npm run test:api`  | API suite — 22 tests (routes, validation, static + 404 handling) |

The test suites need `npm install` once at the repository root (jsdom and postcss). They do not
need a database.

---

## Publishing it

The front end is static, so it runs on any host. For Vercel:

1. Sign in at [vercel.com](https://vercel.com) with the GitHub account that owns the repository.
2. **Add New → Project**, import the repository and keep the framework preset **Other**
   (no build command, no output directory). `vercel.json` already sets headers and caching.
3. Deploy, then send future changes with `git push` — Vercel redeploys `main` automatically.

`404.html` is picked up automatically for unknown URLs. The API is not required for the site
to work; if you publish it too, set `MONGODB_URI` in the host's environment variables and never
commit the file containing it.
