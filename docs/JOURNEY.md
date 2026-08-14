# User journeys — start to end

Every flow a person can take, with the screen state and the system behaviour at
each step. Written to be executable: an agent should be able to build from this
without inventing behaviour, and a verifier should be able to drive it.

Companions: `PRD.md` (what/why) · `TECH-SPEC.md` (how) · `BUILD-PLAN.md` (order).

Legend: 🟢 built · 🟡 partial · 🔴 not built

---

## The map

```
                    ┌──────────────────────────────────┐
                    │  ANONYMOUS — no account, ever     │
                    │  required to complete this row    │
                    └──────────────────────────────────┘

  J1 first visit ─▶ J2 create ─▶ J3 say why ─▶ J4 cover ─▶ J5 send
                                                              │
                                              ┌───────────────┴────────┐
                                              ▼                        ▼
                                    J6 recipient opens        J10 claim the tape
                                              │                  (magic link)
                                    J7 PRESS PLAY ◀── the product        │
                                              │                        ▼
                                    J8 flip to side B          J11 my library
                                              │
                                    J9 make one back ──────────▶ back to J2
```

---

## J1 · First visit 🟢

**Sees** The cassette, already interactive. No splash, no modal, no signup.
**System** Static shell + `localStorage` restore. Nothing fetched, nothing asked.

> The cost of starting is zero. This is the most important property of the
> funnel and nothing may be added in front of it.

**Done when** a first-time visitor can type on the tape within one second of
paint.

---

## J2 · Create the album 🟡

### J2.1 Write on the label 🟢
**Sees** Types title, "for", "from" directly onto the cassette in blue ink.
**System** Local state, debounced save, live cover thumbnails.

### J2.2 Pick the era 🟢
**Sees** A fan of polaroids, each showing *their* tape in that era. Selecting
draws a hand-drawn ring on.
**System** `Cover.render` at 1080² downscaled per polaroid.

### J2.3 Find a song 🟡
**Sees** Types; results appear instantly. Or picks a mood chip and browses.

```
keystroke ─▶ debounce 220ms ─▶ Search.search(q)
                 │
     ┌───────────┴────────────┐
     ▼                        ▼
 catalogue (170)          /api/search  🔴
 instant, offline         Deezer ─429/5xx─▶ iTunes
     │                        │
     └────── dedupe ──────────┘
                 │
        8 results, keyboard navigable
        "add it by hand" ALWAYS visible
```

- Remote never blocks — the catalogue has already answered
- Abort superseded requests; stale responses must not repaint
- All providers down → quiet inline note, manual entry unaffected

**Done when** a song not in the 170-song catalogue can be found by name.

### J2.4 Add by hand 🟢
**Sees** "not here? add it by hand" — always present, not hidden behind a
zero-results state. The resulting row is visually identical to a matched one.

---

## J3 · Say why 🟢 ← **the product**

**Sees** The moment a song is added, the caret lands in *"why this one?"* on
that row. Blue handwriting. Optional, but asked every time.
**System** `entry.reason`. Saves on input and **never re-renders the list** —
re-rendering steals the caret.

> This is the thing a playlist cannot do. If people won't write here, the
> premise is wrong and we should know that before building anything else.

### J3.1 Voice note 🔴 (P1)
**Sees** A small mic on the row. Hold to record, ≤15s, waveform, re-record.
**System** `MediaRecorder` → `POST /api/tapes/:id/voice` → R2. **Only the
sender's own audio** — the one sound we may legally host.

---

## J4 · Watch the tape fill 🟢

**Sees** Side A / Side B splitting at the halfway point, a C-90 budget ticking
toward 45:00 a side, the cover updating live.
**System** Real durations where known, 3:30 fallback. Twelve-song cap with a
friendly stop, never a validation error.

---

## J5 · Send it 🟡

**Sees** The finished cover. Two actions: **copy the link**, download the image.
**System**

```
client                        edge                      D1 / KV
  │                             │                          │
  ├─ POST /api/tapes ──────────▶│                          │
  │   Idempotency-Key: <uuid>   ├─ dedupe on key ─────────▶│
  │                             ├─ id (>=128 bits)         │
  │                             ├─ ownerToken              │
  │                             ├─ insert tape + entries ─▶│
  │                             ├─ ENQUEUE resolve ────────┼─▶ §J7.0
  │◀─ { id, ownerToken, url } ──┤                          │
  │                                                        │
  └─ store ownerToken locally  ← capability, not an account
```

- Publishing **never waits on resolution**. The link works immediately.
- Retry reuses the idempotency key — never two tapes.
- 🔴 Today this is a URL fragment; server-backed short links + OG images are P0.

**Done when** pasting the link into WhatsApp shows the cover as the preview.

---

## J6 · The recipient opens it 🟡

**Sees** Cover, who it's from, the note, the tracklist with reasons.
**No signup. No modal. No "open in app".**
**System** `GET /t/:id` SSR with OG tags, `noindex`, 60s edge cache. 410 if
revoked. Fires `POST /api/events {type:"open"}` — a counter, never contents.

---

## J7 · Press play 🔴 ← **the critical path**

### J7.0 Resolution (server-side, before this point)

```
per track:  KV cache ─hit─▶ done (zero external calls)
                 │miss
                 ▼
            Odesli ─hit─▶ cache, done      ← zero YouTube quota
                 │miss
                 ▼
            YouTube search.list (100 units) → first "… - Topic" channel = Art Track
                 │miss
                 ▼
            unresolved → skipped in the queue, keeps an outbound link
```

### J7.1 The tap

**Sees** A play button on the tape. Tapping it: the cassette window becomes the
player, showing the album art of track one, and **the song starts**.

**System**
1. First tap is the autoplay gesture — never attempt autoplay on load
2. Lazy-load the IFrame API (~90KB) only now
3. Build a queue of **resolved entries only**
4. `loadVideoById(queue[0])`

### J7.2 While it plays

**Sees** The player in the cassette window. The row for the current track
highlights, and **its reason surfaces**. Transport: play/pause, next, previous.

**System** Our queue index is the source of truth — *not* `getPlaylistIndex`,
because unresolved tracks make the two drift. `onStateChange(ENDED)` advances.
`onError` (2/5/100/101/150) marks the entry unavailable and advances.

### J7.3 Reaching the end of side A

**Sees** The cassette flips itself, side B's tracklist comes up, playback
continues without a gap.

### J7.4 When it can't play

| Situation | What happens |
|---|---|
| One track unresolved | Skipped silently; the row keeps a "listen" link |
| Video pulled or region-locked | `onError` → skip, mark unavailable |
| Embed blocked (school/corp) | `onReady` timeout → whole page falls back to tracklist + outbound links, with a plain explanation |
| Autoplay refused | Play button stays; a tap always works |

**Done when** opening a shared link and tapping play produces audio in under
three seconds, and the reason for the playing track is on screen.

---

## J8 · Flip to side B 🟢

**Sees** "flip the tape ↻". The cassette turns in 3D; side B's label is the
same tape *written later* — aged paper, grey biro, badge stamped off-square,
reels swapped because it has been played through. The tracklist turns with it.
**System** `motion.js flip()` + `crossFade()`. Playback continues across the flip.

---

## J9 · Make one back 🔴

**Sees** A quiet CTA, prefilled with them as the sender and the other person as
recipient.
**System** Seeds a new local tape. This is the loop — the metric that decides
whether this is a product or a novelty.

---

## J10 · Claim the tape 🔴

Offered **after** the tape exists and has been sent — never before.

**Sees** "keep this tape?" → one email field → "check your email".
**System**

```
POST /api/auth/request { email, tapeId }
  → 32-byte token, store sha256, 15-min TTL, single use
  → send the link. ALWAYS respond 200 — no account enumeration.

GET /api/auth/callback?token=…
  → verify, mark used, upsert user, create session (30d, HttpOnly cookie)
  → claim the tape if still unowned  → 302 /me
```

**Failure paths**
| Case | Behaviour |
|---|---|
| Link expired | "that link has expired" + one-tap resend |
| Link reused | Same message; single-use is enforced |
| Wrong device | Works — the token is the auth, not the device |
| Email never arrives | Resend after 60s; check-spam hint |

---

## J11 · My library 🔴

**Sees** `/me` — a grid of tape covers. Sent and received. Open, re-share,
duplicate, revoke.
**System** `GET /api/me`. Session cookie required; unauthenticated → sign-in.

### J11.1 Edit a published tape
Change songs, reasons or cover; the **same link** updates. `PATCH /api/tapes/:id`
authorised by session or `X-Owner-Token`. Re-resolve any new tracks.

### J11.2 Revoke
`DELETE /api/tapes/:id` → soft delete. The link then returns 410 with a plain
"this tape was taken down" page.

### J11.3 Delete account
`DELETE /api/me` → hard-deletes user, tapes, entries and R2 voice objects.

---

## Cross-cutting failure paths

| Situation | Behaviour |
|---|---|
| Offline mid-build | Everything works from local state; publish queues |
| Publish times out | Idempotency key on retry — never a duplicate |
| Search providers 429 | Fall through, then catalogue only, then manual |
| Odesli rate-limited | Serve cached, resolve the rest on the next read |
| YouTube quota exhausted | New tracks stay unresolved until reset; cached tapes unaffected |
| localStorage disabled | In-memory, with a warning it won't survive reload |
| Very long strings | Ellipsis everywhere; verified by render, not by inspection |

---

## Journey → requirement map

| Journey | PRD | State |
|---|---|---|
| J1 first visit | — | 🟢 |
| J2 create | A1–A5, A7, A9 | 🟡 A4 missing |
| J3 say why | A6 | 🟢 |
| J3.1 voice | A8 | 🔴 |
| J4 fill | A7 | 🟢 |
| J5 send | C1, C2, C3, C5 | 🟡 fragment only |
| J6 open | C4 | 🟡 no SSR/OG |
| **J7 play** | **B1–B7** | **🔴 the gap** |
| J8 flip | B6 | 🟢 |
| J9 make one back | C6 | 🔴 |
| J10 claim | D1–D3 | 🔴 |
| J11 library | D4–D7, E1–E3 | 🔴 |
