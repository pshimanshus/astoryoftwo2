# PRD — Mixtape

| | |
|---|---|
| Status | **Spec for build** — supersedes the phased draft |
| Product | A mixtape you make for one person, that plays inside the app |
| Docs | `TECH-SPEC.md` · `JOURNEY.md` · `BUILD-PLAN.md` · `MUSIC.md` · `GROWTH.md` |
| Design | `.claude/skills/mixtape-brand` (frozen) |
| Process | `.claude/skills/build-loop` |

---

## 1. What we are building

**A mixtape you make for one person, that they can press play on.**

Twelve songs, each with a line about *why you chose it*, wrapped in a cassette
cover in the design language of an era, sent as a link. The recipient opens it
and **the tape plays in the page** — no app install, no account, no leaving.

The three things that have to be true, in order:

1. **It plays.** A tape you can't press play on is a picture of a mixtape.
2. **It says why.** The reason is the product; the song is the attachment.
3. **It's a gift.** One person, one recipient. Not a profile, not a feed.

---

## 2. Problem

People reach for music when they can't find the words. The mixtape was the
format for that: curated, sequenced, hand-labelled, *given*.

Streaming replaced it with a shared playlist link, which carries the songs and
none of the gesture. A playlist has no cover you wrote on, no A-side and B-side,
no reason attached to track four, and no moment of handing it over. It looks
identical to the playlist you made for the gym.

**[A]** This is reasoned, not researched — no user study exists. The strongest
supporting signal is that "mixtape" survived its medium by forty years and that
custom-cassette gifts sell on Etsy today. The risk sits in §12.

## 3. Hypothesis

> A constrained, ritualised way to make and give a mixtape — with a reason per
> song and playback that works for the recipient with zero friction — makes
> music-gifting feel personal again. Measured by **≥25% of finished tapes
> shared** and **≥40% of opened tapes reaching playback**.

Falsifiable: if people build tapes but don't send them, the artefact isn't good
enough to give. If they open tapes but never press play, playback is broken or
the reasons aren't enough.

## 4. Why now

- **The rights environment closed the obvious door and left this one open.**
  Spotify shut previews and recommendations to new apps (Nov 2024) and
  restricted extended access (May 2025). Nobody can build "Spotify but nicer".
  The layer *above* playback is unclaimed.
- **Embeds make in-app playback legal and free.** YouTube's IFrame player is a
  sanctioned, keyless embed that streams label-licensed audio. We host nothing.
- Physical-media nostalgia is a live, monetised consumer trend with no good
  digital-native expression.

---

## 5. Goals and non-goals

### Goals
1. A tape can be made in **under 5 minutes with no account**.
2. **The tape plays inside the recipient's browser**, first try, no login.
3. Every song can carry a reason, and optionally the sender's **voice**.
4. Every finished tape produces **a link and an image**.
5. The app is fully usable when every third-party API is down.

### Non-goals

| Not doing | Why |
|---|---|
| Hosting or streaming audio ourselves | Needs licences unavailable to an indie app. See `MUSIC.md`. |
| A social feed, public discovery, taste profiles, follower graphs | Every competitor is fighting there, and it contradicts a one-to-one gift. `GROWTH.md`. |
| **Login before value** | Sign-up before value is where consumer funnels die. Accounts appear only once they buy the user something. |
| Being a music player | We own the gesture; platforms own playback. |
| Native apps | The product is a link. An install is the friction we exist to avoid. |

---

## 6. Users

**The Sender** — makes the tape. Has streaming, isn't a designer. Wants to say
something they can't say directly. Afraid it lands as cheesy or looks templated.

**The Recipient** — opens a link cold, usually on a phone, from someone who
matters. Any wall — signup, install, "open in app" — kills the moment.

**The Keeper** — the recipient a week later, wanting it to still be there.
This is the only user who needs an account, and only for that reason.

### Anti-personas

| Not for | Why |
|---|---|
| Playlist power-users | Want a library manager. The 12-song cap is the point. |
| Artists promoting a release | Want reach and analytics. Turns the gesture commercial. |

---

## 7. Jobs to be done

| # | Job |
|---|---|
| J1 | When I can't say how I feel, I want to give songs in a way that shows effort, so they know I meant it. |
| J2 | When I'm choosing songs, I want to find the right one in two keystrokes, so I stay in the feeling. |
| J3 | When a song matters for a reason, I want to write that reason next to it, so they know *why*. |
| J4 | When I've finished, I want to hand it over like an object, so it lands as a gift not a link. |
| J5 | When I get a tape, I want to **press play and hear it immediately**, so nothing breaks the moment. |
| J6 | When I love it, I want to keep it, so it isn't disposable. |
| J7 | When the song isn't in any catalogue, I want to add it anyway. |
| J8 | When I'm offline or an API is down, I want to keep working. |

---

## 8. Scope — the complete application

Priority: **P0** ship-blocking · **P1** fast-follow · **P2** later.

### A. Create *(mostly built)*
| # | Requirement | P |
|---|---|---|
| A1 | Write title / for / from on the cassette label | P0 ✅ |
| A2 | Pick one of five era covers, live preview | P0 ✅ |
| A3 | Search songs — built-in catalogue, instant, offline | P0 ✅ |
| A4 | Search songs — live providers for the long tail | **P0** |
| A5 | Add by hand when nothing matches | P0 ✅ |
| A6 | **A reason per song** | P0 ✅ |
| A7 | Reorder, remove, A/B split, 12-song cap, time budget | P0 ✅ |
| A8 | **Voice note per song** (≤15s, sender's own audio) | **P1** |
| A9 | Autosave; survive reload and offline | P0 ✅ |

### B. Playback — **the critical path**
| # | Requirement | P |
|---|---|---|
| B1 | Every track resolves to a **YT Music Art Track** video id | **P0** |
| B2 | **The tape plays in-page**, in order, in the cassette window | **P0** |
| B3 | Player is visible ≥480×270 (≥200×200 floor), branding intact | **P0** |
| B4 | Transport: play / pause / next / prev / seek within a track | **P0** |
| B5 | The **reason for the now-playing track surfaces** as it plays | **P0** |
| B6 | Auto-advance through the side; flipping continues to side B | **P0** |
| B7 | Unresolved track → skipped in sequence, keeps an outbound link | **P0** |
| B8 | Voice note plays *before* its track | P1 |
| B9 | "Open in Spotify / Apple Music" as an alternative | P1 |

### C. Share
| # | Requirement | P |
|---|---|---|
| C1 | Cover PNG 1080², our own artwork only | P0 ✅ |
| C2 | Share link | P0 ✅ (fragment) → **P0 server-backed** |
| C3 | **Real OG preview image** on the link | **P0** |
| C4 | Recipient page: cover, note, tracklist, reasons, flip | P0 ✅ |
| C5 | Short link (`/t/abc123`) | **P0** |
| C6 | "Make one back", prefilled | P1 |

### D. Accounts — **only where they earn their place**
| # | Requirement | P |
|---|---|---|
| D1 | **Everything above works signed out.** No wall, ever, before a tape exists | **P0** |
| D2 | Claim a tape after making it — email magic link, one field | **P0** |
| D3 | Sign in from any device via magic link | **P0** |
| D4 | My tapes — sent and received | **P0** |
| D5 | Edit a published tape; the link updates | P1 |
| D6 | Revoke a tape | **P0** |
| D7 | Delete account and all tapes | **P0** (legal) |
| D8 | Email when someone opens or replies to your tape | P2 |

> **Login is not step one.** An anonymous sender completes the entire journey.
> The account appears at exactly two moments where it *buys* something:
> *"keep this tape"* after sending, and *"reply"* after receiving.

### E. Library
| # | Requirement | P |
|---|---|---|
| E1 | Grid of my tapes with covers | P0 |
| E2 | Open, re-share, duplicate as a starting point | P1 |
| E3 | Received tapes, newest first | P1 |

---

## 9. Non-functional

| Area | Target |
|---|---|
| First paint | <1.5s on 4G mid-tier Android |
| **Time to first note** | **<3s from opening a tape link to audio** |
| Search P95 | <200ms cached, <900ms cold |
| Cover render | <400ms |
| Tape page availability | 99.9% — the recipient path must never be down |
| Offline | Full create/edit/render offline; publish queues |
| Accessibility | WCAG 2.1 AA, full keyboard, `prefers-reduced-motion` |
| Privacy | No analytics on tape *contents*. Ever. |
| Rights | `build-loop/references/rights-checklist.md` — blocking |

---

## 10. Success metrics

| Type | Metric | Target |
|---|---|---|
| **North star** | Tapes shared per week | growth WoW |
| Primary | Start → finished tape | ≥40% |
| **Primary** | **Opened tape → playback started** | **≥40%** |
| Primary | Recipient → makes their own within 7d | ≥15% |
| Secondary | Reasons written per tape | ≥6 median |
| Secondary | Tapes claimed with an account | ≥25% |
| Guardrail | Tracks failing to resolve | <5% |
| Guardrail | Manual-entry rate | <30% |
| Guardrail | YouTube quota incidents | 0 |

---

## 11. Edge cases

| # | Case | Handling |
|---|---|---|
| E1 | Track won't resolve | Skipped in playback, keeps an outbound link, never a dead row |
| E2 | Autoplay blocked by the browser | First play requires a tap — the play button is the gesture |
| E3 | Embed blocked (school/corp network) | Detected; fall back to outbound links with a plain explanation |
| E4 | Video pulled/region-locked after publish | `onError` → skip to next, mark unavailable, keep the link |
| E5 | Offline mid-build | Works from local state; publish queues |
| E6 | Duplicate publish / double-tap | Idempotency key; never two tapes |
| E7 | Magic link reused or expired | Single-use, 15-min TTL, clear re-request path |
| E8 | Recipient opens on a 5-year-old Android | No `backdrop-filter` → solid dock; player still embeds |
| E9 | 34-char title + twelve 90-char reasons | Ellipsis everywhere; verified by render |
| E10 | Tape link shared publicly | `noindex`; sender can revoke |
| E11 | localStorage full or disabled | In-memory + a warning that it won't survive reload |
| E12 | Wrong version resolved (live/cover) | Title and artist stay editable; re-resolve on edit |

---

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **The premise is wrong — people don't want this** | Critical | Share rate is the test. Cheapest validation costs nothing: post five covers and see if anyone asks. |
| **YouTube revokes embed access** | Critical | Comply exactly: visible ≥200×200 player, no branding stripped, no ads blocked, no hidden audio-only skin. This is why the player sits in the cassette window. |
| YouTube quota exhausted | High | Resolution never uses search when Odesli can answer; cache is global and permanent |
| Art Track missing for a song | Medium | Ladder: Art Track → official audio → outbound link |
| Reasons and voice already exist elsewhere (supertape, getmixtape) | High | Not our moat. Ours is the occasion (a gift, not a profile), the craft, and the physical tape. `GROWTH.md`. |
| Scope creep toward a playlist manager | High | The anti-personas in §6 are the argument |

---

## 13. Open decisions

| # | Question | Needed by |
|---|---|---|
| Q1 | Hosting target — Cloudflare (Workers+D1+KV) or Vercel (Functions+Postgres)? | before build |
| Q2 | Do tape links expire? Permanent hosting is a permanent cost. | before launch |
| Q3 | Buy the Apple Developer membership ($99/yr) for Apple Music export? | P1 |
| Q4 | Monetisation — the physical printed tape is the strongest candidate | later |
