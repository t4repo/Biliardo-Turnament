# Biliardo Tournament 🎱

A ready-to-use website for running billiards tournaments. No login and no build step. Tournaments can be published online so anyone can follow them live.

## Features

- **Start Game**: one button starts a quick match. Type the two player names and an optional referee, then play.
- **Free Play**: casual play for 2, 3 or 4 players. Choose the points to win (1 to 15) and press **+1 Point** for the player who wins each game (keys `1`–`4` also work). The first player to reach the target wins: pick 9 and the first to 9 wins. Includes undo, Finish now and Play again.
- **Tournaments**: knockout brackets (byes are handled automatically) or round-robin leagues. Round 1 can be a random draw, seeded by list order, or **paired by hand**. **✎ Edit pairings** changes who plays who in any round before it starts. Picking a player who is already in another match swaps the two. In a round-robin league the other unplayed matches are moved to other rounds automatically, so everyone still plays everyone exactly once. Every match shows where its winner goes next (**Winner → SF 1**), and **Result** enters a winner without live scoring.
- **Online sharing & public history**: press **🌐 Publish online** on a tournament to save it on the web.
  - **Viewer link**: anyone can follow the bracket, wins and points live from any phone, without changing anything.
  - **Scorer link**: give it to referees you trust so they can enter scores from their own phones. Changes from every device are merged.
  - **History**: every published tournament is listed on the public **History** page.
- **Categories**: 8-Ball, 9-Ball, 10-Ball, Straight Pool (14.1), Snooker and Italian 5-Pins (Cinque Birilli).
- **Live referee scoreboard**: an animated SVG referee points to the player who scores, crosses arms for a foul and raises both arms for the winner. Also includes:
  - foul tracking, with the three-foul rule applied automatically
  - a shot clock (30 s / 60 s, +30 extension)
  - a match timer and a full match log
  - **undo** for any action
  - fullscreen mode for a TV or tablet
- **Leaderboard**: wins, losses, win %, games for and against, difference, last-five form and ranking points (win = 3). Filter it by tournament or category, and print it.
- **Players & Referees**: a roster with rename and remove. It also shows how many matches each referee officiated.
- **Rules**: rule summaries for every category, plus tournament, referee-signal and conduct guidelines.
- **Data**: export and import a JSON backup, load a demo tournament, or reset everything.

Everything is always saved in the browser (`localStorage`) of the device you use. Published tournaments are also saved online, in Netlify Blobs.

## How online sharing works

- The site is static (`site/`) plus one Netlify Function, `netlify/functions/api.mjs`. Its logic is in `netlify/lib/api-core.mjs`.
- Data is stored in **Netlify Blobs**, which every Netlify site already has, so there is nothing to set up.
- Publishing creates a secret access key on the organiser's device. The server stores only a hash of it. Anyone can read a published tournament, but changing it needs the key, which only the organiser and people given the scorer link have.
- Each match records when it last changed. When two devices change different matches, both changes are kept. When they change the same match, the newest change wins. The bracket is rebuilt from finished matches, so a winner is never lost.
- Viewer pages refresh every 4–8 seconds, and scorer pages every 10 seconds. Refreshing pauses while the tab is hidden.

API: `GET /api/t` (public list) · `GET /api/t/:id` (public tournament) · `PUT /api/t/:id` and `DELETE /api/t/:id` (need the `x-admin-key` header).

## Deploy on Netlify

1. In Netlify, go to **Add new site → Import an existing project → GitHub** and pick this repository.
2. Leave the build settings as they are. `netlify.toml` sets the publish directory to `site` and the functions folder, and Netlify installs `package.json` automatically.
3. Press **Deploy**.

Online sharing needs the Netlify deploy, because it uses a function. The rest of the site also works as plain files.

## Run locally

Serve the `site` folder to use everything except online sharing:

```bash
cd site && python3 -m http.server 8080
# then open http://localhost:8080
```

To also try online sharing locally, use the Netlify CLI from the repository root: `npx netlify dev`.

## Keyboard shortcuts (scoreboard)

| Key | Action |
| --- | --- |
| `1` / `←` | Rack (or +1 point) to player 1 |
| `2` / `→` | Rack (or +1 point) to player 2 |
| `Space` | Start or pause the shot clock |
| `Z` / `U` | Undo |

## Files

```
site/index.html              app shell
site/css/style.css           design system and layout
site/js/app.js               app logic: routing, tournaments, scoring, leaderboard, online sync
site/js/rules.js             rules content
site/js/referee.js           animated referee SVG
site/assets/                 referee illustration and icon
netlify/functions/api.mjs    online API (Netlify Function)
netlify/lib/api-core.mjs     API logic: validation, merging, history index
netlify.toml                 Netlify config
package.json                 @netlify/blobs dependency for the function
```
