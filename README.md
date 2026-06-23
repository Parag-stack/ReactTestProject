# Omkara Data Room — Vite + React

A Vite + React port of the single-file **Daily Reading — Omkara Data Room** app.

## Setup

```bash
npm install      # install dependencies (not bundled in this zip)
npm run dev      # start the dev server at http://localhost:5173
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

## How API calls work (proxy)

The app calls **relative** paths and lets Vite's dev-server proxy forward
them to the real upstreams, so the browser only ever makes **same-origin**
requests — no CORS preflight, no `Access-Control-*` requirements.

| App fetches      | Proxied to                          | Host          |
| ---------------- | ----------------------------------- | ------------- |
| `/api/*`         | `https://omkaradata.com/api/*`      | main data hub |
| `/occ-api/*`     | `https://omkaracapital.in/api/*`    | TV bytes      |

Two prefixes are used because both upstreams expose their endpoints under
`/api/...`; `/occ-api` keeps them unambiguous and is rewritten back to
`/api` on the way out (see `vite.config.js`).

### Production

The Vite proxy only runs in `dev`/`preview`. For a deployed build, add the
equivalent rewrite at your host. On **Vercel** (`vercel.json`):

```json
{
  "rewrites": [
    { "source": "/api/:path*",     "destination": "https://omkaradata.com/api/:path*" },
    { "source": "/occ-api/:path*", "destination": "https://omkaracapital.in/api/:path*" }
  ]
}
```

Or front the static build with Cloudflare / nginx doing the same path forwarding.

## Architecture

This is a pragmatic port that preserves the original behaviour 1:1. The
original is an imperative, DOM-owning SPA (~8,300 lines), so React acts as a
thin shell rather than a full component rewrite:

```
index.html          Vite entry — fonts, Chart.js CDN, #root, module script
src/
  main.jsx          Mounts <App/>, imports global styles (no StrictMode — see note)
  App.jsx           Renders the original markup once, then runs initLegacyApp()
  appMarkup.html    The original <body> markup (imported with Vite ?raw)
  legacyApp.js      The original <script>, wrapped in initLegacyApp() and exported
  styles.css        The original <style> block, verbatim
vite.config.js      React plugin + dev proxy
```

**Why a shell and not full components?** The original code owns its DOM
directly (`getElementById`, `insertAdjacentHTML`, manual render functions).
React mounts the markup exactly once via `dangerouslySetInnerHTML` and never
re-renders it, so the imperative layer keeps full control and behaviour is
identical to the original file. `initLegacyApp()` is idempotent, so it runs
its bootstrap (event listeners, modal injection, timers, first fetch) once.

### What changed from the original

1. API endpoint string constants rewritten to relative paths
   (`https://omkaradata.com/api/*` → `/api/*`,
   `https://omkaracapital.in/api/*` → `/occ-api/*`).
2. The `<script>` body wrapped in `initLegacyApp()` and exported.
3. `<style>` and `<body>` markup split into their own files.

Nothing else — the application logic is unchanged.

## Update — watchlist company listing (WatchList_AddCompany, input:4)

The `WatchList_AddCompany` endpoint is now also used in **list mode**
(`input:4`) to load the companies belonging to each watchlist. Previously the
app synced watchlist *names* from the server but read their *companies* only
from localStorage, so a watchlist populated elsewhere showed a stale/short
list (the reported Portfolio bug).

What fires now:

- **On page load / refresh** — after the watchlist names sync, one
  `WatchList_AddCompany` POST (`input:4`) is sent per server-backed watchlist,
  so each shows up in the Network tab. Payload:
  `{"ID":"","WatchListID":<id>,"AccordCode":"","CompanyName":"","status":false,"input":4,"UserID":"2"}`
- **On selecting a watchlist** (Settings -> Watchlists) or **activating its
  chip** (Daily Reading) — its companies are loaded from the server (cached
  per session) and shown.

Server rows map to the app's company shape (`BseCode` -> `BSECode`,
`AccordCode` used as the stable id, server row `ID` kept as the deletable
`watchlistEntryId`) and are **de-duped by AccordCode** (the server can return
the same company twice). Console helper: `window.listWatchlistCompanies(175)`.

### Update — one company call per selection on page load

Earlier the page-load sync fetched companies for *every* watchlist (one
`WatchList_AddCompany` input:4 POST each), so the Network tab showed several
on load. Now page load fetches companies for **only the selected watchlist**
— a single input:4 POST — and every other watchlist loads lazily when it is
selected (Settings list) or its chip is activated (Daily Reading).

The selected watchlist is persisted (`localStorage: omkara.wl.editing`) so a
reload keeps the same selection and the single call targets it. Tradeoff:
unselected watchlists' company counts come from the local cache (or show 0
until first selected after a cache clear), since accurate counts for all
watchlists would require one call per watchlist.
