# n-burk.github.io

Personal site — generative 3D character pipelines.

Live: https://n-burk.github.io/

## Stack
Pure static — HTML / CSS / vanilla JS + a Babel-transpiled React tweaks panel.
No build step. Drop into any static host.

## Files
- `index.html` — page
- `hero-field.js` — drifting point-cloud canvas
- `pipeline-graph.js` — interactive USD pipeline node graph
- `page.js` — scroll reveals, timeline scrollspy, anchor scroll
- `image-slot.js` — drag-and-drop image placeholder web component
- `tweaks-panel.jsx` / `tweaks.jsx` — in-page tweaks (palette, density, type)

## Deploy
GitHub Pages serves directly from `main` / root. Nothing to configure.
