# Rights verifier checklist

The single most important verifier in this project. Music rights failures don't
show up as bugs — they show up as takedowns and API bans, months later.

**The architectural promise this checklist protects:**
> The app never hosts, stores, caches, transcodes, or serves audio. It stores
> song *identity* and *links*. Playback always happens on a licensed platform.

Hold that line and no mechanical or performance licence is required. Break it
anywhere and the whole product needs licensing it cannot afford.

## Hard fails — block the merge

- [ ] **No audio file is served from our origin.** No `.mp3`/`.m4a`/`.ogg` in
      the repo, in the build output, in a bucket we own, or proxied through our
      own endpoint in a way that re-serves bytes.
- [ ] **No preview is cached or persisted.** Preview URLs are fetched from the
      provider CDN at play time and never copied. Storing the URL is fine;
      storing the audio is not.
- [ ] **No album art is baked into a downloadable or shared image.** Our
      1080×1080 cover is 100% our own drawing. Third-party artwork may appear in
      transient UI only. *This is the easiest rule to break by accident — check
      the canvas render, not just the intent.*
- [ ] **No full-track playback in-app** for any commercial catalogue, including
      via an embedded player that is not the platform's own sanctioned embed.
- [ ] **No scraping.** Documented public APIs only. No undocumented endpoints,
      no HTML parsing of a streaming site.

## Attribution & provider terms

- [ ] **Apple / iTunes previews carry an Apple badge and store link, adjacent to
      the preview control.** Apple's terms permit previews only to promote store
      content, placed proximate to a store badge — not "for entertainment
      purposes". A bare play button on an Apple preview violates this.
- [ ] **Deezer previews link back to the Deezer track page.**
- [ ] **Provider attribution is visible** wherever search results are shown
      ("results from Deezer / Apple Music").
- [ ] **Artwork is hotlinked from the provider CDN**, not re-hosted, and carries
      its provider's link.
- [ ] **MusicBrainz data** carries its CC0 attribution where required; requests
      send a proper `User-Agent` with contact info (their terms require it).
- [ ] **CC-licensed tracks** (Jamendo/FMA mode) display licence type and artist
      credit exactly as the licence requires. `NC` licences are incompatible if
      the app ever monetises — check the specific licence, not the category.

## Rate limits & fair use

- [ ] Server-side cache in front of every provider (search results ≥24h,
      resolved links ≥7d) so we don't hammer a free API.
- [ ] Debounced client search — no request per keystroke.
- [ ] Documented limits respected: Deezer ~50 req/5s, iTunes ~20 req/min,
      Odesli ~10 req/min. Exceeding these is how free access gets revoked.
- [ ] Graceful degradation when a provider 429s or dies — the app must still let
      someone type a song by hand. **Never let a third party be a hard dependency
      for the core "make a tape" job.**

## Privacy

- [ ] A shared tape link exposes only what the sender chose to share.
- [ ] Unlisted links are unguessable (≥128 bits of entropy), `noindex`.
- [ ] Recipient OAuth tokens (Spotify/Apple) are used in the recipient's own
      browser session and never stored server-side.
- [ ] No analytics on the *contents* of a tape. What someone made for their
      partner is not our data.

## Reporting format

```
RIGHTS VERIFIER — PASS | FAIL

Audio boundary:      pass/fail  [evidence]
Artwork in export:   pass/fail  [evidence — name the render checked]
Attribution/badges:  pass/fail  [evidence]
Rate limits/caching: pass/fail  [evidence]
Privacy:             pass/fail  [evidence]

FINDINGS (blocking):
1. [file:line] — [what rule] — [how to reproduce] — [fix]
```

Evidence means a file path, a rendered image, or a network log — not an opinion.
