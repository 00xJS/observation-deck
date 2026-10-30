# Project: Observation Deck

Everything I've built, on one board. The deck is a dashboard-style portfolio:
- KPI tiles across the top: projects, live sites, interests, contributions, latest push
- a filter for each interest, plus search by name or stack
- a bento grid where flagship projects get the big tiles
- a detail drawer for each project, with why it exists, highlights, stack and links

**Live:** https://observation-deck.netlify.app/

## How it works

- [`projects.json`](projects.json) is the single source of truth. It has three parts:
  - `profile`: the handle and the stats used in the KPI tiles.
  - `constellations`: the interest groups, each with a name, colour and blurb. They drive the filter buttons and tile colours. The key name dates from the earlier star-chart design.
  - `projects`: one entry per project. `constellation` sets its interest. These optional fields change how it's shown:
    - `url`: the live site
    - `repo`: the GitHub repo name
    - `image`: your own screenshot instead of a captured one
    - `imageFit: "portrait"`: for phone screenshots
    - `flagship`: big 2×2 tile
    - `private` / `work`: no source link, plus a badge
    - `hidden`: kept in the manifest but not shown
    - `started`: used by the "Newest" sort
    - `stack` and `caseStudy`: tech tags and the drawer
- [`scripts/capture-screenshots.js`](scripts/capture-screenshots.js) visits every project with a `url` using Puppeteer. It saves a WebP screenshot to `images/` (unless the project has its own `image`) and writes [`status.json`](status.json): up/down, response time, capture date.
- [`scripts/sync-github.js`](scripts/sync-github.js) writes [`github.json`](github.json) with stars and last-push dates for every `repo`, plus the contributions-in-the-last-year total for the KPI tile (the same number as the GitHub profile graph, private contributions included).
  - It needs a token for GraphQL; the Actions token is enough. Locally: `GITHUB_TOKEN=$(gh auth token) npm run github`.
- A [weekly GitHub Action](.github/workflows/update-screenshots.yml) runs both scripts and commits the results, so the live badges and KPI tiles stay current.
- `index.html` renders everything with no build step. Projects without a screenshot get a generated bar-chart tile in their interest's colour. The design is dark-only (`color-scheme: dark`).
- Every project has a shareable link, `/#p-<id>`, that opens its drawer.

```bash
npm install
npm run screenshots   # refresh images/*.webp and status.json
npm run github        # refresh github.json (set GITHUB_TOKEN to avoid rate limits)
python -m http.server 5500   # preview at http://localhost:5500
```
