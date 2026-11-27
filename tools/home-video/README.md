# Home page background media (CR-348)

| File in `public/video` | Made how |
|---|---|
| `hero.mp4`, `winter.mp4` | Generated with ElevenLabs video generation (model `veo-3.1-fast-generate-001`, 8 s, 720p, no audio) from the prompts below, then made seamless with `make-loops.sh`. |
| `globe-wide.mp4` | Rendered from the same code the page draws live (`src/lib/globe.ts`): `render-globe.mjs video wide` with `globe-scene.html` and the bundled `globe.ts` (`esbuild src/lib/globe.ts --bundle --format=iife --global-name=GlobeLib --alias:@=src --outfile=globe.bundle.js`). One full turn in 40 s; the first and last frames match, which `src/test/globe.test.tsx` checks. |
| `*.jpg` | The still frame each video shows before it starts and to readers who ask for reduced motion. |

Land outline: Natural Earth 110m (public domain, `world-atlas` package), rasterised to a one-degree mask by `land-mask.mjs` and stored in `src/lib/globeLand.ts`.

Prompts (negative prompt for all: people, faces, hands, text, letters, logos, watermark, subtitles, bright white background, harsh flicker, camera shake):
- hero: Slow cinematic macro of luminous indigo and violet threads of light drifting and weaving across a deep navy void, soft out-of-focus bokeh specks, gentle parallax, elegant, calm, premium, abstract, dark background with plenty of empty space
- winter: Gentle snowfall through a deep navy night, soft out-of-focus indigo and violet bokeh lights glowing in the distance, calm winter atmosphere, slow drifting snowflakes, abstract and minimal, dark background
