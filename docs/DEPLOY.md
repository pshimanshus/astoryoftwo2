# Deploying

The app is static. The two edge functions are optional — the app works
without them, just with a smaller search and no in-page playback.

Ship in two stages so the risky part is separable from the useful part.

---

## Stage 1 — static only (10 minutes, no keys, no accounts)

This is enough to test the thing that's actually in question: whether people
share tapes at all. `docs/PRD.md` §16 puts the stop-gate at a **25% share
rate**, and measuring it needs a URL, not a player.

```bash
npx wrangler pages deploy . --project-name mixtape
```

Both feature flags stay `false`. Share links work — they're self-contained
URL fragments, no backend involved. Every track falls back to a "listen"
link that opens a YouTube Music search. Nothing plays inline.

---

## Stage 2 — the edge functions

### 2a. Create the two KV namespaces

```bash
npx wrangler kv namespace create RESOLVE_CACHE
npx wrangler kv namespace create SEARCH_CACHE
```

Paste the two ids into `wrangler.toml`.

**Do not skip this.** Without a KV binding the handlers fall back to an
in-process `Map`, which on Pages means per-isolate and effectively per-request.
That is the exact failure `CLAUDE.md` warns about: it passes testing and dies
in week one, because YouTube search allows ~100 lookups per day across all
users and an uncached deploy burns them by lunchtime.

### 2b. Add the YouTube key (optional)

```bash
npx wrangler pages secret put YOUTUBE_API_KEY
```

Optional on purpose. Odesli resolves most songs at zero YouTube quota; the
key only covers the tail. With no key, that tail stays unresolved and those
rows keep their fallback link.

### 2c. Deploy and flip the flags

```bash
npx wrangler pages deploy .
```

Then in `index.html` and `tape.html`:

```js
window.MIXTAPE_FLAGS = { remoteSearch: true, remoteResolve: true, remoteBase: "/api" };
```

Flip them one at a time. `remoteSearch` is low-risk. `remoteResolve` is the
one that spends quota.

---

## Rollback

Set either flag back to `false` and redeploy. The client stops calling that
endpoint entirely — catalogue search and fallback links resume immediately.
No data migration, nothing to undo, because neither endpoint owns any state
a tape depends on. The cache is a cache.

---

## What is verified, and what is not

`npm run verify:api` covers ordering, quota budget, cache behaviour, the
failure paths and the rights boundary — 20 checks, all with injected fetch.

It does **not** prove the live calls work. This sandbox's egress proxy 403s
`api.deezer.com`, `itunes.apple.com`, `api.song.link` and `googleapis.com`, so
no request has ever reached a real provider. The response *shapes* are taken
from the providers' documented formats and matched against the client mappers
that were already tested, but the first real deploy is the first real test.

Worth doing by hand on the first deploy:

```bash
curl "$HOST/api/search?q=fade%20into%20you"
curl -X POST "$HOST/api/resolve" -H 'content-type: application/json' \
     -d '{"track":{"title":"Fade Into You","artist":"Mazzy Star","isrc":"USEE19300012"}}'
```

The first should return a `deezer` or `itunes` source. The second should
return `linksByPlatform` with a YouTube URL — and the same call a second time
should be visibly faster.
