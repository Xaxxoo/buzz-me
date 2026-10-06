# Quad (working title) — inter-university buzzer quiz prototype

A playable front-end prototype of a university quiz game in the style of the old pan-African TV quiz shows:
questions are read out word by word, and the first school to buzz gets to answer.

## Run it

Open `index.html` in a browser. There is no build step and no server.
It is designed for phones first and also works on desktop (Space to buzz, 1-4 to answer).
The two web fonts load from Google Fonts, so the type falls back to system fonts when offline.

## What is in it

- **Match:** pick a school, play eight toss-ups against a rival school from the same country. 10 for a right answer,
  15 if you buzz before the question ends, -5 for an early miss. A wrong answer gives the other side a steal;
  a right one earns a bonus question.
- **Daily challenge:** ten questions, the same for everyone each day (seeded by the UTC date), played once.
  The earlier you buzz, the more a right answer is worth (10 to 20).
- **Streak, rating and stats:** kept in the browser's localStorage.
- **Schools:** 626 universities in 52 African countries, plus "add your school" for anything missing.
- **Share:** result text copied to the clipboard.

## Files

| File | What it holds |
|---|---|
| `index.html` | Markup for every screen |
| `styles.css` | All styling and animation |
| `js/game.js` | Game logic, crest drawing, synthesized sound, confetti, saved progress |
| `js/questions.js` | The 40 questions (edit or add here) |
| `js/universities.js` | Schools grouped by country (edit or add here) |
| `licenses/` | Licence notice for the university list |

There are no image or audio files. Crests are generated SVG, sound effects are Web Audio oscillators.

## What is a placeholder

- **The rival is a bot.** There is no multiplayer and no backend. Its behaviour is in `nextQuestion()` and `rivalBuzz()` in `js/game.js`.
- **The name.** "Quad" is a working title.
- **Crests and abbreviations.** Crests are invented from each school's name, not real marks. About 70 abbreviations
  are set by hand; the rest are initials and some clash.
- **The school list is incomplete** and includes some polytechnics and colleges. It comes from the open
  Hipo university-domains-list (MIT licence): https://github.com/Hipo/university-domains-list
- **The questions have not been checked against sources.** Verify them before any public release.
- **Progress is per browser.** Nothing stops a second device or a restart mid-daily.

## Planned next (not built)

Live rooms by invite link, accounts, school leaderboards with weekly seasons, friend challenges,
a much larger verified question bank, and server-rendered share images.
