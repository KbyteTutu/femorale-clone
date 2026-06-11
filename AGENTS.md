# AGENTS.md — femorale-clone

## Project

**Modern clone of [femorale.com](https://femorale.com)** — one of the world's largest specimen shell catalogs and e-commerce platforms (conchology/malacology), operating since 1989.

This is a greenfield project with no legacy code, but now includes a mirror proxy for demo.

## Domain

The original Femorale is a scientific reference database + marketplace for shell collectors. Key concepts:

- **Taxonomical hierarchy**: Class → Family → Genus → Species → Subspecies
- **Specimen attributes**: size (mm), grade (F+, F++, GEM), locality, collection date, collector provenance
- **E-commerce**: shopping cart, user accounts, mailing lists
- **World Record Shells**: registry of maximum recorded sizes per species
- **Photo gallery**: 380,000+ specimen photos
- **Main classes**: Marine Gastropods, Marine Bivalves, Cephalopods, Polyplacophora, Scaphopods, Landsnails, Freshwater Gastropods, Freshwater Bivalves

## Architecture (guidance)

- **Original**: Classic ASP / ASP.NET on IIS 7.5, table-based HTML. Do NOT replicate this stack.
- **Target**: Modern React/Next.js or similar frontend with a Node.js or Python backend.
- **Database**: PostgreSQL (preferred for hierarchical taxonomic data) or document store.
- **Owner preferences**: Tu Kechao (@KbyteTutu) — primarily TypeScript and Python. Prefer TS/Node for web projects.

## Core entities (likely)

- `Species` / `Family` / `Class` — taxonomic tree
- `Specimen` — individual shell listing with grade, size, locality, images, price
- `Locality` — collection location (country, region, depth)
- `User` — buyer/seller accounts
- `Order` / `Cart` — e-commerce flow
- `WorldRecord` — max-size registry entries

## Mirror proxy (current implementation)

The repo contains a Node.js reverse-proxy mirror for internal demo use:

- **`src/server.js`** — Express entrypoint. Start with `npm start` or `node src/server.js`
- **`src/proxy.js`** — Catches all `/*` routes, fetches from femorale.com, transforms HTML
- **`src/transform.js`** — Price coefficient transform (regex-based: all `$XX.XX` → `$X.XX`×coefficient) + asset URL rewriting (relative → absolute)
- **`src/order.js`** — Standalone `/order` page with configurable items from `config.json`
- **`views/order.html`** — Order page template, uses `{{items}}` and `{{total}}` placeholders

### Config (`config.json`)

```json
{
  "port": 3000,
  "targetUrl": "http://www.femorale.com",
  "priceCoefficient": 0.05,
  "orderItems": [...]
}
```

- `priceCoefficient`: all prices on proxied pages are multiplied by this (0.05 = 1/20)
- `orderItems`: array of `{name, price, description}` for the standalone order page
- Change `port` if 3000 is occupied

### Key behaviors

- Only `text/html` responses are transformed; images/CSS/JS pass through unchanged
- Asset URLs (`src`, `href`, `action`, `srcset`, CSS `url()`) are rewritten to absolute femorale.com URLs
- External CDN URLs (`//code.jquery.com`) are preserved as-is
- Request cookies/headers are forwarded; cart AJAX (`/shop/cartstatus.asp`) is proxied
- `/order` route is excluded from proxying — renders standalone order page

### Commands

```bash
npm install          # install dependencies
npm start            # start mirror on config.port (default 3000)
node src/server.js   # same as npm start
```

## Getting started

```bash
npm install && npm start
# Mirror at http://localhost:3000
# Order page at http://localhost:3000/order
```

## Constraints

- Greenfield — no legacy code to maintain, but study femorale.com for feature parity decisions
- Owner is a full-stack TS/Python developer; avoid unfamiliar frameworks
- Domain is niche (conchology); taxonomical data structures will be central
