# PRD: Inter-University Quiz Game

October 11, 2026 · Aliyu Ahmad
Updated October 16, 2026 · Campus World addendum

---

## Overview

We are building a real-time, buzzer-based quiz game where students play solo against the computer, head-to-head against students from other universities, or as university teams in scheduled challenges. Every result feeds a player leaderboard and a university leaderboard, so each game is also a contribution to your school's rank.

**Problem.** Inter-university quiz competitions today are rare, physical, and expensive to organise. Most students never get to represent their school, and there is no persistent, public measure of which university is sharpest.

**Vision.** The always-on arena for campus rivalry: open the app, hit the buzzer within seconds, and climb for yourself and your university.

**Working name:** Campus Buzz (placeholder).

---

## Goals, non-goals and success metrics

The product succeeds if students come back daily and universities compete in scheduled challenges every week.

### Goals

- Make a match start in under 10 seconds from opening the app (solo or quick match).
- Make the buzzer feel fair: the first person to press, after network delay is accounted for, wins the right to answer.
- Let any student organise a team or a university challenge without an admin.
- Give universities a public, trustworthy ranking students want to defend.

### Non-goals (v1)

- ~~Cash prizes, betting or paid entry.~~ **Updated:** Prize Rounds are designed and built behind a feature flag (PR1) but **not enabled** in any environment until legal review is complete. There is never an entry fee (PR3).
- Live video or voice chat between players.
- Official accreditation of university affiliation (v1 uses lightweight verification; see Risks).
- User-generated question banks (admin-curated only in v1).

### Success metrics (targets to be confirmed after beta)

| Metric | Definition | Target at 3 months |
|--------|------------|--------------------|
| Day-7 retention | Share of new players who play again on day 7 | Open question |
| Matches per active player per week | Completed matches / weekly active players | Open question |
| Challenge acceptance rate | Scheduled challenges accepted by another university before start time | Open question |
| Universities with 10+ linked players | Count of universities meeting the threshold | Open question |
| Median buzzer fairness complaints | Reports tagged "buzzer" per 1,000 matches | Open question |
| Involuntary logouts | Sessions ended without the user signing out | **0** |

---

## Target users and personas

The core user is a university student on a phone; organisers and spectators are secondary.

| Persona | Who | What they want | Key features |
|---------|-----|----------------|--------------|
| Casual solo player | Student killing 5 minutes between lectures | Quick, fun rounds with no setup | Play vs computer, quick match, categories |
| Competitive player | Student who wants to be top of the board | Rank, recognition, tough opponents | Online 1v1, player leaderboard, ranked mode |
| Team captain | Quiz club member or class rep | Gather friends and represent the school | Create team, invite link, team matches |
| Challenge organiser | Student union officer, quiz society lead | Run a scheduled university-vs-university event | Create challenge, schedule, share link |
| Spectator | Fellow students, alumni | Watch their school compete live | Join shared challenge link as viewer |
| Unaffiliated player | Non-student or student who prefers privacy | Play without linking to a school | Optional university link |
| **Campus explorer** | **Student curious about other campuses** | **Tour other universities, earn stamps** | **Campus World, landmark challenges, passport** |

---

## Core concepts

| Term | Meaning |
|------|---------|
| Player | A user with a unique username, optionally linked to one university |
| University | A verified institution entity that players link to and that holds a rank |
| Buzzer | The single button a player presses to claim the right to answer the current question |
| Match | One game session of N questions between two sides (player vs computer, player vs player, or team vs team) |
| Solo match | A player vs a computer opponent with adjustable difficulty |
| Quick match | An online 1v1 against a random player from another university, via matchmaking |
| Team | A named group of 2–5 players (size open) formed by a captain via an invite link |
| Challenge | A scheduled university-vs-university match created by an organiser, open for another university to accept |
| Category | A question topic (e.g. Science, History, Sports, Current Affairs, Entertainment, Trivia) |
| Trivia | A mixed category drawing light, fun questions across all topics |
| Spectator | A user watching a match live without playing |
| **Campus** | **A stylised isometric map of a university, with landmarks and activities** |
| **Tour match** | **A match played while "visiting" another campus in Campus World** |
| **Landmark challenge** | **A short set of questions tied to a specific campus landmark (e.g. 5 questions at the library)** |
| **Passport** | **A player's collection of stamps earned by completing all landmark challenges at a campus** |
| **Business listing** | **A sponsored pin on a campus map for a nearby business (cafe, bookshop, etc.)** |
| **Prize Round** | **A surprise skill-based event with real-money prizes, behind a feature flag** |

---

## Functional requirements

Requirements are grouped by feature area; P0 = must ship in v1, P1 = soon after, P2 = later.

### Accounts and identity

| ID | Requirement | Priority |
|----|-------------|----------|
| A1 | Sign up with email, phone number, or Google; a guest can play solo before signing up and keep progress when converting | P0 |
| A2 | Every user picks a unique username (3–20 chars, letters, digits, underscore; case-insensitive uniqueness; profanity filter) | P0 |
| A3 | Username can be changed once every 30 days; old name reserved for 30 days | P1 |
| A4 | A player may optionally link to one university; linking is a choice and can be skipped | P0 |
| A5 | University link is verified via institutional email (e.g. @unilag.edu.ng) or marked "unverified"; only verified players count toward university rank | P0 |
| A6 | A player can change university at most once per season | P1 |
| A7 | Profile shows username, university, rating, matches played, win rate, favourite categories, **campuses visited count, and passport stamps (CT7)** | P0 |

### Persistent sessions (never logged out)

| ID | Requirement | Priority |
|----|-------------|----------|
| S1 | Sessions never expire from inactivity; the user stays signed in until they sign out, delete the account, or are banned | P0 |
| S2 | Use short-lived access tokens with silently rotated, long-lived refresh tokens bound to the device | P0 |
| S3 | A token refresh failure due to network must retry, never sign the user out | P0 |
| S4 | Users can view and revoke their signed-in devices from settings | P1 |
| S5 | If the app closes mid-match, reopening it rejoins the match if still live (30-second reconnect window) | P0 |

### Buzzer gameplay

| ID | Requirement | Priority |
|----|-------------|----------|
| B1 | Question text reveals; buzzer unlocks at the same server time for all players | P0 |
| B2 | First valid buzz (server-ordered, latency-compensated) locks out others and gives that player a 10-second answer window | P0 |
| B3 | Early buzz before unlock triggers a short lockout penalty for that question | P0 |
| B4 | Answers are multiple choice (4 options) in v1; typed answers are P2 | P0 |
| B5 | Wrong answer passes the question to the other side (rebound) with a fresh answer window | P0 |
| B6 | Haptic and sound feedback on buzz; visible indicator of who buzzed first | P0 |
| B7 | In team matches, any teammate can buzz; only the buzzing player answers | P0 |

### Play vs computer

| ID | Requirement | Priority |
|----|-------------|----------|
| C1 | Player can start a solo match against a computer opponent instantly, no network opponent needed | P0 |
| C2 | Three difficulties (Easy, Medium, Hard) set the bot's buzz speed and accuracy | P0 |
| C3 | Solo matches award XP but do not change ranked rating or university points | P0 |
| C4 | Solo mode works on weak connections (questions prefetched per match) | P1 |

### Online play vs other universities

| ID | Requirement | Priority |
|----|-------------|----------|
| O1 | Quick match pairs a player with an online opponent, preferring a different university and similar rating | P0 |
| O2 | If no human is found within 20 seconds, offer a bot match or keep waiting | P0 |
| O3 | Players can see who is online by university and send a direct challenge | P1 |
| O4 | Ranked matches change player rating and award university points | P0 |
| O5 | A friendly (unranked) match can be started via a private link | P1 |

### Teams

| ID | Requirement | Priority |
|----|-------------|----------|
| T1 | Any player can create a team with a name; creator is captain | P0 |
| T2 | Creating a team generates a shareable invite link (works in WhatsApp, X, etc.); tapping it opens the app or web and joins the team | P0 |
| T3 | Team members must share the captain's university for a university-representing team; mixed teams play unranked | P0 |
| T4 | Captain can remove members, regenerate the link, and transfer captaincy | P1 |
| T5 | Team lobby shows members, ready status, and a start button for the captain | P0 |
| T6 | Captain can queue the team for a match against a team from another university | P0 |

### University challenges

| ID | Requirement | Priority |
|----|-------------|----------|
| U1 | A verified player can create a challenge on behalf of their university: date, time, category mix, number of questions, team size | P0 |
| U2 | The challenge appears on a public Challenges board until another university accepts it | P0 |
| U3 | A challenge produces a shareable link; anyone can open it to see details, RSVP, and watch live | P0 |
| U4 | Players from the creating and accepting universities can join as players until team slots fill; others join as spectators | P0 |
| U5 | Reminders by push notification 24 hours and 15 minutes before start to players and RSVPs | P0 |
| U6 | Unaccepted challenges expire at start time; organiser can reschedule or cancel | P0 |
| U7 | A challenge can target a specific university (direct challenge) or be open to all | P1 |
| U8 | Challenge results show on both universities' pages and award university points | P0 |

### Categories

| ID | Requirement | Priority |
|----|-------------|----------|
| K1 | Players choose one or more categories before a match; matchmaking pairs on overlapping categories | P0 |
| K2 | Launch categories: Trivia, General Knowledge, Science, History, Geography, Sports, Entertainment, Current Affairs (final list open) | P0 |
| K3 | Trivia is a standalone category of light, mixed questions | P0 |
| K4 | Each question carries category, difficulty, and source; admins manage the bank in a CMS | P0 |
| K5 | Per-category leaderboards | P1 |

### Leaderboards

| ID | Requirement | Priority |
|----|-------------|----------|
| L1 | Player leaderboard: global, by university, and by category; weekly, seasonal and all-time views | P0 |
| L2 | University leaderboard: ranked by university points; weekly, seasonal and all-time | P0 |
| L3 | A player sees their own position even when outside the top 100 | P0 |
| L4 | Leaderboards update within 60 seconds of a match ending | P0 |

### Social and notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| N1 | Push notifications for challenge accepted, challenge starting, team invite joined, rank change | P0 |
| N2 | Shareable result cards after a match | P1 |
| N3 | Report a player or a question | P0 |

---

## Campus World

Campus World adds four features: 3D isometric campus maps, a campus tour mode, business listings on the map, and skill-based prize rounds. All features are additive — they must not degrade any P0 requirement listed above.

**P0 constraints protected by every Campus World requirement:**

| Constraint | PRD IDs | How Campus World protects it |
|------------|---------|------------------------------|
| Buzzer fairness | B1, B2, G1 | Map freezes/dims during live questions; renderer yields to main thread; three.js is never on the critical path for buzz input |
| Never log out | S1, S3 | No new auth flows; Campus World uses existing session tokens |
| 3G / low-end Android | H3, C4 | Static fallback for incapable devices; lazy-loaded assets; campus list API < 10 KB; map assets cached separately |
| Match data < 1 MB | Data size NFR | Map and business data loaded and cached independently from match data |
| Reduced motion | G6 | Static image shown when `prefers-reduced-motion` is set |
| Mobile fit | M1 | Pins never cover buzzer or answer options; map dismissed during gameplay |

### 3D isometric campus maps (CW)

| ID | Requirement | Priority |
|----|-------------|----------|
| CW1 | Each university can have one stylised low-poly isometric map with standard landmarks: main gate, library, faculties, hostels, sports ground, cafeteria | P1 |
| CW2 | Maps render with three.js using an orthographic camera at a fixed isometric angle; low-poly geometry with baked lighting, no real-time shadows | P1 |
| CW3 | The map is ambient on home, lobby and results screens; during a live question the map dims, freezes or pauses so it never costs frames or adds input latency to the buzzer (B1, B2, G1 protected) | **P0** |
| CW4 | Each campus asset is lazy-loaded and kept under 2 MB compressed (glTF + Draco or meshopt) | **P0** |
| CW5 | On low-end devices (< 4 GB RAM or GPU blacklist), slow networks (effective connection type `2g`/`slow-2g`/`3g`), or when `prefers-reduced-motion` is set, show a static image fallback instead of the 3D scene (G6, H3 protected) | **P0** |
| CW6 | Campus layouts are data-driven: a JSON file per campus defines buildings, positions, landmark names and colours; adding a campus requires no code change | **P0** |
| CW7 | Launch with 3 Nigerian campus layouts: University of Lagos (UNILAG), University of Nigeria Nsukka (UNN), Ahmadu Bello University (ABU). Source building footprints from OpenStreetMap data with required attribution (`© OpenStreetMap contributors`) | P1 |
| CW8 | Do not use university logos or crests on the map; use team colours and university names only | **P0** |
| CW9 | The 3D renderer is loaded only when the device/network passes the capability check (CW5); the main bundle never includes three.js; it is dynamically imported | **P0** |
| CW10 | Map rendering must not increase match data transfer; map assets are cached separately and do not count toward the 1 MB match data budget | **P0** |

### Campus Tour mode (CT)

| ID | Requirement | Priority |
|----|-------------|----------|
| CT1 | A world-map screen shows all available campuses; the player taps a campus to "visit" it. The world map for launch shows Nigeria with campus pins only | P1 |
| CT2 | On a visited campus the player can: (a) play the computer at that campus's difficulty level, (b) quick-match against an online player from that campus, or (c) take a landmark challenge (e.g. 5 questions at the library) | P1 |
| CT3 | Tour matches vs computer award XP only, not ranked rating or university points (C3 preserved) | **P0** |
| CT4 | Tour matches vs human players are ranked and follow all existing match rules (B1–B7, O4) | **P0** |
| CT5 | If no human from the target campus is online, fall back to a bot after 20 seconds (O2 preserved) | **P0** |
| CT6 | Track "campuses visited" per player; award a passport stamp for each campus where the player completes all landmark challenges | P1 |
| CT7 | Passport stamps and campuses-visited count are visible on the player's profile (A7 extended) | P1 |
| CT8 | Tour mode works on weak connections: questions are prefetched per match (C4); the world-map view loads campus list from a lightweight API call (< 10 KB) | **P0** |

### Business listings (BL)

| ID | Requirement | Priority |
|----|-------------|----------|
| BL1 | Landmarks on the campus map are tappable pins with a name and a one-line description | P1 |
| BL2 | Business listings (cafes, bookshops, print shops near campus) appear as distinct pins with name, category, short blurb, and an optional link or phone number | P2 |
| BL3 | Every business pin is clearly labelled "Sponsored" or "Featured"; the label is always visible when the pin is visible | **P0** |
| BL4 | Players can collapse/hide all business pins via a toggle; business pins are never shown during active gameplay (buzzer screen); pins never cover the buzzer or answer options | **P0** |
| BL5 | No tracking of players' real location; the map shows campus landmarks, not the user's position | **P0** |
| BL6 | Admin screen to add, edit, schedule (start/end date) and expire business listings; each listing shows impression count and tap count | P1 |
| BL7 | Business listing data is loaded separately from match data and does not count toward the 1 MB match data budget | **P0** |

### Prize Rounds (PR)

> **Note:** The original non-goals listed "Cash prizes, betting or paid entry" for v1. Prize Rounds are designed to be skill-based with no entry fee. They are built behind a feature flag that is OFF in every environment. The flag must not be enabled without legal review (see `docs/LEGAL_CHECKLIST.md`).

| ID | Requirement | Priority |
|----|-------------|----------|
| PR1 | All Prize Round functionality is behind a feature flag (`PRIZE_ROUNDS_ENABLED`), set to **OFF** by default in every environment; the flag must not be turned on without legal review | **P0** |
| PR2 | Prizes are won by skill (score + speed), never by random draw or luck; the winner determination algorithm is deterministic and auditable | **P0** |
| PR3 | No purchase or entry fee to participate in a Prize Round, ever | **P0** |
| PR4 | A Prize Round is a surprise event: announced via push notification with a limited play window; the notification includes the prize amount and rules summary | P1 |
| PR5 | Every Prize Round screen shows: official rules, prize amount, eligibility criteria, and how winners are chosen | **P0** |
| PR6 | Admin tools: create a Prize Round (budget, schedule, category, number of winners, rules text, eligibility text), review winners, approve or reject payouts | P1 |
| PR7 | A `docs/LEGAL_CHECKLIST.md` file lists all items requiring legal sign-off before the feature flag is turned on | **P0** |
| PR8 | Prize Round matches follow all existing buzzer gameplay rules (B1–B7); they are a special ranked match, not a new game mode | **P0** |
| PR9 | Winner payout status tracks through: pending → approved → paid, or pending → rejected; admin must approve each payout | P1 |

---

## Key user flows

### First-time player

1. Opens app; plays a solo Trivia match as a guest immediately.
2. After the match, is prompted to claim a username to save progress.
3. Optionally searches for and links a university; verifies with institutional email.
4. Lands on home: Play vs Computer, Quick Match, Teams, Challenges, Leaderboards, **Campus World**.

### Quick match vs another university

1. Player taps Quick Match and picks categories.
2. Matchmaking finds an opponent from a different university with a similar rating (bot fallback after 20 s).
3. Both see a pre-match card: usernames, universities, ratings; 3-second countdown.
4. Questions play with the buzzer; scores update live.
5. Result screen shows rating change, university points earned, and a share card.

### Form a team and play

1. Captain taps Create Team, names it, and gets an invite link.
2. Captain shares the link; teammates tap it, sign in if needed, and join the lobby.
3. When enough members are ready, captain queues the team for a match.
4. The team is paired with a team from another university; the match plays with team buzzing.

### Create and run a university challenge

1. Organiser taps Create Challenge, sets date, time, categories, questions, and team size.
2. Challenge is posted to the public board and a share link is generated.
3. Organiser shares the link; students RSVP as players or spectators.
4. Another university's verified player accepts; both sides fill team slots.
5. Reminders go out; at start time the lobby opens 10 minutes early.
6. Match plays live with spectators; results post to both universities and the leaderboard.
7. If nobody accepts by start time, the challenge expires and the organiser can reschedule.

### Campus Tour (new)

1. Player taps **Campus World** on the home screen.
2. A map of Nigeria shows pins for each available campus (UNILAG, UNN, ABU at launch).
3. Player taps a campus pin to visit it.
4. The campus view shows the isometric 3D map (or static fallback) with landmark pins (library, sports ground, etc.).
5. Player picks an activity:
   - **Play Computer** — solo match at that campus's difficulty, earns XP only (CT3).
   - **Quick Match** — paired with an online player from that campus; ranked (CT4). Bot fallback after 20 s (CT5).
   - **Landmark Challenge** — e.g. "5 questions at the Library". Completing all landmarks at a campus earns a passport stamp (CT6).
6. Match plays with existing buzzer rules.
7. After the match, progress updates; player can return to the campus map or pick another landmark.
8. Passport stamps are visible on the player's profile (CT7).

### Business listing interaction (new)

1. While viewing a campus map, business pins are visible alongside landmark pins (distinct colour/shape).
2. Each business pin shows a "Sponsored" label (BL3).
3. Player taps a business pin: sees name, category, blurb, and optional link/phone.
4. Player can tap the link to open externally, or dismiss.
5. Player can toggle all business pins off via a map control (BL4).
6. Business pins are never shown during active gameplay.

### Prize Round (new, behind feature flag)

1. Admin creates a Prize Round: sets budget, schedule, category, max winners, rules text, eligibility text.
2. Admin publishes; status moves to "scheduled".
3. At scheduled time, push notifications go out to eligible players (PR4).
4. Players join the Prize Round match within the play window.
5. Match plays with existing buzzer rules (PR8); scores determined by correctness + speed (PR2).
6. Winners are ranked by score; ties broken by cumulative buzz speed.
7. Admin reviews winners, approves or rejects each payout (PR9).
8. Every screen in the flow shows rules, prize amount, and eligibility (PR5).

---

## Game rules and scoring

A standard match is 10 questions; a challenge match defaults to 20. All values below are starting points for tuning in beta.

| Rule | Value |
|------|-------|
| Question read time before buzzer unlocks | 2–4 s (scales with question length) |
| Time to buzz after unlock | 10 s, then the question is dead and the answer is shown |
| Answer window after buzzing | 10 s |
| Early-buzz penalty | Locked out of that question |
| Correct answer | +10 points |
| Speed bonus | Up to +5 for buzzing in the first 2 s after unlock |
| Wrong answer | −5 points; question rebounds to the other side |
| Rebound correct | +5 points |
| Tie at end | One sudden-death question |
| Disconnect | 30 s to reconnect; after that, remaining questions forfeit |

**Ranked rating.** Each player has an Elo-style rating starting at 1,000; ranked wins and losses adjust it based on opponent rating. Team matches update each participating member.

**University points.** Verified players earn points for their university from ranked matches and challenges (e.g. win = 3, loss = 1 for participating; challenge win = 25). Points per player per day are capped so one very active player cannot carry a university alone.

---

## Leaderboards and ranking

Two boards ship in v1: players ranked by rating, universities ranked by points. Seasons last 3 months; seasonal boards reset, all-time boards do not.

| Board | Ranked by | Views | Who appears |
|-------|-----------|-------|-------------|
| Player | Ranked rating | Global, my university, per category; weekly, season, all-time | Any player with 5+ ranked matches |
| University | Total university points | Weekly, season, all-time; also points per active player | Universities with 10+ verified players |

- Ties break by most recent win, then by win rate.
- Each university has a public page: rank, top players, recent challenge results, upcoming challenges.
- Fairness: a "points per active player" view keeps small universities competitive against large ones.

---

## Non-functional requirements

The buzzer is only as good as its fairness and latency, so the real-time layer gets the strictest targets.

| Area | Requirement |
|------|-------------|
| Buzz fairness | Server is the single source of truth for buzz order; clients sync clocks at match start and send client timestamps that the server corrects for measured round-trip time |
| Real-time latency | Buzz-to-lockout broadcast under 150 ms p95 within a region |
| Weak networks | Usable on 3G; questions prefetched per match; reconnect without losing the match within 30 s |
| Session persistence | No inactivity timeout; refresh tokens rotate silently; offline app launch shows cached profile and solo mode |
| Scale | 5,000 concurrent matches and 500 spectators per challenge at launch (to confirm) |
| Availability | 99.5% monthly for matchmaking and match servers |
| Anti-cheat | Questions sent only at reveal time; answers validated server-side; flag impossible buzz speeds and answer patterns; rate-limit account creation |
| Platforms | Android first, then iOS; web for joining via shared links and spectating |
| Data size | Match data under 1 MB per match to suit expensive mobile data |
| Privacy | Comply with the Nigeria Data Protection Act 2023; email used for verification is never shown publicly |
| Accessibility | Adjustable text size, colour-safe answer states, screen-reader labels |
| **3D map budget** | **Each campus glTF asset under 2 MB compressed; three.js loaded only on capable devices; map assets cached in service worker, never counted as match data** |
| **No location tracking** | **Campus World shows campus maps, never the player's real location (BL5)** |

---

## Design and experience principles

The game must feel designed, not generic: one named visual direction, motion that explains what happened, and screens proven on the real phones students use.

### Visual direction

| ID | Requirement | Priority |
|----|-------------|----------|
| D1 | Before any UI is built, set one named visual direction from real reference screenshots and recordings (not adjectives), recorded as colours, type scale, spacing and rules in a design system file every screen follows | P0 |
| D2 | The direction is summed up in one feeling word (e.g. "electric" or "stadium") used to judge every screen | P0 |
| D3 | Avoid generic, template-looking UI: no default gradients, stock card grids or decoration that carries no meaning | P0 |
| D4 | Colour carries meaning: each university gets a team colour; correct, wrong, locked-out and "you buzzed first" states each have one consistent colour that also works for colour-blind players (paired with icon or text) | P0 |
| D5 | A consistent illustration system: one hero style for home and challenge cards, plus small spot illustrations for empty states (no teams yet, no challenges, empty leaderboard) and success moments | P1 |
| D6 | Each screen has one clear hero: the buzzer in a match, the score on the result screen, the rank on a university page | P0 |

### Game feel and motion

| ID | Requirement | Priority |
|----|-------------|----------|
| G1 | The buzzer is the signature interaction: large, thumb-reachable, with instant press feedback (visual, haptic, sound) under 50 ms locally, before the server confirms | P0 |
| G2 | Motion explains state, never decorates: buzzer unlocking, lockout, who buzzed first, points flying to the scoreboard, rank changes | P0 |
| G3 | Motion uses spring-like, physical easing; UI transitions stay under 300 ms so gameplay never waits on animation | P0 |
| G4 | One cinematic moment per match that it has earned: the match intro card (both universities face off) and the final result reveal | P1 |
| G5 | Real rewards, not empty confetti: XP, rating change, university points, streaks and unlockable badges shown at the moment they are earned | P0 |
| G6 | Respect reduced-motion settings; every animation has a calm fallback | P0 |
| G7 | Sound design: distinct buzz, correct, wrong and countdown sounds; mutable, and off by default in quiet contexts if the device is silenced | P1 |

### Mobile fit

| ID | Requirement | Priority |
|----|-------------|----------|
| M1 | Fits real phones with no cut-off buttons, zoom or horizontal scroll, including notched screens and small Android devices | P0 |
| M2 | Shared invite and challenge links open cleanly in in-app browsers (WhatsApp, X, Instagram) and hand off to the app when installed | P0 |
| M3 | The web version is installable to the home screen (app icon, theme colour, full-screen) so link joiners can keep playing like an app | P1 |
| M4 | Native-feeling touch: no sticky hover states, no tap delay, no accidental text selection on the buzzer, safe-area padding respected | P0 |
| M5 | Support for physical game controllers and keyboard (spacebar as buzzer) on web and tablets | P2 |

### Onboarding

| ID | Requirement | Priority |
|----|-------------|----------|
| F1 | Time to first value under 60 seconds: a new player is pressing the buzzer in a real question before any sign-up form | P0 |
| F2 | Onboarding teaches by playing, not by tutorial screens; one guided question explains buzzing, early-buzz penalty and rebounds | P0 |
| F3 | Interface text says what happened, why it matters and what to do next (e.g. "Too early. You're locked out of this question.") | P0 |

### Hardening against real conditions

| ID | Requirement | Priority |
|----|-------------|----------|
| H1 | Every screen is tested with worst-case data: very long usernames and university names, zero items, huge counts, missing logos | P0 |
| H2 | Every screen has designed loading, empty, error, offline and reconnecting states | P0 |
| H3 | Performance is measured on low-end Android devices; fix the measured bottleneck rather than guessing | P0 |

---

## Quality bar and acceptance

- Screens are judged by running them on real devices (phone, laptop, in-app browser), never from code or static mockups alone.
- Each milestone is accepted only when its PRD requirements are checked against the running build and captured in before-and-after screenshots.
- For new interactions with no precedent (the buzzer, the challenge card), build 2–3 genuinely different prototypes and pick one side by side.
- Fewer polished features beat more rough ones: when scope is tight, cut a feature before cutting polish.
- Ship small releases to real students, and feed their reports straight into the next iteration; deferred items are written down, not forgotten.
- Every third-party asset (fonts, sounds, illustrations, icons) is tracked with its licence and credit.

---

## Data model overview

### Existing entities

| Entity | Key fields | Relationships |
|--------|------------|---------------|
| User | id, username (unique), email/phone, rating, xp, created_at | Optionally belongs to one University; has many Devices |
| Device session | id, user_id, refresh_token_hash, last_seen | Belongs to User |
| University | id, name, short_name, email_domains, points, logo | Has many Users, Teams, Challenges |
| Team | id, name, captain_id, university_id, invite_code | Has many Users (members) |
| Challenge | id, host_university_id, guest_university_id, start_at, categories, question_count, team_size, status, share_code | Has one Match when played; many RSVPs |
| Match | id, type (solo, quick, team, challenge, **tour**), ranked, status, started_at, ended_at, **campus_id (nullable)** | Has Participants and Rounds |
| Round | id, match_id, question_id, buzz_order, answer, points | Belongs to Match |
| Question | id, category, difficulty, text, options, correct_option, source | Belongs to Category |
| Category | id, name, active | Has many Questions |
| Leaderboard entry | scope (player/university), period, subject_id, score, rank | Derived from Matches |

Challenge status moves through: Open → Accepted → Lobby → Live → Completed, or Open → Expired / Cancelled.

### New entities (Campus World)

| Entity | Key fields | Relationships |
|--------|------------|---------------|
| **Campus** | id, university_id (FK, unique), name, layout (jsonb: buildings, positions, colours), asset_url (glTF), fallback_image_url, osm_attribution, active, created_at | Belongs to University; has many CampusLandmarks, BusinessListings |
| **CampusLandmark** | id, campus_id (FK), key (string, e.g. "library"), name, description, position_x, position_y, challenge_question_count (default 5), created_at | Belongs to Campus |
| **TourProgress** | id, user_id (FK), campus_id (FK), landmark_key, completed_at; unique constraint on (user_id, campus_id, landmark_key) | Belongs to User and Campus |
| **BusinessListing** | id, campus_id (FK), name, category, blurb, link (nullable), phone (nullable), pin_x, pin_y, sponsored_label (default "Sponsored"), starts_at, expires_at, impressions (int, default 0), taps (int, default 0), active, created_at | Belongs to Campus |
| **PrizeRound** | id, title, budget_cents (int), category_id (FK, nullable), scheduled_at, window_minutes (int), max_winners (int), rules_text, eligibility_text, status (draft/scheduled/live/completed/cancelled), created_by (FK to User), created_at | Has many PrizeWinners |
| **PrizeWinner** | id, prize_round_id (FK), user_id (FK), match_id (FK), score (int), rank (int), amount_cents (int), payout_status (pending/approved/rejected/paid), reviewed_by (FK to User, nullable), reviewed_at (nullable) | Belongs to PrizeRound, User, Match |

### Modified existing entities

| Entity | Change |
|--------|--------|
| **Match** | `type` enum adds `'tour'`; add `campus_id` (FK to Campus, nullable) for tour matches |
| **User** | Add `campuses_visited` (int, default 0) as denormalised count; passport data derived from TourProgress |

---

## Release plan

Ship in phases, each gated on proof the previous one works; dates to be set once the team is staffed.

| Phase | What ships | Gate |
|-------|-----------|------|
| **Phase 1: Core game** | Play vs computer, quick match 1v1, usernames + uni linking, player + uni leaderboards, never-logged-out sessions | Closed beta, 3 Nigerian campuses, buzz p95 under 150 ms |
| **Phase 2: Teams** | Team invite links, scheduled challenges, share + spectate links, push reminders, challenge uni points | Public launch, 0 involuntary logouts in beta |
| **Phase 3: Growth** | Category leaderboards, direct uni challenges, seasons and rewards, iOS app, typed answers | — |
| **Phase 4: Campus World** | See milestones below | Each milestone gated independently |

Phase 1 must show the buzzer feels fair and sessions never drop before anything is built on top; teams and challenges follow because they depend on a healthy online player base.

### Campus World milestones

Each milestone is a deployable increment that can be opened and tested on phone and desktop viewports.

**Milestone 1 — Campus data layer + static fallback**
- Campus and CampusLandmark entities, migrations, CRUD API
- Admin screens: create/edit campuses and landmarks
- Campus layout JSON schema documented
- 3 Nigerian campuses seeded: UNILAG, UNN, ABU (layout JSON from OpenStreetMap data, with attribution)
- Static fallback campus illustrations displayed as ambient background on home screen (capability detection in place)
- Device/network capability detection utility (RAM, GPU, connection type, reduced-motion)
- **Testable:** Admin can create campus. Home screen shows static campus image. Works on throttled 3G.
- **PRD IDs covered:** CW4, CW5, CW6, CW7, CW8, CW10

**Milestone 2 — 3D isometric renderer**
- three.js dynamically imported (never in main bundle — CW9)
- Orthographic camera at fixed isometric angle; low-poly scene loader (glTF + Draco)
- Campus model rendered as ambient background on home, lobby and results screens
- Auto-dim/freeze during live questions — renderer stops `requestAnimationFrame`, draws one dimmed frame (CW3)
- Falls back to static image when capability check fails (CW5)
- Respect `prefers-reduced-motion` (G6)
- **Testable:** 3D map visible on capable desktop and phones. Static fallback on low-end. FPS and load time reported on throttled 3G + CPU 4x slowdown.
- **PRD IDs covered:** CW1, CW2, CW3, CW9

**Milestone 3 — Campus Tour core**
- World-map screen: Nigeria outline with pins for UNILAG, UNN, ABU (CT1)
- Campus visit view: shows isometric map (or fallback) with tappable landmark pins (BL1)
- Tour match flow: vs computer (CT3), vs campus players (CT4), landmark challenge (CT2)
- TourProgress entity; passport stamp logic (CT6)
- Passport/stamps on player profile (CT7)
- Bot fallback after 20 s for campus quick-match (CT5)
- World-map API response < 10 KB (CT8)
- **Testable:** Player opens Campus World, picks UNILAG, plays all 3 match types, earns stamps, sees passport on profile.
- **PRD IDs covered:** CT1–CT8

**Milestone 4 — Business listings + map pins**
- BusinessListing entity, CRUD API
- Tappable business pins on campus map with "Sponsored" label (BL2, BL3)
- Collapse/hide toggle; pins hidden during active gameplay (BL4)
- Admin screen: add/edit/schedule/expire listings, impression + tap counts (BL6)
- No location tracking (BL5); business data loaded separately from match data (BL7)
- **Testable:** Admin adds a business listing for UNILAG campus. Player sees pin, taps for details, hides pins. Pin never visible on buzzer screen.
- **PRD IDs covered:** BL1–BL7

**Milestone 5 — Prize Rounds (flagged off)**
- PrizeRound and PrizeWinner entities
- Feature flag `PRIZE_ROUNDS_ENABLED` — OFF in all environments (PR1)
- Admin: create, schedule, review prize rounds; approve/reject payouts (PR6, PR9)
- Player flow: notification → join → play → results (PR4, PR8)
- Winner determination: score + speed, deterministic, no randomness (PR2)
- No entry fee enforced at API level (PR3)
- Every Prize Round screen shows rules, amount, eligibility (PR5)
- `docs/LEGAL_CHECKLIST.md` finalised (PR7)
- **Testable:** With flag ON in local dev only: admin creates a prize round, player enters, winners shown, admin approves. Flag OFF everywhere else.
- **PRD IDs covered:** PR1–PR9

---

## Risks and open questions

| Risk | Impact | Mitigation |
|------|--------|------------|
| Buzzer feels unfair on poor networks | Players quit, accuse cheating | Server-ordered buzzes with latency compensation; show ping; regional servers |
| Fake university affiliation | Leaderboard loses trust | Institutional email verification; only verified players count for university points |
| Many universities lack student email | Students cannot verify | Fallback: student ID upload or vouching by 3 verified peers (open question) |
| Question bank runs dry or leaks | Repetition, memorised answers | Large launch bank per category; track seen questions per player; rotate |
| Empty matchmaking at launch | Long waits | Bot fallback after 20 s; campus ambassador launches at a few universities first |
| Never-logged-out on shared phones | Account takeover | Device list with remote sign-out; optional PIN for profile changes |
| **3D map crashes low-end devices** | **Players blame the app, uninstall** | **Capability check before loading three.js (CW5); static fallback; measure on real low-end Android (H3)** |
| **three.js bundle size** | **Slow first load on 3G** | **Dynamic import, Draco-compressed assets, service worker cache; three.js tree-shaken to ~150 KB gzipped** |
| **Prize Round legal compliance** | **Regulatory action, app store removal** | **Feature flag OFF everywhere (PR1); LEGAL_CHECKLIST.md must be signed off; no entry fee ever (PR3); skill-only determination (PR2)** |
| **Business listing perceived as spam** | **Players annoyed, trust erodes** | **"Sponsored" label always visible (BL3); player can hide all pins (BL4); pins never during gameplay** |
| **OpenStreetMap data accuracy for Nigerian campuses** | **Map looks wrong, students mock it** | **Manual verification against satellite imagery; treat layouts as stylised, not literal; accept corrections from students** |

### Open questions

- ~~Which universities launch first, and is it Nigeria-only at launch?~~ **Answered:** Nigeria-only. UNILAG, UNN, ABU.
- Final team size for team matches and challenges (2, 3, or 5)?
- Are typed answers needed for v1, or is multiple choice enough?
- Who writes and verifies questions, and how many per category at launch?
- Monetisation: ads, cosmetics, sponsored challenges, or none in v1?
- Do spectators see the question and answers live, or only the scores?
- Success-metric targets once beta data exists.
- **What payment provider for prize payouts (bank transfer, mobile money)?**
- **Do we need separate question banks per campus for landmark challenges, or draw from the global pool filtered by difficulty?**
