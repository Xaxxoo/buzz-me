# Quad (working title) — inter-university buzzer quiz

A Next.js port of the playable prototype. Questions are read out word by word, and the first school
to buzz gets to answer. There is no backend yet: the rival is a bot and progress is saved in the browser.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

`npm run build` then `npm start` runs the production build. Node 20.9 or newer.

## Deploy on Vercel

Import the repo and Vercel detects Next.js by itself. If the project was first created with the
"Other" preset (for the static version), change **Framework Preset** to **Next.js** in the project
settings, and make sure **Root Directory** is the folder that holds `package.json`.

## Stack

Next.js 16 (App Router), React 19, TypeScript. No UI or state libraries. Styling is one global
stylesheet. There are no image or audio files: crests are generated SVG and sound is Web Audio.

## How it is put together

```
app/
  layout.tsx          metadata, viewport, font links
  page.tsx            renders <Game />
  globals.css         all styling and animation
components/
  Game.tsx            client root: owns the engine, routes between screens, keyboard controls
  Backdrop.tsx        sunburst, confetti canvas, buzz flash
  Crest.tsx           generated school crest
  screens/            Menu, Picker, Versus, Match, Result, Stats
lib/
  engine.ts           GameEngine: every timer and all match state, no React inside
  save.ts             saved progress, streak, rating inputs, the daily's seeded question set
  schools.ts          school lookup, abbreviations, crest colours, rival picking
  config.ts           game name, round counts, timings
  sfx.ts, confetti.ts, hooks.ts, types.ts
  data/questions.ts   the 40 questions
  data/universities.ts  626 schools in 52 countries
```

`GameEngine` publishes an immutable state snapshot; `Game.tsx` subscribes to it with
`useSyncExternalStore` and the screens render from that snapshot. Game rules live in the engine,
so they can be changed or tested without touching components.

## Where the real product plugs in

- **Multiplayer.** The rival is driven by three methods in `lib/engine.ts`: the plan made in
  `nextQuestion()`, `rivalBuzz()` and `rivalSteal()`. Replace them with events from a room server
  (the plan was one Cloudflare Durable Object per room) and the rest of the flow stays.
- **Accounts and leaderboards.** `loadSave()` and `writeSave()` in `lib/save.ts` are the only
  storage calls. Point them at an API.
- **Questions.** `lib/data/questions.ts`. First option is the right one; the game shuffles them.
- **Name.** `GAME_NAME` in `lib/config.ts`.

## What is still a placeholder

- The rival is a bot, and nothing is server-side, so scores can be edited in the browser.
- "Quad" is a working title.
- Crests are invented from each school's name, not real marks. About 70 abbreviations are set by
  hand; the rest are initials and some clash.
- The school list is incomplete and includes some polytechnics and colleges. It comes from the open
  Hipo university-domains-list (MIT, notice in `licenses/`): https://github.com/Hipo/university-domains-list
- The questions have not been checked against sources. Verify them before any public release.
- The daily can be replayed by quitting part-way or using a second device.
- Fonts load from Google Fonts with a `<link>`. Switch to `next/font` to self-host them.
