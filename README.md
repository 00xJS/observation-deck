# Project: Observation Deck

A dynamic webapp landing page designed as the central hub to showcase my portfolio of projects. The **Observation Deck** delivers an intuitive, seamless user experience, effortlessly guiding visitors through my work while being easily modular for future updates.

**Live:** https://observation-deck.netlify.app/

## How it works

- [`projects.json`](projects.json) is the single source of truth — the page and the screenshot pipeline both read it. Adding a project is one JSON entry.
- [`scripts/capture-screenshots.js`](scripts/capture-screenshots.js) visits every project with Puppeteer, saves a compressed WebP screenshot to `images/`, and writes [`status.json`](status.json) (up/down, response time, capture date).
- A [weekly GitHub Action](.github/workflows/update-screenshots.yml) runs the capture and commits fresh screenshots + status, so the deck's "last scan" and LIVE indicators stay current.
- `index.html` renders the deck from those files: a dark-only mission-control design (`color-scheme: dark` — there is no light theme), per-project live badges, and a live BTC ticker chip.

```bash
npm install
npm run screenshots   # refresh images/*.webp and status.json locally
```
