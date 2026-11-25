# Rossell

Marketing site for **Rossell**, a workspace intelligence product, plus a MERN backend
(Node.js + Express + MongoDB) that stores the demo content and receives form submissions.

The front end is dependency-free vanilla HTML/CSS/JS. GSAP and the two variable fonts are
vendored locally, so the site renders and animates even without internet access.

---

## What is in here

```
.
├── index.html                 # the whole site (hero, features, analytics, integrations, blog, contact)
├── 404.html                   # playful not-found page (magnetic 404, same header + theme)
├── styles/
│   ├── main.css               # design tokens, components, sections, responsive rules, dark theme
│   ├── 404.css                # 404 page only: artwork, entrance, responsive rules
│   └── fonts/                 # Manrope + Plus Jakarta Sans (variable, self-hosted)
├── scripts/
│   ├── main.js                # theme, nav, modals, scroll reveals, charts, forms, filters
│   ├── 404.js                 # 404 page only: theme toggle, magnet, requested path
│   ├── api.js                 # fetch wrapper for /api with offline fallback
│   └── vendor/                # gsap.min.js + ScrollTrigger.min.js (no CDN dependency)
├── shared/
│   └── content.js             # SINGLE SOURCE OF TRUTH for all demo content (site + seeder)
├── assets/img/                # dummy blog imagery (replace before launch)
├── server/                    # Express + MongoDB API (see below)
└── tests/                     # jsdom tests for markup, styles and every interaction
```

### Site sections

| Nav item     | Section      | What it contains                                                       |
| ------------ | ------------ | ---------------------------------------------------------------------- |
| —            | Hero         | headline, CTAs, KPI counters, interactive product panel                |
| Features     | `#features`  | four feature cards + three-step "how it works"                         |
| Analytics    | `#analytics` | KPI cards, switchable SVG chart, channel bars, CSV export              |
| Integrations | `#integrations` | searchable catalogue, category filters, per-integration switches    |
| Blog         | `#blog`      | category filters, load more, article modal                             |
| Get in Touch | `#contact`   | contact details, validated form, FAQ accordion, legal modals in footer |

Also included: dark/light theme (persisted, follows the OS until the visitor chooses),
mobile navigation, scroll progress bar, back-to-top, toast feedback, trial sign-up modal,
newsletter form and keyboard/focus handling for every dialog.

### 404 page

`404.html` is a standalone page built from the same tokens, header pill and theme toggle:

- the three outlined digits lean toward the cursor (the bigger the pull, the closer it is)
  and ease back to rest; `prefers-reduced-motion` and touch screens get the still version
- the zero is a real `<button>`: it spins and answers with a new line each press
- the requested path is printed from `location` as text (never as markup)
- header, primary button and quiet links all lead back into the site

Any host serves it automatically: `express.static` lets a request fall through to a
catch-all that answers `404` with `404.html`, and missing assets/API routes keep their
JSON 404. Static hosts (Netlify, Vercel, GitHub Pages) pick up the file by convention.

---

## Run the front end only

Open `index.html` with any static server, e.g.:

```bash
npx serve .
# or the VS Code "Live Server" extension
```

The page works on its own: when `/api` cannot be reached it renders `shared/content.js`
and shows an honest "API offline" note after a form submission.

## Run the full stack (front end + API + MongoDB)

Requirements: Node 18+ and a running MongoDB instance.

```bash
cd server
cp .env.example .env          # adjust MONGODB_URI if needed
npm install
npm run seed                  # clears and fills the demo collections
npm run dev                   # http://localhost:4000
```

`server/server.js` serves both the API at `/api` **and** the static site from the repository
root, so one command is enough to preview everything. Without MongoDB the API answers `503`
and the site keeps working from its bundled content.

### API

| Method | Route                      | Purpose                                        |
| ------ | -------------------------- | ---------------------------------------------- |
| GET    | `/api/health`              | status + live MongoDB connection state         |
| GET    | `/api/posts`               | blog posts (`?category=`, `?q=`, `?limit=`)    |
| GET    | `/api/posts/:slug`         | single article                                 |
| GET    | `/api/integrations`        | integration catalogue (`?category=`, `?q=`)    |
| PATCH  | `/api/integrations/:slug`  | `{ connected: boolean }`                       |
| GET    | `/api/metrics`             | analytics metrics incl. their 12-week series   |
| GET    | `/api/testimonials`        | customer quotes                                |
| POST   | `/api/contact`             | contact form → `ContactMessage`                |
| POST   | `/api/subscribers`         | newsletter → `Subscriber` (deduplicated)       |
| POST   | `/api/trials`              | trial modal → `TrialRequest`                   |

Write endpoints are validated server-side and rate limited (10–20 requests/minute per IP).
Read endpoints return `503 { offline: true }` when MongoDB is not connected.

### Models

`Post`, `Integration`, `Metric`, `Testimonial` (content), `ContactMessage`, `Subscriber`,
`TrialRequest` (leads). See `server/models/`.

---

## Editing the dummy content

Everything — blog posts, integrations, metrics, testimonials, FAQs, contact details, legal
copy — lives in **`shared/content.js`**, which is loaded by the browser and by
`server/seed.js`. Change it once, then re-run `npm run seed` so MongoDB matches.

After swapping images in `assets/img/`, update the matching `image.src` values there.

Search the project for `TODO` to find every placeholder:

```bash
grep -rn "TODO" --include="*.js" --include="*.html" --include="*.css" .
```

> The copy, company names, people, metrics and images are **dummy content**. Replace them
> before this goes in front of real customers.

---

## Theme

- Tokens live in `:root` and are overridden by `[data-theme="dark"]` in `styles/main.css`.
- An inline script in `index.html` applies the stored/system theme before first paint (no flash).
- The header button toggles light/dark, stores the choice, updates `aria-pressed`, the
  button label and `<meta name="theme-color">`.

## Animations

Elements opt in with `data-anim="up | down | left | right | scale | rotate | fade"`;
`data-stagger` on a parent cascades its children; `data-counter` animates numbers.
GSAP ScrollTrigger reveals each element once, from its declared angle, with a long
`power3.out` ease. Wrap-up details:

- Elements are visible by default; JS only adds the entrance, so a blocked script or a
  failed GSAP load never leaves a blank page.
- `prefers-reduced-motion` disables reveals, marquee and parallax.
- The hero headline uses a masked line reveal; the analytics chart draws its path.

---

## Tests

```bash
npm install              # jsdom + postcss for the front-end suite (once)
npm test                 # 53 jsdom + structure tests (front end, incl. the 404 page)
npm run test:api         # 22 Express/API + seed-content + static/404 tests (no MongoDB needed)
```

Front-end tests load the real `index.html` and scripts in jsdom and drive the real DOM:
theme toggle, mobile menu (including Escape), scroll UI, both chart tab groups, CSV export,
integration search/filter/toggles/persistence/reset, blog filters/load-more/article modal,
FAQ accordion, trial modal (validation, success, reset, backdrop close), contact form
(validation, live and offline paths), newsletter, legal modals, toast behaviour, API
hydration and an "every button" error sweep. Structure tests check unique ids, working
anchors, labelled controls, existing assets, valid CSS, no emojis and the presence of TODO
markers.

API tests stub the Mongoose models, so they verify routing, validation, rate limiting,
serialisation and error handling without a database.

---

## Deployment

Nothing is deployed yet, by design. The static site is Vercel-ready, but the Express/Mongo
API needs a hosted MongoDB (Atlas) and either a Node host or Vercel serverless functions.
That step will be done separately on request.
