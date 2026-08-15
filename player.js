/* ============================================================
   MIXTAPE — the player
   Plays the tape, in order, inside the cassette window.

   What plays is a YouTube Art Track: the official label-delivered
   audio for a recording, which renders as static album art. So a
   visible player in the tape window is both the compliant thing
   and the right-looking thing.

   Three rules that come from YouTube's developer policies, not
   from taste, and are load-bearing — YouTube is the entire
   playback layer, so losing API access ends the product:

     · viewport >= 200x200 (16:9 recommended >= 480x270)
     · controls visible, player not obscured
     · never override the platform's rendering, strip branding,
       or block ads

   Two decisions that look like details and are not:

     · We keep OUR OWN queue of resolved entries and call
       loadVideoById per advance. cuePlaylist would work until a
       tape contains an unresolved track, at which point YouTube's
       playlist index and ours drift apart and the wrong reason
       shows on screen.
     · The IFrame API (~90KB) loads on FIRST PLAY INTENT, not on
       page load. Audible autoplay needs a user gesture anyway, so
       loading it earlier buys nothing and costs first paint.
   ============================================================ */

(() => {
  "use strict";

  const API_SRC = "https://www.youtube.com/iframe_api";
  const API_TIMEOUT = 8000;   // blocked network, corporate proxy, adblock
  const START_TIMEOUT = 6000; // player created but never actually started

  // YT.PlayerState
  const ENDED = 0, PLAYING = 1, PAUSED = 2;

  let yt = null;              // the YT.Player instance
  let apiPromise = null;
  let queue = [];             // [{ entryIndex, videoId, entry }] — resolved only
  let qi = -1;                // OUR index. the source of truth.
  let entries = [];
  let cb = {};
  let started = false;
  let destroyed = false;

  /* ---------- loading the API ---------- */

  function loadApi() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(true);

      let settled = false;
      const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };

      const timer = setTimeout(() => done(false), API_TIMEOUT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") { try { prev(); } catch (_) {} }
        clearTimeout(timer);
        done(true);
      };

      const s = document.createElement("script");
      s.src = API_SRC;
      s.async = true;
      s.onerror = () => { clearTimeout(timer); done(false); };
      document.head.appendChild(s);
    });
    return apiPromise;
  }

  /* ---------- the queue ---------- */

  const videoIdOf = (e) =>
    (e && e.resolved && e.resolved.youtubeVideoId) || (e && e.ytVideoId) || null;

  function buildQueue(list) {
    queue = [];
    list.forEach((entry, entryIndex) => {
      const videoId = videoIdOf(entry);
      if (videoId && !entry.unavailable) queue.push({ entryIndex, videoId, entry });
    });
    return queue;
  }

  const at = (i) => (i >= 0 && i < queue.length ? queue[i] : null);

  function emitIndex() {
    const item = at(qi);
    if (item && typeof cb.onIndex === "function") {
      cb.onIndex(item.entryIndex, item.entry, qi);
    }
  }

  /* ---------- transport ---------- */

  function loadAt(i) {
    const item = at(i);
    if (!item) return false;
    qi = i;
    emitIndex();
    try {
      yt.loadVideoById(item.videoId);   // loadVideoById plays; cue would not
    } catch (_) {
      return false;
    }
    return true;
  }

  /** Advance past anything unplayable rather than stalling on it. */
  function advance(step = 1) {
    let i = qi + step;
    while (i >= 0 && i < queue.length) {
      if (loadAt(i)) return true;
      i += step;
    }
    if (step > 0 && typeof cb.onEnd === "function") cb.onEnd();
    return false;
  }

  function onStateChange(e) {
    if (destroyed) return;
    if (e.data === PLAYING) {
      started = true;
      if (typeof cb.onState === "function") cb.onState(true);
    } else if (e.data === PAUSED) {
      if (typeof cb.onState === "function") cb.onState(false);
    } else if (e.data === ENDED) {
      advance(1);
    }
  }

  /* Codes that mean "this one will never play here":
     2 bad id · 5 html5 error · 100 removed/private · 101/150 embedding denied */
  function onError(e) {
    const item = at(qi);
    if (item) {
      item.entry.unavailable = true;
      if (typeof cb.onUnavailable === "function") cb.onUnavailable(item.entry, e && e.data);
    }
    // one dead video must never stall a tape
    advance(1);
  }

  /* ---------- public API ---------- */

  /**
   * Prepare, without touching the network. Returns how many tracks
   * are actually playable so the UI can decide what to offer.
   */
  function init(mountEl, list, callbacks) {
    entries = Array.isArray(list) ? list : [];
    cb = callbacks || {};
    buildQueue(entries);
    qi = -1;
    started = false;
    destroyed = false;
    init.mount = mountEl;
    return { playable: queue.length, total: entries.length };
  }

  /**
   * First call is the user gesture: loads the API, creates the player
   * and starts track one. Later calls just resume.
   * Resolves { ok } — ok:false means the caller should fall back to
   * the tracklist and outbound links.
   */
  async function play() {
    if (!queue.length) return { ok: false, reason: "nothing-playable" };

    if (yt) {
      try { yt.playVideo(); } catch (_) {}
      return { ok: true };
    }

    const ready = await loadApi();
    if (!ready) {
      if (typeof cb.onBlocked === "function") cb.onBlocked("api-unavailable");
      return { ok: false, reason: "api-unavailable" };
    }

    const host = document.createElement("div");
    host.id = "yt-player";
    host.style.width = "100%";
    host.style.height = "100%";
    init.mount.appendChild(host);

    const first = queue[0];
    qi = 0;

    await new Promise((resolve) => {
      yt = new window.YT.Player(host, {
        width: "100%",
        height: "100%",
        videoId: first.videoId,
        playerVars: {
          autoplay: 1,        // created inside the gesture, so this is allowed
          playsinline: 1,     // iOS: stay in the page, don't take over the screen
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => { emitIndex(); resolve(); },
          onStateChange,
          onError,
        },
      });
      // a player that never becomes ready is a blocked embed
      setTimeout(resolve, API_TIMEOUT);
    });

    // if autoplay was refused, tell the UI so it can keep offering the button
    setTimeout(() => {
      if (!started && !destroyed && typeof cb.onNeedsGesture === "function") {
        cb.onNeedsGesture();
      }
    }, START_TIMEOUT);

    return { ok: true };
  }

  function pause() { try { yt && yt.pauseVideo(); } catch (_) {} }
  function next() { return advance(1); }
  function prev() { return advance(-1); }

  function isPlaying() {
    try { return !!yt && yt.getPlayerState() === PLAYING; } catch (_) { return false; }
  }

  /** Where to send someone when a track has no Art Track. */
  function searchUrl(entry) {
    const q = encodeURIComponent(`${entry.artist || ""} ${entry.title}`.trim());
    return `https://music.youtube.com/search?q=${q}`;
  }

  function destroy() {
    destroyed = true;
    try { yt && yt.destroy(); } catch (_) {}
    yt = null; queue = []; qi = -1; cb = {}; started = false;
  }

  window.Player = {
    init, play, pause, next, prev,
    isPlaying, searchUrl, destroy,
    get index() { return qi; },
    get queueLength() { return queue.length; },
    // exposed for the verifier
    _buildQueue: buildQueue,
  };
})();
