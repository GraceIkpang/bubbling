# Bubbling — Abuja vibe prototype

Frontend-only, clickable prototype of the "live social map + vibe forecast for Abuja" concept.
All data is local sample data; there is no backend.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
npm run build:single # one self-contained HTML file in dist-single/index.html
```

## What's in it

| Flow from the brief | Where |
| --- | --- |
| "What vibe are you looking for?" (Popping · Social · Chill · Date night · Dinner · Brunch) | Discover tab |
| Describe your night (free text → vibe, area, music, budget, extras) | Discover tab, search field |
| Tonight in Abuja list: pulse, confidence, area · drive time, best window, closing time | Tap a vibe |
| Now · Tonight · Tomorrow · Fri · Sat (forecast only, never shown as live) | Time switcher on results |
| Filters: crowd, music, budget, area, extras; brunch gets its own filter set | Results → Filters |
| Schematic map with pins coloured by crowd level, swipeable card rail synced to pins, crowd filters (Open now · Busy · Relaxed · Live data) | Map tab, or map toggle on results |
| Live vs usual on the hourly chart (dashed = usual, solid = live) | Venue → "How busy is it usually?" (Cue Bar shows it) |
| One-tap "Here now? How busy is it?" that also tells you whether you matched what we showed (Pulse Accuracy) | Venue page, when open now |
| Venue page: right now, next few hours, hourly forecast by day, suggested arrival, week outlook, event, vibe traits, details, directions, reserve | Tap any venue |
| LIVE vs EXPECTED vs VENUE REPORTED vs COMMUNITY REPORTED | Source tags everywhere |
| Expected Popping → Currently Moderate | Cue Bar |
| Reported closed tonight → similar places nearby | Aura Lounge |
| Low confidence: "Likely lively", "Not enough live data" | Moscow Underground |
| "I'm going" → later "How is it there?" → report feeds the live model (3 reports = live) | Venue → I'm going |
| "Where should we go tonight?" wizard (when, crowd, music, budget, area, group) | Plan tab |
| Saved venues + "alert me when it gets busy" | Saved tab, bell on venue page |
| Alerts ("Tokyo Nightlife is getting busy") | Bell on Discover |

The **prototype controls** (right panel on desktop, clock button on phones) change the simulated
day and time so you can watch the Vibe Engine shift, and jump straight to each edge case.

## Code map

- `src/data.js` — 12 venues from the brief. Names, ratings and categories are from the brief;
  areas, hours, events, phone numbers and vibe traits are **placeholders** to verify.
- `src/engine.js` — Vibe Engine: historical curve by venue type × day multiplier × events,
  overridden by recent community reports when there are enough. Returns level, source and
  confidence, and never labels a forecast as live.
- `src/store.jsx` — app state (clock, navigation, reports, saved, alerts).
- `src/screens/*` — Home, Results (+ filters), MapView, Venue, Report, Plan, Saved, Alerts.
- `src/styles.css` — light theme. Tokens at the top: light yellow accent (selection, highlights,
  badges; never text), black pill buttons, grey tiles. Each crowd level has a dark text tone
  (passes 4.5:1 on white) and a brighter fill tone for bubbles, bars and pins.

## Visual direction (Mobbin)

Light mode with a light yellow accent, loosely after:
- **TickPick** — greeting + big headline, search pill with a location chip inside, chip row that
  filters the feed, large image cards with name and status dot over the art (Home, Results).
- **Tripadvisor** — heavy headlines, underlined black "See all" links, full-bleed promo strip
  (used for live alerts), white round buttons over the venue hero.
- **Klarna** — floating capsule tab bar with the active tab in a grey pill, white sheets with
  bold titles, grey list tiles and black pill CTAs.
- **Bumble** — yellow as the selection colour, rounded grey chips with emoji, toggles.
- **Artsy** — restraint: black event card, plain sans type, no decoration for its own sake.

## Design references (Mobbin)

Popular-times charts: Google Maps (live-over-usual bar), Swarm, Snapchat, IKEA ("predictions based on
previous visits" disclaimer). Crowd reporting: corner's inline "is this place crowded?" card,
Google Maps "Add a report", Swarm rating sheet, Transit ("79% say on time"). Map + card rail:
Places, CAVA, Shopee, Transit. Filter sheets: Zomato, Airbnb, Tock.
Nightlife discovery: Zomato "Party Vibes", Posh, corner "top picks" (new · trending · lowkey).

## Deploy

Deployed to https://bubbling-prototype.vercel.app (Vercel builds with Vite into `dist/`, see `vercel.json`).

```bash
vercel --prod
```
