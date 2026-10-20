# eFCOB Admin Studio

One admin page for the eFCOB card makers. Open `index.html` in Chrome or Edge.

- **One left column:** a "Choose card type" dropdown at the top; the chosen card's editor sits under it.
  The right side shows only the live poster, sized to fit.
- Switching card types keeps your edits in each maker until you reload the page.
- On a phone the poster sits on top and the column scrolls under it.
- The address remembers the open card (`index.html#comparison`), so you can bookmark one.

## Card types

| Card name | Folder | Status |
|---|---|---|
| Player Comparison | `tools/comparison/` | ready (comparison poster, Option 2 / v2) |
| MVP | `tools/mvp/` | ready |
| Match Result | `tools/match-result/` | ready |
| Top 4 | `tools/top-4/` | ready |
| Player vs Player | `tools/player-vs-player/` | ready |
| Team vs Team | `tools/team-vs-team/` | ready |

### MVP
One player, 1080 × 1350, "Big MVP" layout: huge MVP letters behind the player, stats row across
the chest (first stat is the coloured headline tile, max 5), name bar with "team · score vs opponent".
Same auto cut-out and drag/size controls as Player Comparison.

Background (dropdown at the top of the form):
- **Template** (default): fixed design, same for every jersey. Shatter (orange + blue, default) or Neon (cyan + magenta).
- **Jersey colours (auto)**: colours come from the player's jersey. Plain black/white jerseys get a
  dark base with a two-colour pair you can pick (gold + purple by default).
- **Upload my own**: admin's 1080 × 1350 image becomes the whole background; letters, stats and
  name bar stay on top in the chosen colour pair.

### Match Result
Two teams, 1080 × 1350. Two layouts (dropdown at the top of the form):
- **Wave Split**: the winner always sits in the big top half (the teams swap on their own when Team 2 wins), with crown,
  WINNER badge and the player's name; the loser sits under the wave with a DEFEAT box. Score medal in the middle.
- **Match Ticket**: a paper match ticket; both players side by side, WINNER / DEFEAT tags with player names, scorers, barcode.

Per team: name, player, goals, goal scorers (comma or new line), photo (auto cut-out, drag/size), optional team logo,
two colours with "Auto from jersey" and "Auto from logo". A draw shows DRAW and no tags.

Background: **Default template** (fixed eFCOB colours), **Jersey / logo colours (auto)** (each team's colour; white/black kits
use their trim, plain black/white kits get purple + gold), **Upload my own** (admin's 1080 × 1350 image behind everything).

The Player Stats Card is not in the studio; it lives on the client side of efcob.com
(see efcob-player-cards).

Each maker also works on its own: open `tools/<name>/index.html` directly.

## Adding a new card type

1. Put the new maker in `tools/<id>/` with its own `index.html`.
2. In `index.html`, find `CARD_TYPES` and add one line:
   `{ id: "mvp", name: "MVP", src: "tools/mvp/index.html" },`

## Notes

- Auto cut-out (Player Comparison and MVP) needs internet (downloads a model the first time).

Each maker draws the "Choose card type" dropdown itself (`js/studio-nav.js`, copy it into a new tool and add
`<script src="js/studio-nav.js"></script>` to its index.html). Opened on its own, a maker shows only its form.

### Top 4
Final standings, 1080 × 1350. Two layouts: **Podium** (four glass steps, champion on the highest) and
**Leaderboard** (champion hero with points, wins, goal difference and prize, then 2nd to 4th as rows).
Background: **Default template** with a theme (Navy is the default; Jewel, Ocean, Emerald, Ember are toned mesh
themes with two diagonal bands), **Jersey colours** (blocks/rows take each player's kit colour) or **Upload my own**.
Per player: name, team, points, W/D/L, photo (auto cut-out, drag/size), optional team logo, kit colour.
Photos are auto-fitted by head size, so every head comes out the same size for its place.
Partners strip at the bottom: up to 5 names or logos plus a website line.

### Player vs Player
Pre-match poster, 1080 × 1350 (downloads in HD, 2160 × 2700). Seven layouts:
**Lightning Split**, **Neon Frames**, **Slash Plates**, **Chrome Bar**, **Halftone Slash**, **Smoke** and **Brush** (the last
two are shared with Team vs Team; Brush shows a big outline short name per player, taken from the "Short name" field or
the first part of the player name). Lightning, Slash and Halftone
also have a **Players** choice: *Side by side* or *Upor-nich* (team 1 high on the left, team 2 low on the right, names follow
their player). Neon Frames, Chrome Bar, Smoke and Brush are side by side only.
Background: **Default template** (fixed colours for each layout), **Jersey / logo colours (auto)** (each side takes its
team colour; white/black kits use their trim, plain black/white kits get purple) or **Upload my own**.
Poster fields: title (stage), event, small tag, date, kick-off time, the text after the time, optional eFCOB logo.
Per team: team, player, photo (auto cut-out, drag/size), optional team logo (sets the colours), main + light colour.
Photos are fitted by head size and are not sharpened, so faces stay clean; use photos at least about 1000 px tall.
Every text block (header, title, VS, team names, date line) can be dragged on the poster and resized with the mouse
wheel, like the photos; this is kept separately for each layout and arrangement.
**Reset to default** puts all sections and both photos of the current layout back.
Partners strip at the bottom: up to 5 names or logos plus a website line.

Every part (header, title, photos/crests, Brush outline words, VS, names, date line, partners strip) can be switched off
under **Poster e ki ki thakbe**, per layout; **Reset to default** brings back positions, sizes and hidden parts.

### Team vs Team
Club crest vs club crest, 1080 × 1350 (HD download 2160 × 2700), with the partner strip. Four layouts:
- **Ball**: each crest is wrapped round a 3D football in the team colours (a crest in the same colour as its team gets a white ball).
- **Smoke**: team-colour smoke over a pitch, fiery VS.
- **Stadium Shield**: floodlit stadium, crests on white shield cards with a team-colour banner.
- **Brush**: neon panels with paint strokes and a big outline short name; chrome cyberpunk (Orbitron) VS under a gold ball.

Background: Default template (fixed colours), Team colours (auto from the logo) or Upload my own. Per team: team name, logo
(a plain white/black background is cut away automatically; colours come from the logo), and a short name for Brush.
In Smoke and Brush, tick **Captain er chobi soho** to show the captain's cut-out photo instead of the crest; the crest then
sits next to the team name, with the captain's name below. Crests, photos and every text block can be dragged and resized
with the mouse wheel; **Reset to default** puts them back.

Every part (header, title, photos/crests, Brush outline words, VS, names, date line, partners strip) can be switched off
under **Poster e ki ki thakbe**, per layout; **Reset to default** brings back positions, sizes and hidden parts.
