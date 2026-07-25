# Music strategy — how songs get found, heard, and played

*Researched July 2026. API terms change fast; re-verify anything marked ⚠ before
building against it.*

## The decision, up front

**The app never touches audio. It stores song *identity* and *links*.**

Everything below follows from that one architectural promise. It is what makes
an indie mixtape app legal, free to run, and independent of any single platform.

The instinct is to build "a mixtape you can press play on". That product requires
mechanical + performance licences, per-territory, negotiated with rights holders.
It is not available to an indie app at any realistic price. Every attempt to
shortcut it — hosting MP3s, proxying streams, embedding an unofficial player —
ends in takedowns and a permanent API ban.

So we split the problem into three layers that are usually conflated:

| Layer | What it means | Our answer |
|---|---|---|
| **Discovery** | finding and identifying the song | keyless metadata APIs |
| **Preview** | a 30s taste while building the tape | provider CDN clips, incidental |
| **Full playback** | actually listening to the tape | delegated to the listener's own platform |

The emotional product — *someone chose these twelve songs for me, and wrote on
the cover* — lives entirely in the first and third layers. It survives losing
previews entirely. That's the test of a sound architecture here.

---

## Layer 1 — Discovery

### Primary: Deezer public search

- No auth, no API key, no registration
- `GET api.deezer.com/search?q=` returns title, artist, album, duration, artwork
  and a 30s `preview` URL
- Rate limit ~50 requests / 5 seconds — comfortable for our scale
- Public endpoints are keyless by design; OAuth is only needed to reach a
  specific user's account, which we never do

This is the last major streaming catalogue with an open, keyless search endpoint.
It carries the feature.

### Secondary: iTunes Search API

- No key, `GET itunes.apple.com/search?term=&entity=song`
- ~20 requests/minute ⚠ (undocumented but consistently reported)
- Returns `previewUrl` (30s m4a) and `artworkUrl100`
- Excellent coverage of catalogue Deezer misses, and notably strong on regional
  catalogues our themes celebrate

**Binding constraint:** Apple's terms permit preview and artwork use *to promote
store content*, placed **proximate to a store badge** — explicitly not "for
entertainment purposes". So any Apple-sourced preview must render with an
adjacent "Listen on Apple Music" badge and link. This is a design requirement,
not a footnote; the rights verifier blocks on it.

### Enrichment (optional): MusicBrainz + Cover Art Archive

Open, CC0 metadata with stable identifiers (MBID, ISRC) for deduplicating "the
same song from two providers". Their terms require a descriptive `User-Agent`
with contact info and ~1 req/sec. Only worth adding once cross-provider dedupe
actually hurts.

### Always available: type it yourself

A plain text field for title + artist. No API, no network.

This is not a fallback — it is the **canonical input path**, and everything else
is an accelerant on top of it. Reasons:

1. The most meaningful songs on a love mixtape are often not on streaming: a
   voice note, a wedding song, a bootleg, a song in a language the APIs index
   badly.
2. It makes every provider optional. When Deezer 429s or Apple changes terms,
   the core job still works.
3. It is the offline story.

### What we deliberately do not use

| Service | Why not |
|---|---|
| **Spotify Web API** | `preview_url` deprecated for apps registered on/after 27 Nov 2024; Audio Features / Recommendations / Related Artists removed; extended access restricted since 15 May 2025 to apps that "drive platform strategy". Unreliable foundation for a small app. Still used *outbound* for playlist export (below) — that path is intact. |
| **YouTube Data API v3** | Search costs 100 quota units against a 10,000/day cap = ~100 searches per day, total, across all users. Unusable for discovery. Quota extensions require manual Google review. |
| **Scraping anything** | Instant ban, indefensible. |

---

## Layer 2 — Preview

30-second clips from Deezer's or Apple's CDN, played at the provider URL, never
cached or copied.

Design rules that keep this on the right side of "promotional use":

- Preview is a **sampling aid while building**, not a listening mode. Tap a track
  row to hear it while deciding; no queue, no autoplay-through, no player bar.
- One at a time, stops on navigate.
- The provider badge and store link sit next to the control.
- Recipients get previews too, but the tape's framing pushes them to "open the
  whole thing in your app" — full listening is always elsewhere.

If Apple's or Deezer's terms tighten, previews can be removed entirely without
touching the data model or the core journey. Build them as a detachable layer.

---

## Layer 3 — Full playback (the interesting part)

A tape is an ordered list of song identities. Turning that into *actual
listening* is a resolution problem, and the answer differs per recipient.

### Tier 1 — Universal links (always works, zero auth)

**Odesli / song.link**: given any music URL or an ISRC, returns the equivalent on
every major platform. Free; ~10 req/min ⚠, so results must be cached
server-side (≥7 days) and resolved lazily.

Every track on a shared tape gets a universal link. The recipient taps and lands
on *their* service — no account linking, no OAuth, nothing to install. This is
the floor, and it is a good floor.

### Tier 2 — One-tap playlist export (best experience)

"Open the whole tape in Spotify" — the recipient authorises with their own
account, we create a private playlist named after the tape, with the note in the
description.

- **Spotify**: `POST /v1/playlists` + `POST /v1/playlists/{id}/tracks`. Playlist
  endpoints were **not** part of the 2024 deprecations and remain available with
  user OAuth. This is the highest-value integration and the one to build first.
- **Apple Music**: MusicKit JS can create a library playlist. Requires an Apple
  Developer membership (~$99/yr) for the developer token, plus the recipient
  having an Apple Music subscription. Build second, gated on real demand.
- **YouTube Music**: no official playlist API. YouTube Data API `playlists.insert`
  is 50 units and search to resolve each track is 100 — the quota makes bulk
  export impossible. Ship a deep-linked search per track instead.

Tokens live in the recipient's browser session only. We never store them.

### Tier 3 — CC / open catalogue mode (a real differentiator)

An optional "royalty-free tape" where **full in-app playback is legal**, using
Jamendo (has a licensed streaming API) or Free Music Archive. Full tracks, a real
play button, an actual tape that plays in the browser.

Small catalogue, so it can't be the default. But it's the one mode where the
cassette metaphor completes, and it's genuinely useful for creators who want a
shareable tape with no platform gatekeeping. Worth building once the core ships.

---

## Where MCP fits

MCP is an agent transport, not a consumer app transport — it doesn't belong in
the browser flow. It does unlock a distinct, high-leverage entry point:

**`mixtape-mcp`** — a small server exposing `search_tracks`, `create_tape`,
`add_track`, `render_cover`, `get_share_link`. Someone in Claude says *"make my
wife a tape of songs about coming home, Bombay '92 cover"* and gets a finished,
shareable link. The hardest part of a mixtape is choosing the songs, and that is
exactly what a model is good at helping with.

This reuses the same core API, so it costs one adapter rather than a second
product. Sequence it after the web app ships — but design the core API so it is
callable by something that isn't our UI, which is good hygiene anyway.

---

## Failure modes and what happens

| Failure | Behaviour |
|---|---|
| Deezer 429 / down | fall through to iTunes, then to manual entry; a quiet inline note, never a blocking error |
| Both providers down | manual entry only; the tape still gets made and shared |
| Odesli down or rate-limited | serve cached links; unresolved tracks show a search deep-link instead |
| Spotify OAuth denied | fall back to Tier 1 universal links |
| Apple tightens preview terms | drop the preview layer; discovery and sharing unaffected |
| No network at all | app works fully offline from local state; sharing queues until online |

The through-line: **no third party is ever a hard dependency for making,
rendering, or sharing a tape.**

---

## What we store per track

```
id            our own uuid
title         string          (user-editable, always)
artist        string          (user-editable, always)
album         string?         (display only)
duration_ms   int?            (for the side-time budget; falls back to 3:30)
isrc          string?         (the good cross-platform key, when available)
provider      'deezer' | 'itunes' | 'manual'
provider_id   string?
artwork_url   string?         (hotlinked, never re-hosted, never baked into exports)
preview_url   string?         (provider CDN, fetched at play time, never cached)
links         { spotify?, apple?, youtube?, universal? }   (resolved lazily, cached)
```

Note what is absent: any audio, any re-hosted image, any recipient identity.
