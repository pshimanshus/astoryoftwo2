/* ============================================================
   MIXTAPE — the player
   Wraps YouTube's IFrame API and mounts it inside the cassette
   window, playing Art Tracks in tape order.

   Three constraints come from YouTube's developer policies, not
   from taste, and are load-bearing:

     · viewport >= 200x200 (16:9 recommended >= 480x270)
     · controls fully visible, player not obscured
     · do not override the platform's rendering, strip branding,
       or block ads

   The tempting "hide the video, wrap it in our own skin" build is
   the violation, and since YouTube would be the whole playback
   layer, losing API access would end the product. So the player is
   visible — which is fine, because an Art Track renders as static
   album art, exactly what a tape window should show.

   If the API can't load at all, the page stays fully usable: the
   reels keep turning and every track offers an outbound link.
   ============================================================ */

(() => {
  "use strict";

  const MIN_W = 480;   // 16:9 recommendation; hard floor is 200x200
  const MIN_H = 270;

  let api = null;          // the YT.Player instance
  let apiReady = null;     // Promise<boolean>
  let entries = [];
  let index = 0;
  let listeners = [];

  /* ---------- loading the API ---------- */

  function loadApi() {
    if (apiReady) return apiReady;
    apiReady = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(true);

      const timer = setTimeout(() => resolve(false), 6000); // blocked or offline
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        resolve(true);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      document.head.appendChild(s);
    });
    return apiReady;
  }

  /* ---------- helpers ---------- */

  const playable = (e) => e && e.resolved && e.resolved.youtubeVideoId;

  /** Where to send someone when we couldn't resolve a track. */
  function searchUrl(entry) {
    const q = encodeURIComponent(`${entry.artist || ""} ${entry.title}`.trim());
    return `https://music.youtube.com/search?q=${q}`;
  }

  function emit(i) {
    listeners.forEach((fn) => {
      try { fn(i, entries[i]); } catch (_) {}
    });
  }

  /* ---------- public API ---------- */

  /**
   * Mount into a container. Returns { ok } — ok:false means YouTube
   * is unavailable and the caller should keep the reels and show links.
   */
  async function mount(container, tracks) {
    entries = Array.isArray(tracks) ? tracks : [];
    const ids = entries.filter(playable).map((e) => e.resolved.youtubeVideoId);

    if (!ids.length) return { ok: false, reason: "nothing-resolved" };

    const ready = await loadApi();
    if (!ready) return { ok: false, reason: "api-unavailable" };

    const host = document.createElement("div");
    host.id = "yt-mount";
    host.style.width = "100%";
    host.style.height = "100%";
    container.textContent = "";
    container.appendChild(host);

    api = new window.YT.Player(host, {
      width: Math.max(MIN_W, container.clientWidth || MIN_W),
      height: Math.max(MIN_H, container.clientHeight || MIN_H),
      playerVars: {
        playsinline: 1,
        rel: 0,
        // no autoplay: driving playback programmatically can force preview
        // mode, and native controls are the compliant path anyway
      },
      events: {
        onReady: () => {
          api.cuePlaylist(ids);
          emit(0);
        },
        onStateChange: (e) => {
          if (!api || typeof api.getPlaylistIndex !== "function") return;
          const i = api.getPlaylistIndex();
          if (i !== index && i >= 0) {
            index = i;
            emit(i);
          }
        },
      },
    });

    return { ok: true };
  }

  function onIndexChange(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter((f) => f !== fn); };
  }

  function play() { if (api && api.playVideo) api.playVideo(); }
  function pause() { if (api && api.pauseVideo) api.pauseVideo(); }

  function destroy() {
    if (api && api.destroy) api.destroy();
    api = null;
    listeners = [];
    index = 0;
  }

  window.Player = {
    mount, onIndexChange, play, pause, destroy,
    searchUrl, playable,
    MIN_W, MIN_H,
  };
})();
