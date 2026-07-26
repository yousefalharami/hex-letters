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
      all). Used by the award buttons (`b1`/`b2` in `applyLang()`) — deliberately blank
      when unnamed, relying on the button's own color to distinguish teams, since
      duplicating "Team 1"/"Team 2" next to an already-colored box was reported as
      visual clutter. (Used to also drive `n1`/`n2` on the sidebar team cards before
      those cards were removed — see "Sidebar has no team cards" below.)
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

## Narrow-viewport / no-horizontal-overflow safety

The app is used inside the iOS wrapper (see "iOS App Store wrapper" below). Only the
home screen is portrait — everything else (tournament setup/bracket, the live game
board) force-locks to landscape (~660–930px wide) — but all of this was hardened down
to 390px-wide regardless, since a portrait phone width is the actual narrow case that
matters (home screen) and it's a strict superset of what landscape ever needs.

- **`html,body{overflow-x:hidden;max-width:100%}`** is a *last-resort guard*, not the
  fix itself — everything is sized to actually fit first; this just prevents a page
  jump/scroll if something new someday doesn't.
- **Two different "won't shrink below content size" gotchas got fixed, one per layout
  mode**: flex items and grid `1fr` tracks *both* default to an implicit
  `min-width:auto`, which stops them shrinking below their content's natural width no
  matter how little space is available — the classic cause of "one wide element forces
  the whole row/page wider than the viewport." Flex fix: explicit `min-width:0` on the
  item (already used throughout for text truncation, e.g. `.team h3`,
  `.tourNameInput`). Grid fix: `minmax(0,1fr)` instead of a bare `1fr` on any
  `grid-template-columns` — applied to `.wrap` (game screen sidebar/board split),
  `.tourTeams`, and `.tourColorPicker`. If a future grid/flex layout is added and
  looks fine on desktop but overflows narrow/landscape widths, this is almost
  certainly why — check for a bare `1fr` or a flex item missing `min-width:0` before
  assuming it's something else.
- **The home screen's team-color swatches were the original concrete overflow bug**:
  `.teamline` (dot + name input + 10-swatch row) had no wrapping at any level, and
  `.teamName` was a flat fixed `150px`. Fixed by making `.teamline` and `.swatches`
  both `flex-wrap:wrap`, and `.teamName` a responsive `width:clamp(90px,32vw,150px)`
  instead of a fixed value. Don't revert `.teamName` back to a bare pixel width.
- **`env(safe-area-inset-*)` on `body`, all four sides**, not just left/right — the
  app is portrait on the home screen and landscape everywhere else (see "Orientation
  is per-screen" below), so the notch/Dynamic Island can be at the **top** (home,
  portrait) or the **left/right edge** (every other screen, landscape) depending on
  which screen is showing. Originally only left/right were added (reasoning about
  landscape alone), which left the home screen's logo rendering under the status
  bar/notch with no top padding — don't narrow this back down to left/right only.
  Requires `viewport-fit=cover` in `index.html`'s viewport meta tag to be non-zero —
  without it these `env()` values always resolve to `0` and silently do nothing.
- **`.home::before` fills the top safe-area strip with matching background** — same
  problem class as the game screen's `.stage::before` (see "Game screen board fill"
  below), different screen: `body`'s `padding-top:env(safe-area-inset-top)` (needed to
  keep the logo below the notch, see above) leaves that padding strip showing
  whatever's *behind* `.home` — before this fix, a mismatched flat dark tone instead of
  `.home`'s own radial-gradient background, reading as a visible seam near the notch.
  `.home::before` is a decorative, absolutely-positioned filler (`bottom:100%`, fixed
  `60px` height, its own radial-gradient tuned so its bottom edge — the seam — closely
  matches the color `.home`'s own gradient shows at *its* top edge) that bleeds
  upward past `.home`'s real box, same "don't touch the real box, only decorate above
  it" principle as `.stage::before` — `.home`'s own `min-height:100vh`/`padding`/
  `place-items:center` centering (and therefore `.home-in`'s content position) is
  completely untouched, so the logo/buttons don't shift at all. Needed `.home{position:
  relative}` added (wasn't set before) so the pseudo-element positions against it.
- `.tourBracket`'s own `overflow-x:auto` (for the 16-team bracket, which is
  legitimately wider than any phone) is a **deliberate, contained** exception, not a
  bug the page-level guard should suppress — an ancestor's `overflow-x:hidden` doesn't
  affect a descendant's own explicit `overflow-x:auto`, so the two coexist correctly.
- **Double-tap-to-zoom is disabled app-wide, two layers deep on purpose**: the
  viewport meta tag has `maximum-scale=1, user-scalable=no` (blocks pinch/double-tap
  zoom at the browser level) *and* `html,body{touch-action:manipulation}` (blocks the
  double-tap gesture at the CSS level, and removes the ~300ms tap-delay some WebViews
  add). Neither alone was considered sufficient — keep both. `manipulation` still
  permits normal panning/scrolling (`.panel{overflow-y:auto}`, `.log ol{overflow:auto}`,
  `.tourBracket{overflow-x:auto}` above all keep working) and ordinary single taps
  (hex cells, buttons) — it only removes the double-tap-zoom gesture specifically,
  don't reach for `touch-action:none` as a "stronger" fix, that would break scrolling.

## Game screen board fill (dynamic canvas width, not letterboxing)

The board fills the *entire* landscape stage next to the sidebar — zero dark or white
margin on any side except the boundary against the sidebar itself — on every iPhone/iPad
shape. This is **not** CSS letterboxing (that was tried and rejected: it left visible
letterbox strips as plain `.board` white background). Instead, `board.js`'s canvas
(`viewBox`) width is solved live to exactly match the real container shape:

- `board.js`: `BASE_BW` is the hex grid's own natural width (constant, from `s`/`w`/`m` —
  never changes). `BW` (mutable, module-level `let`) and `shiftX` (horizontal centering
  offset) are recomputed by `sizeBoardCanvas()` on every `drawBoard()` call, plus on
  `resize`/`orientationchange` (debounced 80ms via `refitBoard()`, which also calls
  `sync()` afterward — never `deal()`, that would reshuffle letters mid-match).
  `sizeBoardCanvas()` measures `.stage`'s real `getBoundingClientRect()` and picks
  `BW = max(BASE_BW, BH * stageWidth/stageHeight)` — i.e. the canvas is stretched wide
  enough that `canvasWidth/canvasHeight` exactly equals the container's real aspect
  ratio, so the SVG (already `width:100%;height:100%`) has nothing left to letterbox.
  The hex cells themselves never resize/distort — only the canvas they sit on gets wider,
  and `cx()`/the perimeter-walk `A`/`B`/`C`/`D` corners shift by `shiftX` to stay
  centered. The zone-fill polygons already reach the canvas edge via `ray()`-casting
  (`(BW-P[0])/dx`), so they automatically stretch into the new width with no changes of
  their own needed. **Do not revert to a fixed `BW` constant or a `vh`-based width
  formula on `.boardWrap`** — both were tried and both under-filled or letterboxed.
  **Any place that calls `drawBoard()` must do so only after the game screen is already
  visible** (`scGame` has class `on`) — measuring a `display:none` ancestor returns a
  zero-size rect, guarded by `sizeBoardCanvas()`'s early return, but that means BW stays
  stale/default. `startBtn.onclick` deliberately adds the `on` class *before* calling
  `newMatch()` for this reason — don't reorder it back.
- `styles.css`: `.board` has no `border-radius`/`overflow:hidden`/`border` — the painted
  zone reaches literal square corners, no rounded-corner reveal of page background.
  `.stage` bleeds past `body`'s top/bottom `safe-area-inset` specifically for the board
  (negative `margin-top`/`margin-bottom` equal to those insets, height increased by the
  same amount) so the board reaches the true top/bottom screen edges instead of stopping
  at the padded-safe area — this is scoped to `.stage` only, `.panel` (sidebar) is
  untouched and stays safely inset. This is deliberately **not** applied to `body`'s
  padding itself, since that padding is shared with the portrait home screen and
  protects the logo from the notch there (see "Narrow-viewport" section above) — don't
  "simplify" this by removing `body`'s top/bottom padding globally.
  The left-edge `safe-area-inset-left`/`right` on `body` are left alone (protective
  margin against a landscape-rotated notch landing on either physical side).
- **`.wrap`'s own `gap` and `padding` must stay `0`.** They used to both be
  `clamp(10px,1.6vw,22px)`, which — even after the `.stage` safe-area bleed above —
  still left a real dark strip: `gap` is unclaimed space *between* the `.panel`/`.stage`
  grid columns (not owned by either), and `.wrap`'s own `padding` shrank the whole grid
  box on all four sides, both independent of the safe-area-inset trick, so `.stage`
  never actually spanned its full column even though it correctly filled whatever box it
  *measured*. `.panel` carries that same spacing now, as its own `padding` — this keeps
  the sidebar's content pixel-identical to before (same clamp value, now scoped to one
  element instead of split across `.wrap`'s padding + gap), while `.stage`/`.board`
  reach every edge of their column with zero unclaimed gap. **Don't put spacing back on
  `.wrap` itself** — anything added there reintroduces the gap for `.stage` too, since
  grid `gap`/`padding` apply to both columns, not just the sidebar one.
- `sizeBoardCanvas()` in `board.js` never needed to change for any of this — it already
  measures `.stage`'s real, live box and fills it exactly. Every "gap" bug so far has
  been `.stage`'s box being smaller than the visual column (a pure CSS problem), not the
  canvas-fitting math. If a gap reappears, check `.wrap`/`.stage` CSS before touching
  `board.js`.
- **A hairline dark strip can still show above `.stage`'s top edge on a real device**
  even though the `margin-top:calc(-1 * env(safe-area-inset-top))` math is exactly
  right on paper — this was confirmed on a real iPhone in landscape, not just a
  simulator/theoretical gap. **Do not "fix" this by adding extra height/negative
  margin to `.stage` itself** (that was tried and reverted): `.stage`'s own box is
  exactly what `sizeBoardCanvas()` measures to size the canvas, so inflating it
  inflates the *hexagons* too, not just the background — a real regression, not a fix.
  `.stage::before` is a purely decorative, absolutely-positioned filler strip
  (`bottom:100%`, generous fixed `44px` height, `background:var(--t1)`) that sits
  *above* `.stage`'s real box and overshoots any residual gap, without changing
  `.stage`'s own measured dimensions at all — `sizeBoardCanvas()` never sees it. It
  uses `var(--t1)` (kept live by `applyColors()`) so it always matches the top
  zone-fill's actual current color, team-1's. If a similar hairline ever shows up on a
  different edge, use the same technique (a decorative `::before`/`::after` overlay
  sized generously past the real box) — never grow `.stage`'s actual box to chase a
  rendering-only gap. **This overlay is a secondary safety net, not the primary fix**
  for a full-width top strip — see the status-bar-hide note under "Orientation is
  per-screen" below. A strip that spans the *whole* screen width (sidebar included)
  is the native iOS status bar itself, not a CSS gap; only `setStatusBarHidden()`
  fixes that. `.stage::before` still earns its keep for any genuine sub-pixel
  rendering gap in the board's own box once the status bar is out of the picture.
- **Growing `.stage`'s *width* is safe; growing its *height* is not — this is an
  asymmetry, not a contradiction of the point above.** `sizeBoardCanvas()` solves
  `BW = max(BASE_BW, BH*(stageWidth/stageHeight))`, and since `BH` is a fixed constant,
  the render scale factor is `stageHeight/BH` **only** — width never enters it. So
  `.stage{margin-left:calc(-1 * env(safe-area-inset-left));
  width:calc(100% + env(safe-area-inset-left))}` (bleeding the board's outer/left edge
  past the left safe-area, mirroring the top-edge treatment but on the width axis) does
  **not** change hex pixel size at all — only `BW`/the zone-fill's reach grows to match
  the wider box, exactly like the top strip's "just extend the paint" goal, except this
  one didn't need a decorative `::before` overlay because growing `.stage`'s real box
  is safe here. The right edge (sidebar side) is intentionally left untouched by this —
  it's handled separately by `.panel`'s own `margin-right` bleed, not by `.stage`.
  **If a similar dark strip shows up on the right/outer edges of `.stage` itself**,
  the same `margin-*`/`width` pattern applies; only the *top/bottom* (height) axis is
  the one where this technique is forbidden.
- **If a black strip near the Dynamic Island persists even with the status bar
  hidden, it is not a CSS problem at all** — it's `capacitor.config.json` missing a
  `backgroundColor`. Verified against Capacitor's own native source
  (`node_modules/@capacitor/ios/.../CAPBridgeViewController.swift` and
  `CAPInstanceDescriptor.swift/.m`), not just docs, before touching anything:
  - `contentInsetAdjustmentBehavior` already **defaults to `.never`** (not
    `.automatic`) even when `ios.contentInset` is never set — this project's config
    never had it set, so this was never the cause here. Still made explicit
    (`"ios":{"contentInset":"never"}`) for clarity/future-proofing, not because it was
    broken.
  - `clipToBounds` isn't a real Capacitor iOS config key in this version — doesn't
    exist, nothing to check.
  - `@capacitor/status-bar`'s `overlaysWebView` already **defaults to `true`**. More
    fundamentally, `CAPBridgeViewController.loadView()` does `view = webView` — the
    webview *is* the full-screen root view, no separate safe-area-constrained
    container ever wraps it, so there's no "reserve space" mode to disable in the
    first place. Still set explicitly in `capacitor.config.json`'s
    `plugins.StatusBar.overlaysWebView` for the same clarity reason.
  - **The actual gap**: with no `backgroundColor` configured, both `aWebView.
    backgroundColor` and `aWebView.scrollView.backgroundColor` fall back to
    `UIColor.systemBackground` (confirmed in `CAPBridgeViewController.swift`'s
    `prepareWebView`) — which is **black in Dark Mode**. Any tiny native-rendering
    sliver (before web content finishes painting, a scroll-bounce edge, a pixel the
    CSS genuinely doesn't reach) shows *that* native color through, and no CSS
    technique can ever paint over a webview's own native background — it's a layer
    behind the web content, not part of it. Fix: `capacitor.config.json` now sets
    `"backgroundColor": "#0D1014"` (matching `--ink`) at both the top level and under
    `ios.backgroundColor`. **Don't remove this thinking it's unused/redundant with
    CSS** — it's the one piece of this whole investigation that wasn't already a
    Capacitor default, and it's what a CSS-only approach can structurally never fix.
  - **Native config changes need a real Xcode rebuild, not just a webview reload or
    even a normal incremental `npx cap run ios`** — `xcodebuild clean` first (project
    is SPM-based in Capacitor 8.x, no `.xcworkspace`, use `-project App.xcodeproj
    -scheme App`), then rebuild, whenever `capacitor.config.json`'s native-facing keys
    (`backgroundColor`, `ios.*`, `plugins.*`) change.
- `.panel` needs `overflow-y:auto` + `min-height:0` as a safety net for short landscape
  heights (e.g. iPhone SE), since it has a definite stretched height (`align-items:
  stretch` on `.wrap`) instead of natural/auto height. `.stage`/`.boardWrap` also need
  `min-height:0` — same implicit-min-size gotcha as the narrow-viewport section above,
  just the vertical-axis version (grid/flex items don't shrink below content size by
  default).
- **`.panel{margin-right:calc(-1 * env(safe-area-inset-right))}`** — closes the same
  kind of redundant-double-inset gap as `.wrap`'s old `gap`/`padding` above, just on
  the sidebar's outer edge instead of the board's: `.panel`'s own `padding` (the
  comfortable clamp value) is already a safe inset for its cards/buttons, so
  additionally reserving `body`'s `env(safe-area-inset-right)` *on top of* that padding
  left an oversized, unnecessary gap between the sidebar and the true right edge. The
  fix lets `.panel`'s content shift into the reclaimed space rather than compensating
  with extra padding — content is still safely inset (by `.panel`'s own padding alone,
  from the new true-edge boundary), just no longer double-inset. `.panel` sits at the
  **physical right edge in both RTL and LTR** (confirmed via the grid mechanics: RTL's
  default column order plus LTR's explicit `order:2` on `.panel` both resolve to the
  narrow track landing on the right), so this is a plain physical `margin-right`, not a
  logical property — don't "fix" it to `margin-inline-end` assuming that's more
  RTL-correct, it would move to the wrong side in RTL specifically.
- **Sidebar DOM order (top to bottom): title → `.chipRow` (round chip + dark-mode
  toggle) → `.log` (tally + round history) → `.now` (current tile/buttons) → bottom
  `.bar`.** `.panel` is a plain flex column with no explicit per-child order/position,
  so this is purely DOM order in `index.html` — reordering it again just means moving
  the `<div>`s, no CSS coupling to worry about.
- **Sidebar has no team cards** (`#t1`/`#t2` divs with `n1`/`n2`/`s1`/`s2`) —
  deliberately removed, not an oversight. They showed team name + this-round cell
  count, which was judged redundant: the award buttons (`b1`/`b2`) already show each
  team's name/color, and `.log`'s tally already shows the match-level score. Don't
  re-add `.team`/`.score` CSS or `n1`/`n2`/`s1`/`s2` without being asked — they were
  cleanly removed (HTML, CSS, and every JS reference, including the `t1`/`t2` DOM
  elements' `.classList.toggle('on',…)` highlight state and its `t1on`/`t2on` fields in
  `undoSnap`, which existed solely to highlight those cards and had no other purpose).
  If a similar "which team is active" indicator is wanted again, it needs a new home —
  don't assume `#t1`/`#t2` still exist as DOM ids (they're gone; `cfg.t1`/`cfg.t2`, the
  *color* config, are unrelated and still very much present).
- **`.sideTitle` wraps instead of truncating**: `white-space:nowrap` +
  `text-overflow:ellipsis` were removed (replaced with `text-wrap:balance`) so a long
  custom title wraps onto a second line instead of getting cut off with "…" — the
  panel's flex `gap` naturally pushes the round chip down to make room, no fixed
  height/collision handling needed. Don't add `white-space:nowrap` back without
  reintroducing some other overflow-safe treatment (ellipsis alone was the original
  complaint this fixed).
- **`.tally` (the match-level win-count numbers, e.g. `w1`—`w2`) is deliberately much
  larger now** (`clamp(34px,4.2vw,54px)`, up from `clamp(20px,2.4vw,30px)`) — bigger
  than it was because the sidebar had spare vertical space at the old size. It's
  intentionally now close to (or larger than) `.score` (the per-team round score,
  `clamp(22px,2.6vw,36px)`) — that's fine, they're different numbers (match wins vs.
  current-round cells owned) shown in different cards, not meant to visually match.

## Dark mode (`cfg.darkMode`, board cell theming)

A toggle (`#darkModeBtn`, next to the round chip in `.chipRow`) that inverts only the
*neutral/unclaimed* hex cells — everything else about the board is untouched. Called
"dark mode" in the UI/code (not "black mode" — renamed once already, don't revert).

- **Scope is deliberately narrow**: only the fill of neutral cells (`#h0`-`#h24` when
  not owned and not the current selection) and their letter color flip. Team-claimed
  cells (`cfg.t1`/`cfg.t2`) and the selected cell (`#FFD60A`) keep their exact colors
  and black letters in both modes — don't extend the toggle to touch those. The
  zone-fill background chevrons (drawn in `board.js`'s `drawBoard()`, `cfg.t1`/`cfg.t2`
  behind the grid) are **completely unrelated** to this toggle and must stay that way
  — they encode which edge each team links to, not a "theme."
- **Implementation lives entirely in `sync()` (`game.js`)**, not `board.js` — this is
  deliberate: `drawBoard()`/`sizeBoardCanvas()` own geometry and never need to know
  about color modes; `sync()` already re-paints every cell's `fill` from `state`/`cfg`
  on every call, so dark mode is just more conditions in that same per-cell branch:
  `neutral = state.sel!==i && !o`; cell fill is `cfg.darkMode?"#000":"#fff"` only when
  `neutral`; letter fill is `"#fff"` only when `neutral && cfg.darkMode`, else always
  `"#000"`. The per-cell `<text>` elements never had an explicit `fill` before this
  (relied on the SVG default of black) — now `sync()` always sets one explicitly every
  call, so there's no stale-fill risk across mode toggles or redraws.
- **Cell border (`stroke`) must also flip, uniformly across every cell (not just
  neutral ones)** — `drawBoard()` (`board.js`) draws each cell polygon with a hardcoded
  `stroke="#000"` at creation time and never touches it again, so once dark mode makes
  a neutral cell's *fill* black, that same hardcoded black *stroke* becomes invisible
  against it — cell borders visually disappear. This was a real bug caught after first
  shipping the toggle (fill-only, no stroke handling), not a hypothetical. Fixed the
  same way as fill: `sync()` sets `stroke` on every cell every call too —
  `cfg.darkMode?"#fff":"#000"`, uniform for all 25 cells regardless of ownership
  (team-colored cells get white borders in dark mode too, not just neutral ones — this
  was a deliberate simplification over per-cell-type border logic, for visual
  consistency across the grid rather than a mix of white and black borders side by
  side). `stroke-width`/`stroke-linejoin` are untouched, still set once in `board.js`.
- **Persisted like colors/language** (`storage.js`, `hexletters:v1:settings`), *not*
  like title/names (see "Persistence" below) — defaults to `false` (normal/white) on
  first ever run. `loadSettings()` checks `typeof s.darkMode==='boolean'` rather than a
  plain truthy check, since `false` is a legitimate saved value that a truthy check
  would silently ignore (harmless here only because `false` also happens to be the
  built-in default — don't copy the truthy-check shortcut for future boolean fields
  without the same coincidence).
- `paintDarkMode()` (`game.js`, next to `paintSel()`) syncs the toggle button's `.on`
  class/`aria-pressed` and its label text — called from `applyLang()` (so the label
  re-translates) and from the toggle's own click handler. It does **not** call
  `sync()` itself; the click handler calls both `paintDarkMode()` and `sync()`
  separately, since one updates the button chrome and the other repaints the board.

## Rounds and matches

- Matches are best-of 1/3/5 (`cfg.rounds`), configured on the home screen. A team wins
  the match once its round-win count reaches `Math.ceil(cfg.rounds/2)`.
- **The round chip shows an ordinal ("الجولة الأولى"), not "الجولة 1 من 3"** — a
  deliberate format change. `T[lang].roundOrdinals` (`i18n.js`) is a 5-entry array
  (index 0 = round 1), enough for the max `cfg.rounds=5`; `roundOrdinal(n)` (`game.js`,
  next to `teamLabel`) looks it up with a numeric fallback if ever out of range. Both
  `applyLang()` and `sync()` call it to keep `#roundNo` current on language switch and
  on every round change. The old `#cOf`/`t.of` ("من 3") pieces were removed entirely —
  don't reintroduce a "round N of M" format without being asked; the round-log entries
  in `.log li` (`${t.round} ${h.r}`) intentionally still use the plain number, that
  wasn't part of this change, only the chip was.

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
- **Privacy policy page exists (`privacy.html`, project root), but isn't hosted
  anywhere yet — that's the one remaining piece before App Store submission.** Apple
  requires a public URL for every listing, even though this app collects no data and
  has no backend. `privacy.html` is a standalone, self-contained page (own inline
  `<style>`, own Google Fonts `<link>` — doesn't depend on `styles.css`/the app bundle
  at all, since it needs to work hosted on its own, separately from the app), bilingual
  Arabic (RTL, primary) + English sections, matching the app's dark theme colors by
  value (not by importing `styles.css`). **Deliberately not part of the app bundle**:
  not in `sw.js`'s `ASSETS`, not copied by `sync-web` into `www/` — it's a public
  document Apple links to from App Store Connect, not something the app itself
  navigates to, so it doesn't belong in the offline-app asset list. Needs actual
  hosting (e.g. GitHub Pages, or any static host) before the URL can go into App Store
  Connect — that hosting step is still outstanding, out of scope until asked.
- **Orientation is per-screen, not a single static lock**: `Info.plist`'s
  `UISupportedInterfaceOrientations` (and `~ipad` variant) allow *all three*
  (`Portrait`, `LandscapeLeft`, `LandscapeRight`) — this was originally a
  landscape-only static lock (portrait removed entirely) but changed to allow
  portrait again once the requirement became "only the home screen is portrait,
  every other screen force-locks to landscape." Since a Capacitor app is a single
  `WKWebView`/view controller, there's no such thing as "this native screen is
  portrait, that one is landscape" at the OS level — the *supported* list has to
  include everything any screen might lock to, and `orientation.js` actively locks
  to the right one as the app navigates between screens (see below). Don't narrow
  `UISupportedInterfaceOrientations` back down without also removing the
  corresponding `lockPortrait()`/`lockLandscape()` calls, or a screen could try to
  lock to an orientation the OS no longer allows.
  - Verified no `INFOPLIST_KEY_UISupportedInterfaceOrientations*`/
    `GENERATE_INFOPLIST_FILE` build settings exist in `project.pbxproj` that would
    generate a competing Info.plist and shadow the file directly — if either ever
    gets added (e.g. a future Xcode upgrade migrating to build-setting-driven
    Info.plist generation), the orientation lists need to move there instead.
- **`orientation.js` (new module) + `vendor/`** — `lockPortrait()`/`lockLandscape()`,
  called at every screen transition: `lockPortrait()` on initial load (home is always
  the start screen), in `goHome()` (`game.js`), and in `tourBack()`'s exit-to-home
  path and `tourFinishTournament()` (`tournament.js`); `lockLandscape()` in
  `startBtn.onclick` and `tourOpen()`/`tourLaunchMatch()`/`tourReturnToBracket()`.
  `tourConfirmExit()` needs no separate call since it already routes through
  `goHome()`. Both helpers are no-ops wrapped in try/catch — safe to call from a
  plain browser (no native platform) or if the plugin bridge isn't present for any
  reason; never let an orientation call be able to break navigation.
  - `lockPortrait()`/`lockLandscape()` also toggle the native status bar now
    (`setStatusBarHidden(false)`/`(true)`, `@capacitor/status-bar`) — hidden on every
    landscape screen (game + tournament), shown again on the portrait home screen.
    This was added specifically because a black strip across the *entire* screen
    width (sidebar included, not just the board) turned out to be the real native
    status bar itself compositing on top of the app, which is invisible to any CSS
    safe-area/`env()` trick — those only affect where *web content* avoids the notch,
    not whether the OS status bar is drawn at all. If a similar full-width (not just
    board-width) dark strip ever reappears, check this toggle before reaching for
    more CSS. Reuses the exact same per-screen call sites as orientation lock, so no
    other file needed to change to wire it up.
  - **`@capacitor/screen-orientation` and `@capacitor/status-bar` are consumed
    without a bundler**, matching this project's no-build-step rule for the *web app*
    itself: `vendor/capacitor.js`, `vendor/capacitor-screen-orientation.js`, and
    `vendor/capacitor-status-bar.js` are the plugin ecosystem's own prebuilt browser
    IIFE bundles (each package's `unpkg` field points at exactly these files) copied
    in from `node_modules` — not authored here, don't hand-edit them. They're loaded
    as plain `<script>` tags in `index.html`, before `i18n.js`, which is what makes
    `window.Capacitor.Plugins.ScreenOrientation`/`.StatusBar` exist for
    `orientation.js` to call. Regenerate them (re-copy from `node_modules`) if either
    plugin is ever upgraded. `sync-web` copies `vendor/` into `www/vendor/` and
    `sw.js`'s `ASSETS` precaches all three files — same "must be listed or offline
    breaks" rule as every other runtime file.
  - This also means `Capacitor.Plugins.ScreenOrientation`/`.StatusBar` are reachable
    in the plain browser/PWA build too (`vendor/capacitor.js` doesn't check platform
    before defining itself) — calls there fall through to each plugin's *web*
    implementation, which either no-ops or rejects harmlessly (try/catch swallows
    it), so this is fine, not a bug to "fix" by gating the vendor scripts to
    native-only.

## Persistence (`storage.js`)

A small localStorage-backed module, loaded after `game.js`/`tournament.js` and before
`pwa.js`, so it can read/write `cfg` (defined in `game.js`) and re-run `game.js`'s own
render functions after loading.

- **What's persisted**: per-team colors (`cfg.t1`/`cfg.t2`) and UI language
  (`cfg.lang`) only. Saved under one versioned key, `hexletters:v1:settings`, as a
  single JSON blob (not one key per field).
- **What's deliberately NOT persisted**: game title (`cfg.title`) and per-team names
  (`cfg.names`) — every fresh app launch resets these to `game.js`'s own defaults
  (`{ar:"خلية الحروف",en:"Letter Hive"}` and `{1:"",2:""}`), even if the previous
  session set custom ones. This was a deliberate reversal (colors/language should
  survive a restart, title/names should not) — `saveSettings()`/`loadSettings()`
  simply never read or write `title`/`names` at all; don't add them back without being
  asked again. Also still not persisted: tournament progress (leaving a tournament —
  back button, exiting, or closing/reloading the app — discards it entirely, a
  separate deliberate choice, not an oversight) and, for the 2-team game, `cfg.rounds`/
  `cfg.letters`.
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
  listeners, `segLang`'s click handler) — still called from all of these on purpose,
  even the title/name ones, since `saveSettings()` itself is what filters down to just
  `t1`/`t2`/`lang`; the call sites don't need to know which fields actually get saved.
  The wrapper itself guards `typeof saveSettings==='function'` before calling into
  `storage.js` — same optional-hook pattern as `onMatchOver` in the tournament
  integration, so `game.js` still works standalone if `storage.js` ever fails to load.
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
- The draw (`tourDoDraw()`, called by the `setup` step's Draw button) is a Fisher-Yates
  shuffle into `tour.seeded` — the actual seeding result — followed immediately by
  `renderBracket(true)` + `runDrawReveal()`, which **animate** that already-decided
  result being revealed. **The draw result is computed synchronously and instantly, in
  one place (`tourDoDraw`); the reveal is a separate, purely presentational replay of
  it** — don't conflate the two. If the reveal animation is ever changed again, the
  shuffle/seeding logic shouldn't need to change at all, and vice versa.
  - `renderBracket(revealing)`: when `revealing` is true, only the **round-1** match
    slots (`left[0]`/`right[0]` — the directly-seeded teams, the only slots a draw
    actually determines) render blank with predictable ids (`tourSlot0`, `tourSlot1`,
    …, assigned in DOM order: all of `left[0]`'s slots first, then all of `right[0]`'s)
    instead of their real team name — every other round already correctly shows `TBD`
    regardless (`m.a`/`m.b` are `null` until a match is actually played later, a
    completely separate flow), so nothing else needs blanking. `revealing` false/absent
    (every other call site — returning from a played match, language switch, etc.)
    renders real content everywhere, exactly as if no reveal ever happened — this is
    what guarantees "draw result stays identical," since it's the exact same function
    generating both the mid-reveal skeleton and the final state.
  - `runDrawReveal()` (`tournament.js`) drives the animation by grabbing those slot ids
    directly and mutating `textContent`/classes on a timer — it does **not** call
    `renderBracket()` again per-team (that would be wasteful full-DOM-replace churn 25
    times over); it only calls `renderBracket(false)` once, at the very end, to
    guarantee the final DOM is byte-for-byte what a normal (non-revealing) render would
    produce. Per-slot timing is a fixed **750ms budget regardless of team count**
    (`PER=750`) — total reveal time is an emergent property of slot count (`tour.size`
    slots always, one per team — round-1 always has exactly `tour.size/4` matches per
    side × 2 slots × 2 sides = `tour.size` slots, regardless of bracket depth), not a
    fixed total divided down — don't "simplify" this into a fixed total race-condition
    across slots. Reduced-motion (`prefers-reduced-motion`) sets the flicker duration to
    `0` (skips straight to the lock state) but keeps the same 750ms per-slot budget —
    the *style* of the transition changes, not the pacing.
  - **Skip must be instant, not just "stop scheduling more"**: each in-flight slot's
    `cancelCurrent` closure clears its own pending `setInterval`/`setTimeout`s
    synchronously before `finishAll()`'s `renderBracket(false)` runs — if skip only set
    a flag that the *next* iteration checked, the currently-animating slot's own timers
    would still fire up to ~750ms later, against DOM nodes `renderBracket(false)` has
    already replaced (harmless, since they're detached, but wasteful and not "instant").
  - **Scroll-follow uses `element.scrollIntoView({behavior:'smooth', inline:'center'})`
    on `#tourR1L`/`#tourR1R`/`#tourFinalCol`, not manual `scrollLeft` math.** This is
    deliberate: WebKit's RTL `scrollLeft` sign convention is a known cross-browser
    inconsistency, and this app must render correctly in both directions (see
    "Direction (RTL/LTR)"). `scrollIntoView` resolves direction internally per spec, so
    there's no RTL-specific branching needed in `tournament.js` at all — don't
    reintroduce manual scroll-position math to "optimize" this, it would need to
    special-case RTL and is exactly the kind of thing this sidesteps on purpose. Scroll
    triggers exactly twice during a normal (non-skipped) reveal — once when
    `runDrawReveal()` starts (left wing) and once when the loop reaches `idx===leftCount`
    (right wing) — never per-slot, matching the "scroll per wing, not a jump on every
    team" requirement.
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
