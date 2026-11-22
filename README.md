# Biliardo Tournament 🎱

A ready-to-use website for running billiards tournaments. No login, no server, no build step.

## Features

- **Start Game**: one button starts a quick match. Type the two player names and an optional referee, then play.
- **Tournaments**: knockout brackets (byes are handled automatically) or round-robin leagues, with seeding and a random draw.
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

All data is saved in the browser (`localStorage`) on the device running the scoreboard. To move it to another device, export a backup on the first device and import it on the second.

## Deploy on Netlify

1. In Netlify, go to **Add new site → Import an existing project → GitHub** and pick this repository.
2. Leave **Build command** empty and set **Publish directory** to `.` (the `netlify.toml` file already sets this).
3. Press **Deploy**. That's it.

You can also drag and drop the project folder onto <https://app.netlify.com/drop>.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Keyboard shortcuts (scoreboard)

| Key | Action |
| --- | --- |
| `1` / `←` | Rack (or +1 point) to player 1 |
| `2` / `→` | Rack (or +1 point) to player 2 |
| `Space` | Start or pause the shot clock |
| `Z` / `U` | Undo |

## Files

```
index.html            app shell
css/style.css         design system and layout
js/app.js             app logic: routing, tournaments, scoring, leaderboard
js/rules.js           rules content
js/referee.js         animated referee SVG
assets/referee.svg    standalone referee illustration
assets/favicon.svg    icon
netlify.toml          Netlify config
```
