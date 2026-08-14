# Build plan — for the agent doing the work

Execution order for turning the current prototype into the application in
`PRD.md`. Each slice is independently shippable and has acceptance criteria a
verifier can drive without asking questions.

**Read first:** `CLAUDE.md`, then `.claude/skills/mixtape-brand` (any UI) and
`.claude/skills/build-loop` (the process). `TECH-SPEC.md` has the contracts;
`JOURNEY.md` has the flows.

---

## Rules for every slice

1. **Load `mixtape-brand` before touching UI.** The design system is frozen.
   Do not invent tokens, spacing, type or motion — use `brand.css` and
   `motion.js`.
2. **Anonymous-first.** No slice may put an account in front of creating,
   sending or playing a tape.
3. **The rights checklist is blocking.** No audio from our origin, no
   third-party artwork in exports, player visible ≥200×200.
4. **Verify by driving the app**, not by reading the diff. Long strings, real
   content, failure paths.
5. **Max 3 maker↔verifier rounds**, then stop and escalate with the diff, the
   verifier output and one specific question.
6. Every third-party integration sits behind a flag in `window.MIXTAPE_FLAGS`
   and degrades to something usable.

**Sandbox note:** `youtube.com`, `api.deezer.com`, `itunes.apple.com` and
`api.song.link` are blocked by the egress proxy here. Build against fixtures
that mirror the real response shapes and verify live on a deployed preview.
Do not route around a 403 — report it.

---

## Slice 1 — Playback *(the reason the app doesn't exist yet)*

Everything else is secondary. Ship this first.

**Build**
- `functions/api/resolve.js` — the chain in `TECH-SPEC.md` §4: KV cache →
  Odesli → YouTube `search.list` filtered to `" - Topic"` → unresolved.
  Cache writes are permanent and global.
- Rewrite `player.js` to own an explicit queue of **resolved entries only**.
  Replace `cuePlaylist` with `loadVideoById` per advance — a mixed
  resolved/unresolved tape makes YouTube's playlist index drift from ours.
- Lazy-load the IFrame API on **first play intent**, not on page load.
- `onStateChange(ENDED)` advances. `onError(2|5|100|101|150)` marks the entry
  unavailable and advances.
- Wire the now-playing index to the reason display and the row highlight.
- End of side A auto-flips and continues.

**Acceptance**
- GIVEN a published tape of 6 catalogue songs, WHEN the recipient taps play,
  THEN audio starts in <3s and the first row highlights with its reason shown.
- GIVEN a track with `yt_video_id = NULL`, WHEN playback reaches it, THEN it is
  skipped without a stall and its row still offers an outbound link.
- GIVEN a video that returns `onError 150`, WHEN it is reached, THEN playback
  advances to the next resolved track.
- GIVEN playback on side A track 3 of 3, WHEN it ends, THEN the tape flips and
  side B track 1 plays without a gap.
- GIVEN the IFrame API is blocked, WHEN the page loads, THEN the tracklist and
  outbound links render and an explanation is shown — never a broken player.
- Player bounding box ≥480×270 desktop, ≥200×200 at 390px wide.
- Resolver: a cache hit makes **zero** external calls; an Odesli hit makes zero
  **YouTube** calls; a YouTube fallback selects the `- Topic` result over a fan
  upload.

**Verify** `scripts/verify-playback.cjs` with a stubbed IFrame API + fixture
resolver; live check on preview.

---

## Slice 2 — Backend: tapes, short links, OG images

**Build**
- D1 schema from `TECH-SPEC.md` §2 + migrations.
- `POST /api/tapes` (idempotency key required), `GET/PATCH/DELETE /api/tapes/:id`.
- `/t/:id` SSR shell with OG/Twitter tags, `noindex`, 60s edge cache.
- `GET /api/og/:id.png` — 1200×630 from the same theme painters, cached forever.
- Keep `tape-codec.js` as the offline/fallback path.

**Acceptance**
- Publishing returns a short id and a URL that renders the tape.
- Retrying with the same `Idempotency-Key` returns the same tape, never a second.
- Pasting the link into a link-preview debugger shows the cover image.
- A revoked tape returns 410 with a plain page, not a stack trace.
- Publishing works offline by queueing, and succeeds on reconnect.

---

## Slice 3 — Live search

**Build**
- `GET /api/search` — Deezer → iTunes fallthrough, normalised to the existing
  `Track` shape via the `fromDeezer` / `fromItunes` functions already in
  `search.js`. 24h edge cache. Carry `isrc` where the provider returns it.
- Flip `MIXTAPE_FLAGS.remoteSearch` on; keep the catalogue as tier one.

**Acceptance**
- A song outside the 170-song catalogue is findable by name.
- Provider 429 falls through; both down leaves the catalogue and manual entry
  working with a quiet inline note.
- No request is made per keystroke — debounced and aborted.
- Manual-entry rate stays under 30% in the driven flow.

---

## Slice 4 — Accounts

**Build**
- `POST /api/auth/request`, `GET /api/auth/callback`, `POST /api/auth/signout`.
- Magic link: 32 random bytes, store `sha256`, 15-min TTL, single use.
- Sessions: `sha256` stored, 30-day HttpOnly/Secure/SameSite=Lax cookie.
- Claim-on-signin using the `ownerToken` held from publishing.
- `GET /api/me`, `DELETE /api/me` (hard delete incl. R2).

**Acceptance**
- The whole create → send → play journey completes with **no account**.
- "Keep this tape" is offered only after a tape exists.
- An expired or reused link shows a clear message and a one-tap resend.
- `/api/auth/request` returns 200 for both known and unknown emails.
- Signing in on a second device claims and lists the same tape.
- `DELETE /api/me` leaves no tapes, entries or voice objects behind.

---

## Slice 5 — Library

**Build** `/me` — grid of covers, sent and received, open / re-share /
duplicate / revoke. Edit republishes to the **same** link and re-resolves new
tracks.

**Acceptance** Editing a published tape changes what the existing link renders.
Revoking makes it 410. Duplicating seeds a new draft without touching the
original.

---

## Slice 6 — Voice notes

**Build** `MediaRecorder`, ≤15s, per entry. `POST /api/tapes/:id/voice` →
presigned R2 upload. Playback pauses YouTube, plays the voice, resumes.

**Acceptance** A recorded note plays before its track. Only sender-recorded
audio is ever stored. Deleting the account removes the objects. Denying mic
permission degrades cleanly to text-only.

---

## Slice 7 — The loop

**Build** "Make one back", prefilled. Open/play counters. Optional email when a
tape is opened.

**Acceptance** The CTA seeds a new tape addressed back to the sender. Counters
increment without ever recording tape contents.

---

## Definition of done

A slice is done when:

- [ ] Acceptance criteria pass, driven in a real browser
- [ ] `npm run verify` is green (function, rights, a11y, perf)
- [ ] No regression in the existing suite
- [ ] Works signed out where the journey says it must
- [ ] Degrades correctly with the relevant provider down
- [ ] `docs/` updated if behaviour changed
- [ ] Committed with a message explaining *why*

---

## Sequencing rationale

Playback is first because **the product does not exist without it** — everything
shipped so far is a picture of a mixtape. The backend is second because
playback needs resolved ids stored somewhere and links need real previews.
Search is third because the catalogue makes the app demoable but not usable.
Accounts are fourth because nothing before them requires identity — and putting
them earlier would be the single most damaging thing we could do to the funnel.
