# The journey, and the technical sequence behind it

End to end: what a person does, and what the system does at each step.

Companions: `PRD.md` (what and why) · `TECH-SPEC.md` (architecture) ·
`MUSIC.md` (playback and rights) · `GROWTH.md` (the shape of the product).

**Mode:** this describes **gift mode** — one person builds a whole tape and gives
it to one person. The data model is shaped so **duet mode** (one song a day,
two-sided, from `GROWTH.md`) layers on later as a *view change* rather than a
rewrite. See §6.

Legend: 🟢 built · 🟡 partial · 🔴 not built

---

## 1. The shape of the whole thing

```
  SENDER                         SYSTEM                        RECIPIENT

  land ──────────────▶ static shell, restore local state
  write on the label ▶ local only
  pick an era ───────▶ live cover render
  find a song ───────▶ catalogue (instant) ─┬─▶ /api/search (Deezer→iTunes)
  say why ───────────▶ entry.reason         │
  repeat ×12                                │
  publish ───────────▶ POST /api/tapes ─────┴─▶ resolve queue (async)
                              │                        │
                              ▼                        ▼
                        {id, ownerToken}      Art Track IDs + links
                              │                        │
                              └────── link ────────────┴──▶ opens /t/:id
                                                              │
                                                    cover, note, tracklist
                                                              │
                                                    press play ──▶ player
                                                              │    in the
                                                    reason surfaces  window
                                                    per track    │
                                                              │
                                                    "open in Spotify"
                                                              │
                                                    "make one back" ──┐
                                                                      │
                              ◀───────────────────────────────────────┘
```

---

## 2. Journey A — the sender

### Step 1 · Land 🟢
**Sees** the tape, already interactive. No signup, no modal, no splash.
**System**
- Serve static shell: `index.html`, `brand.css`, `catalog.js`, `search.js`,
  `themes.js`, `cover.js`
- `load()` restores from `localStorage` key `mixtape-moodboard`; migrate on read
  by schema `v`
- First paint target <1.5s on 4G mid-tier Android

> Nothing is fetched. Nothing is asked. The cost of starting is zero — this is
> the single most important property of the funnel.

### Step 2 · Write on the label 🟢
**Sees** types title / for / from *on the cassette itself*, in blue handwriting.
**System** local state; `save()` on input; `scheduleThumbs()` re-renders the era
polaroids at 220ms debounce.

### Step 3 · Pick the era 🟢
**Sees** a fan of polaroids, each showing *their* tape in that era's design.
Selection is a hand-drawn blue ring.
**System** `Cover.render(buffer, state, THEMES[i])` at 1080², downscaled to 216px
per polaroid. Five eras.

### Step 4 · Find a song 🟡
**Sees** types a name — results appear instantly. Or picks a mood chip
("longing", "missing you") and browses.
**System**

```
keystroke ─▶ debounce 220ms ─▶ Search.search(q)
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
        searchCatalog()  (instant, offline)   searchRemote()  [flagged]
        ~170 curated songs, scored:            /api/search
        exact > prefix > substring,            Deezer ──429/5xx──▶ iTunes
        title above artist                              │
                    │                                   ▼
                    └────────── dedupe ──────── normalised Track[]
                                   │
                                   ▼
                     8 results, keyboard navigable
                     manual entry ALWAYS visible
```

- Remote is **never blocking** — the catalogue has already answered
- Abort superseded requests; out-of-order responses must not repaint stale results
- All providers down ⇒ quiet inline note, manual entry unaffected

### Step 5 · Say why 🔴 ← **the product**
**Sees** after adding a song, one prompted line: *"why this one?"* Blue
handwriting, on the track row. Optional, but asked for every time.
**System** `entry.reason`, persisted with the entry.

> This is the thing Spotify structurally cannot ship and the reason the tape is
> not a playlist. It is also the cheapest possible test of the whole premise: if
> people won't write the why, nothing downstream matters. **Build this first.**

### Step 6 · Watch it fill 🟢
**Sees** Side A / Side B splitting, the C-90 budget ticking toward 45:00 a side,
the cover updating live.
**System** duration from `track.durationMs`, falling back to 210s. Cap at 12 with
a friendly stop, not a validation error.

### Step 7 · Publish 🔴
**Sees** *"get a link"* → a URL to copy, and the cover to download.
**System**

```
client                          edge                        store
  │                               │                            │
  ├─ POST /api/tapes ────────────▶│                            │
  │   Idempotency-Key: <uuid>     ├─ dedupe on key ───────────▶│
  │                               ├─ mint id (≥128-bit)        │
  │                               ├─ mint ownerToken           │
  │                               ├─ persist tape ────────────▶│
  │                               ├─ ENQUEUE resolve (async) ──┼──▶ §4
  │◀── {id, ownerToken} ──────────┤                            │
  │                                                            │
  └─ store ownerToken locally  ← capability, not an account
```

- Publishing **must not wait** on resolution. The link works immediately; players
  fill in behind it.
- `ownerToken` is how edit/revoke works before accounts exist.
- Retry after timeout reuses the idempotency key — never a duplicate tape.

---

## 3. Journey B — the recipient

### Step 8 · Open the link 🔴
**Sees** the cover, who it's from, the note. No signup. No modal. No app install.
**System** `GET /t/:id`, server-rendered.
- OG + Twitter tags so it previews properly in WhatsApp / iMessage — **the
  preview is the first impression, not the page**
- `noindex`; no third-party scripts on this route
- 404 if revoked; 60s edge cache

### Step 9 · Press play 🔴
**Sees** the cassette — **and the player inside its window**, showing album art,
playing the tape in order.
**System**

```
player.js  ─▶  YouTube IFrame API
               ├─ ≥480×270, visible, unobscured      ← policy, non-negotiable
               ├─ native controls, branding intact
               ├─ playlist = resolved Art Track IDs in tape order
               └─ onStateChange ─▶ nowPlayingIndex ─▶ UI
```

Why it looks right: an **Art Track is static cover art**, so the window shows
album artwork — exactly what a tape window should show. The compliance
requirement and the brand want the same thing. See `MUSIC.md`.

Unresolved track ⇒ row still renders, play button deep-links to a search. Never
a broken tape.

### Step 10 · Read why, per track 🔴
**Sees** as each track plays, the sender's line surfaces beside it.
**System** `nowPlayingIndex` from the IFrame state events drives which
`entry.reason` is shown. This is the emotional payload of the whole product —
it should be the most considered animation in the app.

### Step 11 · Listen properly 🔴
**Sees** *"open the whole tape in Spotify / Apple Music"*.
**System**
- Recipient OAuth in **their** browser; create a private playlist named after the
  tape, note in the description
- **Tokens never touch our server**
- Denied or unsupported ⇒ per-track universal links (Odesli). Always a floor.

### Step 12 · Make one back 🔴
**Sees** a quiet CTA, prefilled with them as sender.
**System** seeds a new tape locally. In duet mode this becomes *"fill Side B"*
against the same tape id.

---

## 4. Sequence R — resolution

Server-side, asynchronous, off the request path. This is the quota-critical
piece; get it wrong and the app dies at a few hundred users.

```
for each track:

  1. CACHE          key = isrc || normalize("title|artist")
     ├─ hit ──▶ done. zero external calls.        ← the common case
     └─ miss ↓

  2. ODESLI         free, ~10 req/min
     ISRC or provider URL ──▶ youtube / youtubeMusic / spotify / apple
     ├─ hit ──▶ store, done                       ← ZERO YouTube quota
     └─ miss ↓

  3. YOUTUBE DATA API   search.list — 100 units of 10,000/day
     q="{artist} {title}", type=video, videoCategoryId=10
     keep results where channelTitle endsWith " - Topic"   ← Art Tracks
     ├─ hit ──▶ store, done
     └─ miss ↓

  4. UNRESOLVED     track still displays; play deep-links to a search

  5. WRITE ──▶ GLOBAL, PERMANENT cache, shared by every user, forever
```

**The arithmetic.** `search.list` is 100 units against 10,000/day — about **100
searches per day across all users combined**, no paid tier, extensions by manual
Google review. Unusable per-user. But tapes skew hard to well-known songs, so a
shared permanent cache saturates quickly and Odesli absorbs most of the misses at
no YouTube cost. **The cache must be global and persistent.** A per-session cache
looks fine in testing and falls over in week one.

**ISRC availability is uneven** — Deezer `/search` and the iTunes Search API
don't return it (Deezer's `/track/{id}` does; Spotify search returns
`external_ids.isrc`). The cache key degrades to normalised `title|artist`.

---

## 5. Failure paths

No third party is ever a hard dependency for making, rendering or sharing a tape.

| Situation | What the person experiences |
|---|---|
| Song in no catalogue | Types it by hand; the row looks identical to a matched one |
| Search provider 429 | Falls through; if all fail, a quiet line — *"showing what's built in"* |
| Offline mid-build | Everything keeps working from local state; publish queues |
| Publish times out | Retry reuses the idempotency key — never a duplicate |
| Track unresolved | Row renders; play deep-links to a search |
| Odesli rate-limited | Serve cached; resolve the rest later |
| YouTube quota exhausted | New tracks stay unresolved until tomorrow; everything cached still plays |
| Recipient denies Spotify OAuth | Universal links; no dead end |
| Recipient has no streaming at all | Tracklist + reasons + cover — the artefact is intact |

---

## 6. Gift now, duet later

The entire pivot rests on **two fields**: `authorId` and `addedAt` on each entry.

| | Gift mode (now) | Duet mode (later) |
|---|---|---|
| `mode` | `"gift"` | `"duet"` |
| `participants` | one | two |
| `authorId` | same for every entry | alternates |
| `side` | derived — first half A | authored — you fill A, they fill B |
| `addedAt` | ignored | drives the daily view |
| View | whole tape at once | drip, newest first |

Same records. Same API. Different projection. Ship `mode: "gift"` with one
participant and nothing has to be migrated when duet arrives.

---

## 7. Build order

| # | Slice | Why here | Verifiable in sandbox |
|---|---|---|---|
| 1 | `reason` per track, local | Tests the premise. If people won't write the why, stop. | ✅ |
| 2 | `player.js` vs a hardcoded Art Track ID | Proves the window embed and the policy geometry | ❌ needs `youtube.com` |
| 3 | `/api/resolve` + permanent cache | The quota-critical piece | ❌ needs Odesli/YouTube |
| 4 | `/api/tapes` + `/t/:id` | Sharing — the product's whole distribution | ⚠ needs hosting |
| 5 | Voice notes | The thing that makes someone cry | ✅ |
| 6 | Duet mode | Only after the gift shape is validated | ✅ |

**Sandbox blocker.** This session's egress policy 403s `itunes.apple.com`,
`api.deezer.com` and `salon.wtf`; `youtube.com` and `api.song.link` will be
blocked identically. Slices 2–4 need either an allowlist for those hosts, or a
local fixture server mirroring the real response shapes — the
`fromDeezer`/`fromItunes` normalisers in `search.js` exist for exactly that, and
the swap to live is a base-URL change.

---

## 8. Verification

Per `.claude/skills/build-loop`. Rights is blocking.

- **function** — add song → write reason → publish → open tape → player loads →
  advances → reason surfaces. Plus every row of §5.
- **design** — every screen and every cover theme rendered and critiqued; the
  player must sit in the cassette window without breaking the ±1.5° tilt budget.
- **rights** — network log proves no audio from our origin, player ≥480×270 and
  unobscured, branding intact, **no third-party artwork in the exported PNG**.
- **a11y/perf** — keyboard path to play/pause, `prefers-reduced-motion`, budget.
- **copy** — *"why this one?"* and all new strings in the house voice.
