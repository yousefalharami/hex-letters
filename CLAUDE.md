# Hex Letters — invariants

A hex-board trivia game. These rules are load-bearing — the geometry and win-detection
code encode them precisely, and changes that violate them will look subtly wrong
(misaligned zones, wrong winner, etc.) rather than crash outright.

## Board

- Pointy-top hexagons, 5 rows x 5 columns (`ROWS=5`, `COLS=5` in `board.js`).
- Odd rows (index 1, 3, ... zero-based) are offset right by half a cell width
  (`cx()` in `board.js` adds `w/2` when `r%2` is truthy). Row/col indices are 0-based;
  cell index is `r*COLS+c`.
- Each cell holds one letter, dealt from the configured alphabet pool (`AR`/`EN`/mix in
  `game.js`). A question is asked; the answer starts with that letter; whichever team
  answers first claims the cell.
- Selected-but-unclaimed cell renders yellow (`--pick`, `#FFD60A`). This is a UI
  selection state, not an ownership state — `state.sel` is separate from `state.owner`.

## Teams and win condition

- Team 1 wins by linking the **top edge to the bottom edge** with a connected chain of
  its own cells. Team 2 wins by linking the **right edge to the left edge**.
- On a full board, a draw is impossible — this is a known property of the hex/Hex
  topology (it's why the game uses hexagonal cells at all). Don't add draw-handling
  logic; if you think you need it, the win-detection code has a bug instead.
- Win detection (`won()` in `game.js`) is a flood fill from each edge's starting cells,
  following owned-cell adjacency, checking whether any filled cell touches the opposite
  edge's ending cells.
- **Never refer to teams by color in code or copy.** Team colors are user-configurable
  (`cfg.t1`/`cfg.t2`, picked from swatches on the home screen) — always say "team 1" /
  "team 2" (or the localized team name), never "orange team" / "green team". The old
  `hex_game_display.html` prototype did this (hardcoded orange/green) and was replaced
  for exactly this reason.
  - **Three different fallback helpers exist for when the host leaves a team's name
    field blank, each scoped to specific UI, all in `game.js`:**
    - `teamName(team)` → localized "Team 1"/"Team 2" (`L().t1`/`L().t2`). Used only by
      the round log (`sync()`'s `hist.innerHTML`), where a readable per-entry label
      still matters alongside the colored dot.
    - `teamLabel(team)` → empty string (`cfg.names[team]||''`, no text fallback at
      all). Used by the sidebar team cards and the award buttons (`n1`/`n2`/`b1`/`b2`
      in `applyLang()`) — deliberately blank when unnamed, relying on the card/button's
      own color to distinguish teams, since duplicating "Team 1"/"Team 2" next to an
      already-colored box was reported as visual clutter.
    - `winnerLabel(team)` → the team's *color name* (`colorName()`, backed by the
      `COLOR_NAMES` lookup keyed by the exact hex values in `PRESETS1`/`PRESETS2`).
      Used only by the win popup (`winTitle` in `award()`) — the one deliberate,
      narrow exception to "never refer to teams by color," since an announcement like
      "Team 1 wins!" is a worse fallback there than "Orange wins!" when unnamed.
    Don't consolidate these into one helper or spread any one of them to another
    spot's UI without being asked — each fallback was chosen deliberately for that
    specific location, not as a general rule to apply everywhere.

## Adjacency

- Uses odd-r offset-coordinate neighbors (`neighbors()` in `game.js`), matching the
  row-offset direction used by the rendering geometry. For a cell at `(r,c)` with
  `odd = r%2`:
  - same row: `(r, c-1)`, `(r, c+1)`
  - row above: `(r-1, c-(odd?0:1))`, `(r-1, c+(odd?1:0))`
  - row below: `(r+1, c-(odd?0:1))`, `(r+1, c+(odd?1:0))`
  - Bounds-checked against `ROWS`/`COLS`; out-of-range neighbors are dropped.
  - This must stay consistent with `cx()`'s offset direction (odd rows shift right) —
    if one changes, the other must change with it, or adjacency and rendering will
    disagree about which cells actually touch.

## Zone fills and the perimeter walk

- The four colored outer zones (two per team, marking each team's target sides) are
  **not** hand-drawn rectangles — they're derived at runtime by `perimeter()` in
  `board.js`:
  1. Every hex edge is generated from its 6 vertices; edges are counted by a rounded
     coordinate key. An edge shared by two hexes is interior and discarded; an edge
     belonging to exactly **one** hex is a boundary edge.
  2. Boundary edges are stitched into a single cycle (`cyc`) walking the outer
     perimeter of the whole board.
  3. Four fixed points **A, B, C, D** (the board's four corners, at the midpoints of
     the first/last column's outer edges) split that cycle into four arcs — one per
     side (top, right, bottom, left in the underlying geometry).
  4. Each of A/B/C/D also gets a ray (`ra`/`rb`/`rc`/`rd`) shot outward to the image
     edge, at a fixed diagonal angle. These rays are the four black diagonal corner
     lines in the rendering — they mark where each team's two target sides begin and
     end, and are what visually separates one team's zone from the other's.
  5. The four zone polygons are built by combining an arc with its two boundary rays
     and, where needed, the image's actual corners.
- This whole computation (`perimeter()` + `drawBoard()`) was moved verbatim during the
  `index.html`/`board.js` split specifically because it's easy to get subtly wrong and
  was already correct — treat it as a unit; don't refactor piecemeal.

## Direction (RTL/LTR)

- RTL (Arabic) is the **default** direction (`<html lang="ar" dir="rtl">` initially,
  and `cfg.lang` defaults to `'ar'`). English is a toggle, not the primary target.
- The scoreboard panel (`.panel`) stays on the **right side of the screen in both
  directions** — this is intentional, not a bug. It's implemented by swapping the grid
  column order for `html[dir=ltr]` (`.wrap` reverses column order, `.panel` gets
  `order:2`) rather than relying on logical-property default flow, since a naive RTL
  flip would otherwise move the panel to the left in LTR mode.

## Rounds and matches

- Matches are best-of 1/3/5 (`cfg.rounds`), configured on the home screen. A team wins
  the match once its round-win count reaches `Math.ceil(cfg.rounds/2)`.

## Undo (`undoBtn`, `game.js`)

Single-level only — undoes the *one* most recent `award()` call, whatever it did.
There's no multi-step undo history; `undoSnap` (a snapshot of `state` plus the
overlay/team-highlight visuals, taken at the very start of `award()`, before any
mutation) is overwritten on every new award and cleared (`undoSnap=null`,
`undoBtn.disabled=true`) whenever `startRound()`/`newMatch()` runs — so undo only
ever reaches back to the single award that just happened, never further.

- Covers all three cases uniformly because the snapshot is taken unconditionally at
  the top of `award()`, before `award()` knows whether this cell will just be claimed,
  end a round, or end the whole match: undoing a plain claim just clears the cell;
  undoing a round-ending claim additionally pops the `state.hist` entry, hides the
  overlay, and clears `state.done`; undoing a match-ending claim does all of that plus
  clears `state.over`.
- **If the undone award had triggered `onMatchOver` (tournament mode, match just
  decided)**, `undoAward()` calls a mirror-image hook, `onUndoMatchOver()`
  (`tournament.js`): decrements `tour.qi`, clears that match's `.winner`, clears
  whatever it had written into `.next.match[.next.slot]`, and resets `againBtn` back
  to plain `startRound` behavior (`onMatchOver` had repointed it to
  `tourReturnToBracket` — undo must put it back, or the *next* round-ending award in
  that same match would incorrectly try to jump to the bracket screen instead of
  continuing the match). This hook is guarded by `tourActive` the same way
  `onMatchOver` is, so it's a no-op for non-tournament matches.
- Undo is only reachable while still on `#scGame` — once the host navigates to the
  bracket screen (tournament "Next Match"/"Champion"), there's no way back to trigger
  it, so `onUndoMatchOver` never needs to handle "the bracket screen already moved on."
- Keyboard shortcut is `z` (alongside the existing `1`/`2` for awarding). Adding it
  surfaced a pre-existing gap: the keydown listener had no check for a focused text
  input, so typing a team/tournament name containing "1", "2", or now "z" could
  misfire these shortcuts. Fixed by skipping the handler when
  `e.target.closest('input,textarea,[contenteditable]')` — keep this guard if adding
  any future single-key shortcuts here.

## Module layout (post-split)

- `index.html` — markup only (home screen + game screen), links `styles.css` and loads
  the three scripts in dependency order: `i18n.js`, `board.js`, `game.js`.
- `styles.css` — all styling, unchanged from the original inline `<style>` block.
- `board.js` — hex geometry (`cx`/`cy`/`vx`/`K`), the perimeter walk (`perimeter()`),
  and SVG rendering (`drawBoard()`). No game state lives here.
- `game.js` — config (`cfg`, color presets), game state (`state`), the letter pool,
  adjacency, win detection, round/match progression, and all DOM event wiring for both
  screens.
- `i18n.js` — the `T` dictionary (Arabic/English UI strings) only. Letter alphabets
  (`AR`/`EN` in `game.js`) are gameplay data, not UI copy, and intentionally live in
  `game.js` instead.
- These are classic (non-module) scripts sharing one global scope by design — load
  order matters for values used at top-level, but function bodies (e.g. `drawBoard()`
  referencing `cfg`, or its click handler calling `pick()`) resolve at call time, after
  all three scripts have run, so cross-file forward references inside functions are
  fine.

## PWA files

The app is installable (add-to-home-screen / offline) via a standard manifest +
service worker, layered on top of the static files above with no build step:
- `manifest.json` — name, icons, `display:standalone`, dark theme/background color.
- `sw.js` — cache-first service worker; precaches all core files on install and bumps
  `CACHE` (bump the version suffix, e.g. `hex-letters-v6` → `v7`) to invalidate old
  caches whenever any precached file changes — otherwise returning users (and you,
  while testing) keep getting served stale files.
- `pwa.js` — the one-line service worker registration, loaded last in `index.html` so
  it doesn't affect game startup.
- `icons/icon.svg` / `icons/icon-maskable.svg` — source vectors derived from the
  `.hexmark` logo already in `index.html`'s home screen, with a solid `--ink`
  background baked in (transparent PNGs render with a black backdrop on iOS) and, for
  the maskable variant, extra inset padding so Android's circular icon crop doesn't
  clip the hexagon. `icon-192.png` / `icon-512.png` / `icon-512-maskable.png` are
  rasterized from these — regenerate them if the SVGs change (e.g. via headless Chrome
  screenshot; see git history for the exact command used).
- **Service workers require a secure context** — `sw.js` will not register when
  `index.html` is opened via `file://`. Serve the folder (e.g. `python3 -m http.server`
  and open `http://localhost:<port>/index.html`) to test install/offline behavior, or
  deploy it to real hosting for a phone install.
- If you add/rename/remove any core file, update `ASSETS` in `sw.js` to match, and bump
  `CACHE`'s version suffix so returning users don't get served a stale cached copy.
- **Every asset reference must be relative (no leading `/`)** — `href`/`src` in
  `index.html`, `icons[].src`/`start_url`/`scope` in `manifest.json`, and every entry
  in `sw.js`'s `ASSETS` array. This is what lets the app be served from a static host's
  subpath (e.g. `https://user.github.io/hex-game/`) instead of only from a domain
  root. The only absolute URLs in the app are the Google Fonts `<link>`s in
  `index.html`, which are intentionally cross-origin. Google Fonts are **not**
  precached by `sw.js` (no build step to vendor/self-host them) — offline sessions
  fall back to the CSS's system-font stack (`Tajawal,system-ui,sans-serif`) for text
  rendering, which is a known, accepted gap rather than a bug.
- Once installed, the app must run with **zero network requests** — every file it
  actually needs (everything except the Google Fonts) is in `sw.js`'s `ASSETS` and
  precached on install. If you add a file the app loads at runtime, it has to go in
  `ASSETS` or offline sessions will fail to load it.

## iOS App Store wrapper (Capacitor)

A second, **additive** distribution path on top of everything above — wrapping the
same static web app in a native iOS shell via [Capacitor](https://capacitorjs.com),
for a real App Store listing. This does not change anything about the web app's own
"no build step" philosophy: `index.html`/`styles.css`/`*.js` are still edited and
tested exactly as before (`python3 -m http.server` + a browser). Capacitor is purely
an outer wrapper with its own separate toolchain (npm, Xcode).

- **`www/` is a deployable copy, not the source of truth.** The actual source files
  live at the project root, same as always. `capacitor.config.json`'s `webDir` points
  at `www/` (not `.`) specifically because pointing it at the project root would make
  every `cap sync` recursively copy `node_modules/`, `.git/`, and — once it exists —
  `ios/` *into itself*, growing without bound. Run `npm run sync-web` (copies the
  actual web files + `icons/` into `www/`) before every `npx cap sync ios` whenever
  the web app has changed — **don't edit files inside `www/` directly**, they get
  overwritten by the next sync. The script `rm -rf`s `www/icons` before re-copying it
  — plain `cp -r icons www/icons` when `www/icons` already exists nests it into
  `www/icons/icons/` instead of replacing it (this actually happened once), so don't
  simplify that line back down to a bare `cp -r`.
- **`npx cap sync ios` after any web change that should reach the app**, in this
  order: edit the real files → `npm run sync-web` → `npx cap sync ios`. Only syncing
  copies `www/` into `ios/App/App/public/`; editing the root files alone does nothing
  for the iOS build until both of those run.
- **This Capacitor version (8.x) uses Swift Package Manager, not CocoaPods** — there's
  no `Podfile`/`Pods/` (a local Swift package at `ios/App/CapApp-SPM/` handles it
  instead), unlike most older Capacitor tutorials/docs which assume CocoaPods. Don't
  add a `Podfile` or run `pod install` expecting it to matter unless a future plugin
  specifically forces CocoaPods.
- **App identity**: bundle ID `app.hexletters`, display name `"hex letters حروف"` —
  both host-specified, independent of the Tamreen project's bundle ID
  (`app.jointamreen`, which turned out not to share a clean prefix with this one).
- **Icon/splash source**: `assets/icon.png` (1024×1024, no alpha channel — Apple
  rejects App Store icons that have one) and `assets/splash.png`, both rasterized from
  the same `icons/icon.svg` used for the PWA icons (one visual identity across web,
  PWA, and native). `icons/icon-1024.png` is the same image, kept in `icons/` since
  that's the icon's canonical home; `assets/icon.png` is `capacitor-assets`'s expected
  input filename/location, kept as a separate copy for that tool's convention rather
  than a symlink. Regenerate via
  `npx capacitor-assets generate --ios` after replacing either source image — this
  writes directly into `ios/App/App/Assets.xcassets/`.
- **What's committed vs generated**: `ios/` itself (the Xcode project, workspace,
  `Assets.xcassets`, `CapApp-SPM/Package.swift`) is committed — that's the actual
  project configuration. `node_modules/`, any `ios/App/Pods/` (unused here, but kept
  ignored defensively), Xcode's `build/`/`DerivedData/`/`xcuserdata/`, and SPM's
  `.build/` are gitignored — all regenerable from `npm install` + `npx cap sync`.
- **Everything past `npx cap open ios` requires an interactive Apple ID session in
  Xcode** and can't be scripted from here: selecting the Apple Developer Team for code
  signing, building to a simulator/device, archiving, and uploading to App Store
  Connect. The service-worker/manifest PWA machinery (`sw.js`, `pwa.js`,
  `manifest.json`) is inert inside Capacitor's `WKWebView` — harmless to leave in
  `www/`, just does nothing there.
- **Open item, not yet resolved**: Apple requires a privacy policy URL for every App
  Store listing, even though this app collects no data and has no backend. Needs a
  simple hosted "we collect nothing" page before actual submission — out of scope
  until asked.

## Persistence (`storage.js`)

A small localStorage-backed module, loaded after `game.js`/`tournament.js` and before
`pwa.js`, so it can read/write `cfg` (defined in `game.js`) and re-run `game.js`'s own
render functions after loading.

- **What's persisted**: game title (`cfg.title`, both languages), per-team names
  (`cfg.names`), per-team colors (`cfg.t1`/`cfg.t2`), and UI language (`cfg.lang`) —
  i.e. the home screen's own settings. Saved under one versioned key,
  `hexletters:v1:settings`, as a single JSON blob (not one key per field).
- **What's deliberately NOT persisted**: tournament progress. Leaving a tournament
  (back button, exiting, or just closing/reloading the app) discards it entirely —
  this was a deliberate choice, not an oversight, so don't add tournament
  persistence/resume without being asked again. Rounds (`cfg.rounds`) and letter pool
  (`cfg.letters`) for the 2-team game aren't persisted either — only what was
  explicitly requested (title/names/colors/language).
- **Every localStorage call is wrapped in try/catch** (`storageGet`/`storageSet`) and
  fails silently (returns `null` / no-ops) rather than throwing — covers private
  browsing mode (older Safari throws on `setItem`) and quota-exceeded errors. A failed
  save just means settings don't persist for that session; it must never break the app.
- **The key is prefixed with a version** (`hexletters:v1:`) so a future breaking change
  to the settings shape can bump to `v2` — old-shaped data under the old key is simply
  never read again (not migrated, not parsed-and-crashed), rather than needing defensive
  parsing of every possible old shape forever.
- `game.js` calls a small wrapper, `persistSettings()` (defined in `game.js` itself,
  right next to `cfg`), at each point `cfg.title`/`names`/`t1`/`t2`/`lang` actually
  changes (`swatchRow`'s click handler, the `gameTitle`/`name1`/`name2` input
  listeners, `segLang`'s click handler). The wrapper itself guards
  `typeof saveSettings==='function'` before calling into `storage.js` — same optional-
  hook pattern as `onMatchOver` in the tournament integration, so `game.js` still works
  standalone if `storage.js` ever fails to load.
- On load, `storage.js` calls `loadSettings()` then re-runs `applyColors()`,
  `paintSel()`, `applyLang()` — the exact same three calls `game.js`'s own bottom-of-file
  init already made with defaults. Because all of this happens synchronously before the
  browser's first paint, there's no visible "flash of default settings" — don't
  reach for a loading spinner or `visibility:hidden` trick to solve a problem that
  doesn't exist here.
- **Loading into `cfg` is not the same as loading into the DOM.** `applyColors()`/
  `paintSel()`/`applyLang()` only sync *some* of `cfg` back onto visible elements (CSS
  vars, swatch `.on` states, segmented-control highlights, `gameTitle.textContent`) —
  they were written before persistence existed, so nothing in that chain ever touched
  `name1.value`/`name2.value`. This actually broke: a name typed once and persisted
  would keep coming back from a *visually empty* input box after a reload — `cfg.names`
  loaded correctly, but the `<input>` itself was never told about it, so the box looked
  cleared while `teamName()` was still reading the old persisted value. Fixed with one
  explicit line right after `loadSettings()`:
  `name1.value=cfg.names[1]||'';name2.value=cfg.names[2]||'';`. If a future persisted
  field only lives in an `<input>`/`<textarea>` (not reflected through one of the
  existing apply* functions), it needs the same explicit sync — don't assume
  `loadSettings()` alone makes the UI match `cfg`.

## Coming soon (Question Bank, 1v1 Online)

One shared overlay (`#qbOverlay`, `#qbCard`) handles every "planned but not built yet"
home screen feature — currently two triggers: "بنك الأسئلة" (Question Bank, `#qbBtn`,
styled `.qbBox`, dashed pill inside `.bottomRow`) and "1v1 اونلاين" (1v1 Online,
`#onlineBtn`, styled `.comingSoonRow`, a dashed full-width row below the Tournament
button — a different visual treatment for a different placement, same underlying
pattern). Each button's `onclick` sets `qbCardTitle.textContent` to its own label
(`L().qbTitle` / `L().onlineTitle`) before showing the overlay — `qbCardSub` always
just says "قريباً" (Coming soon) and `#qbClose` closes it, both generic across
triggers. It reuses the same `.overlay`/`.card`/`.acts`/`.solid` classes as the
in-game win overlay.

Adding a third "coming soon" feature: add its own button + i18n title key, then wire
`onclick=()=>{qbCardTitle.textContent=L().yourTitleKey;qbOverlay.classList.add('show');}`
— don't create a new overlay per feature.

There is no actual question content, and no online/networked play, anywhere in this
app — the board is purely a local letter-matching mechanism; questions are supplied
verbally by whoever's running the game. Don't build real question-bank content or
networking without being asked; these boxes exist solely to signal the features are
planned.

**"1v1 Online" must be true internet multiplayer when it's eventually built** — two
players on separate devices/networks playing a real-time match, not local same-device
play (already covered by the existing "Start Game" 2-team mode) and not local-network/
same-Wi-Fi play. This is a real scope commitment: unlike everything else in this app,
it will require a backend (matchmaking + real-time state sync between two clients),
breaking the "no backend" principle that's held for the rest of the app so far. Don't
build it as a peer-to-peer/local-network shortcut thinking that satisfies "online."

## Tournament mode (`tournament.js`)

A bracket mode layered on top of the 2-team hex match engine, reached via the
"Tournament" button on the home screen. Both the setup wizard and actually playing
the bracket through to a champion are built.

Setup is **3 pages** (`TOUR_STEPS = ['config','setup','bracket']`), not one page per
setting — deliberately consolidated from an earlier 6-step version (separate name/
size/rounds/draw pages) after it felt too slow to click through:
- `config` — tournament name, team count, rounds-per-match, and letter pool, all on
  one page (`renderConfig()`).
- `setup` — team names/colors, ending in a "Draw Teams" button (`tourDoDraw()`) that
  performs the draw *and* jumps straight to the bracket — there's no separate
  slot-machine reveal page anymore.
- `bracket` — the table appears immediately, with each match box staggering in via a
  `.tourReveal` CSS animation (`renderBracket(true)` — the `animate` param is only
  passed `true` right after `tourDoDraw()`; every other call, e.g. returning from a
  played match, renders instantly with no replay).

- Team count is fixed to **4, 8, or 16** (`tour.size`) — always a power of 2, since the
  bracket is a straightforward single-elimination tree with no byes to handle. Don't
  allow arbitrary sizes without adding bye-handling first.
- `TOUR_PALETTE` is its **own dedicated 16-color list** (host-specified, named colors
  like "Neon Lime"/"Obsidian"/"Parchment White" — see git history for the full name/hex
  table), independent of the 2-team home screen's `PRESETS1`/`PRESETS2`. Don't merge
  these palettes or reuse one for the other — they were deliberately unified once
  (reusing `PRESETS1`+`PRESETS2`) and then deliberately split back out when the host
  wanted a specific curated palette instead.
- **Rounds is one shared setting for every bracket match** (`tour.rounds`, reusing the
  same best-of 1/3/5 concept as a normal match), not a per-match or per-round setting.
- The 3 steps are driven by `TOUR_STEPS` + `renderTour()`, which fully replaces
  `#tourBody`'s HTML per step rather than keeping separate DOM subtrees — mirrors how
  `drawBoard()` re-renders the board wholesale rather than patching it. `renderTour()`
  also keeps `#tourNameTag` in sync (the tournament's name, shown above the step title
  on every step except `config` itself, where it'd be redundant).
- On the `setup` step, team color pickers are **not inline** — each team row has just
  one swatch button (`.tourSwatchToggle`); clicking it opens a single shared
  `#tourColorPicker` panel (2 rows of 8, all 16 colors) at the bottom of the step,
  right above the Back/Next nav, tracking which team index is "active" via a closure
  variable in `renderSetup()`. Picking a color applies it to whichever team is active
  and closes the panel. This replaced an earlier per-row-inline-bar design that was
  reported as overwhelming at 16 teams (320 always-visible swatches) — don't revert to
  per-row always-visible bars.
- The draw (`tourDoDraw()`, called by the `setup` step's Draw button) is just a
  Fisher-Yates shuffle into `tour.seeded` — no separate reveal page. The "nice
  animation" lives on the bracket itself: `renderBracket(true)` staggers each match
  box's entrance via `.tourReveal` + an inline `animation-delay` computed per box.
- **The bracket is two-sided, final in the middle** (`buildBracket()` in
  `tournament.js`), not a single linear column-per-round strip. `tour.seeded` is split
  in half; `buildSide()` builds each half's own mini single-elimination tree
  independently (same round-halving logic as before, just run twice on 8 teams instead
  of once on 16). Rendering order is `[...left rounds][final][...right rounds
  reversed]` — the final sits in the DOM's middle so it renders visually centered
  regardless of RTL/LTR flex-reversal; which physical side "left"/"right" end up on
  doesn't matter since both halves are symmetric.
- Round labels (`roundLabel()`) take **`round.length * 2`** for a side round (doubling
  to account for the mirrored round on the other side) so the existing
  matchCount→label mapping (8→"Round of 16", 4→quarterfinals, 2→semifinals) stays
  correct without a separate side-aware branch; the center final column always just
  gets the `final` label directly, not through `roundLabel()`.
- `sw.js`'s `ASSETS` list includes `tournament.js` — keep it there if the file is ever
  renamed.
- **The bracket is built once and mutated in place**, not rebuilt on every
  `renderBracket()` call — `if(!tour.bracket)` guards the one-time `buildBracket()`
  call. Each match object carries `winner` (null until decided) and a `next` pointer
  — `{match, slot}` — computed at construction time in `buildSide()`, pointing at
  either the corresponding slot in that side's next round, or `final.a`/`final.b` for
  a side's last round. `onMatchOver()` writes `m.next.match[m.next.slot] = winner`
  directly (object references, so this mutates the same object `renderBracket()`
  reads) rather than re-deriving round/index math after the fact. Whenever the seed
  order or team count can change (`tourDoDraw()`, changing `tour.size`), `tour.bracket`
  is reset to `null` so the next visit to the bracket step rebuilds from the current
  data — don't let a stale bracket survive a re-draw or a size change.
- **Match play order is round-by-round**, not a single deep path: `tour.queue` is
  built by pushing, for each round depth, that round's left-side matches then its
  right-side matches, with `final` pushed last. `tour.qi` tracks how many matches have
  been completed / which one plays next. Pacing between matches is **manual** — after
  a match ends, host returns to an updated bracket screen and presses a button to
  start the next one; nothing auto-advances.
- **`tournament.js` reuses the existing 2-team match engine wholesale** rather than
  building a parallel one: `tourLaunchMatch(m)` just points `cfg.t1/t2`,
  `cfg.names[1]/[2]`, `cfg.letters`, and `cfg.rounds` at the bracket match's two teams
  and calls the existing `newMatch()` (`game.js`) unchanged. The **only** change to
  `game.js` itself is one guarded line at the end of `award()`:
  `if(state.over&&typeof onMatchOver==='function')onMatchOver(team)` — an optional
  hook that no-ops whenever `tourActive` is false, so normal non-tournament matches are
  completely unaffected. Keep this hook as the sole integration point rather than
  adding tournament-specific branches elsewhere in `game.js`.
- **Setting `cfg.t1`/`cfg.t2` alone does not repaint anything** — the sidebar team
  cards, board zone fills' CSS references, and the home screen's start-button/title
  gradients all read the CSS custom properties `--t1`/`--t2` on `documentElement`,
  which only `applyColors()` (`game.js`) actually pushes `cfg.t1`/`cfg.t2` into (it
  also happens to conditionally redraw the board). `drawBoard()` itself reads
  `cfg.t1`/`cfg.t2` directly so the board's zone colors update regardless, which made
  it easy to miss that the *sidebar* was still stale. `tourLaunchMatch()` calls
  `applyColors()` before `newMatch()` for exactly this reason — any other code path
  that changes `cfg.t1`/`cfg.t2` needs to call `applyColors()` too, or the CSS
  variables silently drift out of sync with `cfg`.
- **`cfg` is shared with the home screen's normal 2-team setup**, so overwriting
  `cfg.t1/t2/names/letters/rounds` to launch a bracket match would otherwise leak into
  a later normal match. `tourOpen()` snapshots the pre-tournament values into
  `tour.savedCfg`; `tourResetState()` (called on Finish and on confirmed abandon)
  restores them and re-runs `applyColors()/paintSel()/applyLang()` so the home screen's
  colors/names/segmented-control highlights go back to what the host actually set —
  don't remove this restore step, or playing a tournament permanently corrupts the
  home screen's settings.
- **Exiting mid-tournament asks for confirmation** (`tourConfirmExit()`, via the
  browser's native `confirm()` — no custom modal exists in this app). `btnExit` and
  `homeBtn` (normally both wired to plain `goHome`) get pointed at this handler for
  the duration of a tournament (`tourLaunchMatch`) and restored to `goHome` by
  `tourResetState()`. `againBtn` gets reset to `startRound` at the start of every
  match launch (it's only repointed to `tourReturnToBracket` once that specific
  match's `onMatchOver` fires) — without that reset, a later match's own internal
  round-wins would incorrectly try to return to the bracket instead of advancing
  rounds within the match.

## Generated element ids must not collide with static ids

Code throughout `game.js` reads DOM elements via bare identifiers (e.g. `t1`, `s1`,
`board`) instead of `document.getElementById(...)` — this relies on the browser's
"named access on the Window object" for elements with a given `id`. If two elements
ever share the same `id`, that bare reference silently stops resolving to a single
element and returns an ambiguous `HTMLCollection` instead (no `.classList`, etc.),
which throws wherever it's used.

This already bit the per-cell letter `<text>` elements in `drawBoard()`: they were
originally ided `t0`..`t24`, which collided with the team score panels' `id="t1"`/
`id="t2"` (cell indices 1 and 2) as soon as the board was drawn. That broke
`newMatch()` (called by the Start Game button) and made the game screen unreachable.
Fixed by renaming the per-cell letter ids to `lt0`..`lt24`. Per-cell polygon ids
(`h0`..`h24`) don't collide with anything static, so they were left as-is.
**Before adding or renaming any static id in `index.html`, or any generated id in
`board.js`, check for collisions against both the other set and the full static id
list.**

## Non-goals (for now)

No question bank, no backend, no persistence. Don't add these without being asked.
