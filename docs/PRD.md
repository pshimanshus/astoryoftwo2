# PRD: Mixtape — a tape for your love

| Field | Value |
|---|---|
| Status | **Draft — awaiting Problem Alignment** |
| Type | New feature, consumer web app (with UI) |
| Depth | Full PRD |
| Last updated | 2026-07-25 |
| Design system | `.claude/skills/mixtape-brand` (frozen) |
| Workflow | `.claude/skills/build-loop` |
| Tech spec | `docs/TECH-SPEC.md` · Music: `docs/MUSIC.md` |

> ⚠ **Alignment gate open.** Sections 2–4 are the framing everything else rests
> on, and they encode judgement calls that are cheap to change now and expensive
> later. Read those four sections first. Assumptions are labelled **[A]** — they
> are reasoned, not researched, because no user research exists yet.
>
> 🔀 **A structural alternative is on the table.** `docs/GROWTH.md` argues this
> PRD describes a greeting card — one sender, two hours of work, one recipient,
> no loop — and proposes a two-sided tape filled one song a day by both people.
> If that reframe is accepted, §5 goals, §8 journeys and §14 rollout all change
> substantially. **Decide that before building past phase 2.**

---

## 1. Summary

A three-step web app for making someone a mixtape: name the tape and write on
its label, build a tracklist, and share a cassette cover rendered in the design
language of an iconic era. The app never hosts audio — it holds the *choosing*
and the *giving*, and delegates listening to the recipient's own music platform.

Steps 1 and 3 exist today. This PRD covers making the tracklist real (song
search, artwork, previews), making a tape shareable as a link rather than only a
PNG, and making it playable on the recipient's platform.

---

## 2. Problem statement

People who want to say something to someone they love, and can't find the words,
reach for music. The mixtape was the format for that: a curated, sequenced,
hand-labelled object that said *I thought about you for two hours.*

Streaming replaced it with a shared playlist link — which carries the songs but
none of the gesture. A playlist has no cover you wrote on, no A-side and B-side,
no artefact, and no moment of giving. It looks identical to the playlist you made
for the gym.

**[A]** The evidence is circumstantial rather than researched: the persistence of
"mixtape" as a metaphor decades after the medium died, the volume of Etsy/Redbubble
custom-cassette gift products, and the recurring "how do I make a playlist feel
special" genre of question. **This assumption is the biggest risk in the document**
— see §15.

### The four layers

| Layer | This product |
|---|---|
| **User problem** | "I want to give someone music as a gift, and a Spotify link doesn't feel like a gift." |
| **Business goal** | A shareable artefact with organic distribution — every tape is an ad that arrives from a trusted person. |
| **Product opportunity** | Nobody owns the *gesture* layer. Streaming owns catalogue and playback; the ritual is unserved. |
| **Solution assumption** | Ritual + constraint + a beautiful artefact make a playlist feel like a gift — and that's enough without owning playback. |

---

## 3. Hypothesis

> We believe that giving people a constrained, ritualised way to make and *give*
> a mixtape — with a cover worth sharing — will make music-gifting feel personal
> again, measured by **≥25% of finished tapes being shared**, and **≥15% of
> recipients starting a tape of their own within 7 days**, within one quarter of
> launch.

Falsifiable: if people build tapes but don't share them, the artefact isn't good
enough to give. If they share but recipients never reciprocate, there's no loop
and this is a novelty, not a product.

---

## 4. Why now

- **The rights environment forces the design and validates the gap.** Spotify
  closed previews and recommendations to new apps (Nov 2024) and restricted
  extended access (May 2025). Nobody can build "Spotify but nicer" any more —
  which means the winning move is the layer *above* playback. That layer is open.
- **Physical-media nostalgia is a live, monetised consumer trend** (vinyl,
  compact cameras, cassette merch) with no good digital-native expression.
- **Distribution favours artefacts.** A 1080×1080 cover is natively shareable in
  a way a playlist URL is not.

---

## 5. Goals & non-goals

### Goals

1. A tape can be made in **under 5 minutes** without an account.
2. Every finished tape produces **two artefacts**: a shareable image and a
   shareable link.
3. The recipient can **listen on their own platform** in one tap, whatever it is.
4. The cover is good enough that people share it **for its own sake**.
5. The app **works with no third-party API available**.

### Non-goals

| Not doing | Why |
|---|---|
| Hosting or streaming audio | Requires licences unavailable to an indie app. See `docs/MUSIC.md`. |
| Being a music player | Playback belongs to platforms; we own the gesture. |
| Social graph — profiles, follows, feeds | This is 1-to-1 and intimate. A feed makes it performative and kills the thing that works. |
| Accounts at creation time | Sign-up before value is the most likely place to lose someone. Optional account only to *keep* tapes. |
| Collaborative/multi-author tapes | Dilutes "one person chose this for me". Revisit only with evidence. |
| Native mobile apps at launch | Web + share sheet covers it; ship first. |

---

## 6. Personas

**The Sender — "Two hours on a Sunday"**
Makes the tape. 20s–40s, has a streaming subscription, is not a designer.
*Motivation:* say something they can't say directly.
*Anxiety:* that it lands as cheesy, or that it's obviously a template.
*Workaround today:* a Spotify playlist with a carefully chosen name, or a
handwritten list in a card.
*Says:* "I want it to look like I made it, not like an app made it."

**The Recipient — "What is this?"**
Receives a link or an image, cold, usually on a phone, often from a partner.
*Motivation:* see what they chose and why.
*Anxiety:* friction — a sign-up wall or an app install kills the moment.
*Success:* understands it in 3 seconds and is listening in one tap.

**The Maker — "This is my aesthetic"**
Makes tapes as craft — for friends, for a scene, to post. Cares about covers,
will try every era, shares publicly.
*Motivation:* a beautiful object with their taste in it.
*Value to us:* the entire top of the funnel.

### Anti-personas

| Not for | Why | Risk if we chase them |
|---|---|---|
| **The playlist power-user** (500-track libraries, smart sorting, cross-platform sync) | Wants a library manager. The 12-song cap is the *point*. | Removing constraints removes the ritual and we become a worse Spotify. |
| **The artist promoting their own release** | Wants reach, analytics, a landing page. | Pulls us toward a marketing tool; makes the gesture commercial and the aesthetic generic. |

---

## 7. Jobs to be done

| # | Job story | Persona |
|---|---|---|
| J1 | When I want to tell someone how I feel and can't say it, I want to give them songs in a way that shows effort, so they understand I meant it. | Sender |
| J2 | When I'm choosing songs, I want to find the right version fast without leaving the flow, so I stay in the feeling instead of fighting a search box. | Sender |
| J3 | When I've finished, I want to hand it over in a way that feels like giving an object, so it lands as a gift and not a link. | Sender |
| J4 | When I get a tape, I want to see what they made and start listening immediately on my app, so I don't have to sign up for anything. | Recipient |
| J5 | When I want to keep it, I want it to still be there in a year, so it doesn't feel disposable. | Recipient |
| J6 | When I make things, I want a format with real constraints and a beautiful output, so what I share looks like taste. | Maker |
| **Failure-state jobs** | | |
| J7 | When the song I want isn't in any catalogue, I want to add it anyway, so my tape isn't limited by someone's licensing. | Sender |
| J8 | When search is broken or I'm offline, I want to keep working, so I don't lose what I've built. | Sender |

---

## 8. User journeys

### 8.1 Sender — happy path (target: <5 min, no account)

```
Instagram/word of mouth
      ↓
Lands on the tape — already interactive, no signup, no modal
      ↓
STEP 1  writes the title directly on the cassette label
        adds "for" and "from"
        picks an era from the polaroid fan          ← covers update live
      ↓
STEP 2  types a song → sees results with artwork
        taps to add · optionally previews 30s
        reorders; side A/B splits automatically
        watches the tape-time budget fill           ← the constraint is visible
      ↓
STEP 3  sees the finished cover
        writes the p.s. note
        ┌─ downloads the PNG        → sends via WhatsApp/iMessage
        └─ copies the tape link     → recipient gets the full thing
      ↓
[optional] "keep this tape?" → email magic link, after value is delivered
```

**Design commitment:** the cover is *visible and updating* from step 1. The
reward is never hidden behind completion.

### 8.2 Recipient — cold open on a phone

```
Receives a link (or an image, then the link)
      ↓
Tape page: the cover, the note, the tracklist. No signup. No modal.
      ↓
"Play it in ______"  → detects/asks platform
      ├─ Spotify    → authorise own account → private playlist created → opens
      ├─ Apple Music → MusicKit → library playlist → opens
      └─ anything else → per-track universal links (always works)
      ↓
Previews 30s inline while deciding
      ↓
"Make one back" → seeded with them as recipient        ← the loop
```

### 8.3 Failure journeys

| Situation | What the user experiences |
|---|---|
| Song not in any catalogue (J7) | Types title + artist manually; the row looks identical to a matched one. Never a dead end. |
| Provider rate-limited | Results arrive from the fallback provider; if both fail, a quiet line: "search is having a moment — type it in and keep going". |
| Offline mid-build (J8) | Everything keeps working from local state. Sharing shows "will send when you're back". |
| Recipient has no streaming service | Tracklist + universal links still render; the artefact is intact. |
| Sender abandons at step 2 | State persists locally; returning restores the tape exactly. |

---

## 9. Functional requirements

Priority: **P0** ship-blocking · **P1** fast-follow · **P2** later.

### Epic A — Create the album *(built)*

| UC | Case | Frontend | Backend | Priority |
|---|---|---|---|---|
| A1 | Write title/for/from on the label | inline inputs on the cassette; live cover update | none — local | P0 ✅ |
| A2 | Pick an era | polaroid fan, live thumbnails, scribble-ring selection | none | P0 ✅ |
| A3 | Persist across reload | localStorage, restore silently | none | P0 ✅ |

### Epic B — Add songs *(the gap)*

| UC | Case | Frontend | Backend | Priority |
|---|---|---|---|---|
| B1 | Search a song | debounce 300ms; results with artwork, artist, album; keyboard navigable | `/api/search` → Deezer, fall through to iTunes; cache ≥24h | **P0** |
| B2 | Add from results | one tap; row shows artwork; optimistic | persist to tape | **P0** |
| B3 | Add manually (J7) | "add it yourself" always visible, not hidden behind zero-results | accept `provider: manual` | **P0** |
| B4 | Preview 30s | tap row to sample; one at a time; **provider badge + store link adjacent** | none — provider CDN direct | P1 |
| B5 | Reorder / remove | ↑↓✕; side A/B recomputes | persist | P0 ✅ |
| B6 | Tape-time budget | real durations when known, else 3:30; warn at >45:00/side | none | P1 |
| B7 | Provider failure | fallback provider, then manual; inline non-blocking notice | 429/5xx → cached or next provider | **P0** |
| B8 | 12-song cap | friendly stop: "a tape only holds 12 — make a volume two" | reject >12 | P0 ✅ |

### Epic C — Share

| UC | Case | Frontend | Backend | Priority |
|---|---|---|---|---|
| C1 | Download cover PNG | 1080×1080, our artwork only — **no third-party album art** | none | P0 ✅ |
| C2 | Native share sheet | `navigator.share` with file; graceful fallback | none | P0 ✅ |
| C3 | **Publish to a link** | "get a link" → unguessable URL, copy button | create tape record; ≥128-bit id; `noindex` | **P0** |
| C4 | Tape page for recipient | cover + note + tracklist; no signup; OG/Twitter card | render meta tags server-side | **P0** |
| C5 | Open in Spotify | recipient OAuth → private playlist | create playlist + add tracks; token never stored | **P1** |
| C6 | Universal per-track links | link per row | Odesli resolve, cache ≥7d, lazy | **P1** |
| C7 | Open in Apple Music | MusicKit JS | developer token | P2 |
| C8 | "Make one back" | CTA on tape page, prefilled | none | P1 |

### Epic D — Keep *(P1)*

| UC | Case | Notes |
|---|---|---|
| D1 | Claim a tape | email magic link, **after** the tape exists — never before |
| D2 | My tapes | list, re-share, duplicate |
| D3 | Edit after publish | same link updates; recipient sees latest |

### Epic E — Agent entry point *(P2)*

| UC | Case | Notes |
|---|---|---|
| E1 | `mixtape-mcp` server | `search_tracks`, `create_tape`, `add_track`, `render_cover`, `get_share_link` — see `docs/MUSIC.md` |

### Config & flags

`ff.search_providers` (deezer/itunes/both/off · off ⇒ manual-only, always safe) ·
`ff.previews` · `ff.share_links` · `ff.spotify_export` · `ff.accounts` ·
`ff.cc_mode`. Every third-party integration must be independently killable
without breaking tape creation.

---

## 10. Non-functional requirements

| Area | Target |
|---|---|
| First meaningful paint | <1.5s on 4G mid-tier Android |
| Search P95 (cached) | <200ms; uncached <900ms |
| Cover render | <400ms at 1080×1080 |
| Bundle | ≤250KB JS+CSS excl. fonts; fonts self-hosted, ~220KB, `font-display: swap` |
| Availability | 99.5% for tape pages (the recipient path is the one that must never be down) |
| Offline | Full create/edit/render offline; publish queues |
| Accessibility | WCAG 2.1 AA; full keyboard path; `prefers-reduced-motion`; screen-reader-labelled canvas |
| Browsers | Last 2 versions of Safari/Chrome/Firefox incl. iOS Safari |
| Privacy | No analytics on tape *contents*; no third-party trackers on tape pages |
| Rights | See `build-loop/references/rights-checklist.md` — blocking |

---

## 11. External dependencies

| Provider | Purpose | Auth | Limit ⚠ | If it dies |
|---|---|---|---|---|
| Deezer public API | primary search + preview | none | ~50/5s | → iTunes |
| iTunes Search API | fallback search + preview | none | ~20/min | → manual |
| Odesli | universal links | key (free tier) | ~10/min | cached / search deep-link |
| Spotify Web API | playlist export only | recipient OAuth | standard | → universal links |
| Apple MusicKit | playlist export | $99/yr dev token | standard | → universal links |

**None is a hard dependency for creating, rendering, or sharing a tape.**

---

## 12. Edge cases

| # | Case | Category | Sev | Frontend | Backend |
|---|---|---|---|---|---|
| E1 | Search provider 429s | Network | High | fallback silently; inline note only if all fail | provider rotation; serve stale cache |
| E2 | Offline mid-build | Network | High | keep working from local state; queue publish | n/a |
| E3 | Publish request times out | Network | High | idempotency key on retry — never a duplicate tape | dedupe on key |
| E4 | Double-tap "get a link" | Behaviour | Med | disable during flight | idempotent create |
| E5 | Song has no artwork/preview | Data | Med | typographic fallback row; no broken image | null-safe |
| E6 | Duplicate song added | Behaviour | Low | allow, but note "already on side A" — repetition can be deliberate | none |
| E7 | 34-char title + 12 long artist names | Data | High | ellipsize everywhere; cover must not overflow — **verified by render** | none |
| E8 | Recipient denies Spotify OAuth | Behaviour | Med | fall back to universal links, no dead end | none |
| E9 | Recipient opens on 5-year-old Android | Platform | Med | no `backdrop-filter` → solid dock; canvas fallback to static | none |
| E10 | Tape link shared publicly / goes viral | Privacy | High | `noindex`; sender can revoke | rate-limit; revocation |
| E11 | localStorage full or disabled | Platform | Med | in-memory + warn that it won't survive reload | n/a |
| E12 | Provider returns the wrong song (live/cover version) | Data | Med | title and artist stay **editable after adding** | store edited values |
| E13 | Clock skew / date on cover | Data | Low | render from local date, no assertion | n/a |
| E14 | `navigator.share` unsupported (desktop) | Platform | Low | copy-link + download, no error message | n/a |

---

## 13. Success metrics

| Type | Metric | Baseline | Target | When |
|---|---|---|---|---|
| **North star** | Tapes *shared* per week | 0 | growth WoW; ≥25% of finished tapes shared | Q+1 |
| Primary | Completion — start → finished tape | 0 | ≥40% | Q+1 |
| Primary | Recipient → creator within 7d | 0 | ≥15% | Q+1 |
| Secondary | Median time to finish | — | <5 min | Q+1 |
| Secondary | Songs per tape | — | ≥6 median | Q+1 |
| Secondary | Tape-page → playback tap | — | ≥50% | Q+2 |
| Guardrail | Manual-entry rate | — | <30% (higher ⇒ search is failing) | ongoing |
| Guardrail | Search error rate | — | <2% | ongoing |
| Guardrail | Provider quota incidents | 0 | 0 | ongoing |

Measured with privacy-preserving, content-blind events: counts and timings only,
never song titles, names, or notes.

---

## 14. Rollout

| Phase | Scope | Gate to next |
|---|---|---|
| 0 — now | Steps 1–3 local, PNG export | ✅ shipped |
| 1 | B1–B3, B7 search + manual entry | search error <2%, manual-entry <30% |
| 2 | C3–C4 share links + tape page | ≥25% of finished tapes shared |
| 3 | B4 previews, C5–C6 Spotify + universal links | ≥50% tape-page → playback |
| 4 | D accounts, C8 "make one back" | ≥15% recipient→creator |
| 5 | E1 MCP, CC mode | evidence-led |

Every phase behind its flag; kill switch = flag off, degrading to the previous
phase's behaviour rather than to an error.

---

## 15. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **The core premise is wrong — people don't want this** | Medium | Critical | Phase 2 share-rate is the real test. **Do not build phases 3–5 until it clears 25%.** Cheapest validation: post 5 covers publicly and measure interest before writing more code. |
| Deezer closes its public API | Medium | High | Two-provider fallback + manual entry already designed; manual path means degradation, not death |
| Apple preview terms tighten | Medium | Low | Previews are a detachable layer |
| Nobody shares because the PNG is enough | Medium | Medium | That's still a win for reach; instrument both paths separately before optimising |
| Spotify export breaks | Low | Medium | Universal links are the floor |
| Aesthetic reads as a template once many tapes exist | Medium | Medium | Five eras at launch; the handwriting genuinely differs per tape; add eras on evidence |
| Abuse — harassment via tape links | Low | High | Revocation, rate limits, report path, `noindex` |
| Scope creep toward "playlist manager" | High | High | Anti-personas in §6 are the argument; the 12-song cap is a feature |

---

## 16. Open questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| Q1 | Is the premise validated enough to build phases 3–5, or should we ship phase 2 and *stop* to measure? | Himanshu | before phase 3 |
| Q2 | Do tape links expire? Permanent hosting is a permanent cost. | Himanshu | phase 2 |
| Q3 | Is anonymous publishing acceptable, or does abuse risk force accounts earlier? | Himanshu | phase 2 |
| Q4 | Buy the Apple Developer membership ($99/yr) for Apple Music export? | Himanshu | phase 3 |
| Q5 | Hosting target — static + edge functions, or a full backend? Affects §10. | Himanshu | phase 1 |
| Q6 | Monetisation, if any? (Printed tapes? Paid eras?) It changes CC licence compatibility. | Himanshu | before phase 5 |

---

## 17. Devil's advocate

**Top three assumptions**

1. *People want to give music as an artefact.* Weakly evidenced. The mixtape's
   cultural persistence is suggestive, not proof. **If wrong, nothing else
   matters** — hence the phase-2 stop-gate.
2. *The cover is good enough to share unprompted.* Testable immediately and
   cheaply, outside the product, by posting covers.
3. *Delegated playback is acceptable.* Risk: the tape feels incomplete because
   you can't press play. Mitigated by CC mode and by making one-tap export
   genuinely one tap.

**Pre-mortem — how this fails**

The most likely failure is not technical. It ships, looks lovely, gets a burst of
design-community attention, and then flatlines because making a tape is a
*once-a-year* act. There's no reason to return. Retention was never the goal, but
without the recipient→creator loop there's no growth either — which is exactly
why that metric is primary, not secondary.

The second most likely failure: search quality. If people can't find their song
in two keystrokes, the emotional flow breaks at the exact moment it matters. The
manual-entry guardrail (<30%) is the early warning.

**What changed as a result**

- Added the phase-2 **stop-gate** — the plan now explicitly refuses to build
  phases 3–5 on an unvalidated premise.
- Promoted recipient→creator to a **primary** metric.
- Made manual entry **P0 and canonical**, not a fallback.
- Added the manual-entry-rate guardrail as a search-quality proxy.

**Accepted risks**

Permanent link hosting cost (Q2) and anonymous abuse exposure (Q3) are accepted
for phase 2 at expected volume, revisited before any growth push.
