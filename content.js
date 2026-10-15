// Spotify Web Controller - Content Script (open.spotify.com)

(() => {
  if (window.__SPOTIFY_CONTROLLER_INJECTED__) {
    return;
  }
  window.__SPOTIFY_CONTROLLER_INJECTED__ = true;

  console.log("[Spotify Controller] Content script loaded.");

  // Helper: Find element using multiple possible selectors
  function findEl(selectors) {
    if (!Array.isArray(selectors)) selectors = [selectors];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (e) {}
    }
    return null;
  }

  // Parse time string "MM:SS" or "HH:MM:SS" into seconds
  function parseTimeSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(":").map((p) => parseInt(p, 10));
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  // Check if current track is an advertisement
  function checkIsAd() {
    const titleEl = findEl([
      '[data-testid="context-item-info-title"]',
      '[data-testid="now-playing-widget"] [data-testid="context-item-info-title"]',
    ]);
    const title = titleEl ? (titleEl.innerText || "").trim().toLowerCase() : "";
    if (title === "advertisement" || title === "广告" || title === "spotify") {
      return true;
    }
    if (document.querySelector('[data-testid="track-info-advertiser"]')) {
      return true;
    }
    return false;
  }

  // Synthetic click helper that triggers pointer, mouse and click events for React
  function clickElement(el) {
    if (!el) return;
    try {
      el.focus();
      const mouseEventInit = { bubbles: true, cancelable: true, view: window };
      el.dispatchEvent(new PointerEvent("pointerdown", mouseEventInit));
      el.dispatchEvent(new MouseEvent("mousedown", mouseEventInit));
      el.dispatchEvent(new PointerEvent("pointerup", mouseEventInit));
      el.dispatchEvent(new MouseEvent("mouseup", mouseEventInit));
      el.click();
    } catch (e) {
      el.click();
    }
  }

  // Regex helpers strictly matching Play and Pause labels across languages
  // (supports shortcuts like "(空格)", "(Space)", but NEVER matches "播放队列" or "正在播放视图" or "随机播放")
  function isPlayLabel(lbl) {
    if (!lbl) return false;
    lbl = lbl.trim().toLowerCase();
    return /^(play|播放|再生|재생|lecture|lire|wiedergabe|reproducir)(\s*[\(\[（].*)?$/i.test(lbl);
  }

  function isPauseLabel(lbl) {
    if (!lbl) return false;
    lbl = lbl.trim().toLowerCase();
    return /^(pause|暂停|暫停|一時停止|일시정지|pausa)(\s*[\(\[（].*)?$/i.test(lbl);
  }

  // Helper to inspect SVG inside button for Pause bars or Play triangle
  function inspectSvgPlayPause(button) {
    if (!button) return null;
    const svg = button.querySelector("svg");
    if (!svg) return null;

    const svgAria = svg.getAttribute("aria-label");
    if (isPauseLabel(svgAria)) return "pause";
    if (isPlayLabel(svgAria)) return "play";

    if (svg.querySelectorAll("rect").length >= 2) return "pause";
    if (svg.querySelector("polygon")) return "play";

    const path = svg.querySelector("path");
    if (path) {
      const d = path.getAttribute("d") || "";
      // Pause icon paths in Spotify Web (two vertical bars)
      if (
        d.includes("M5.7") ||
        d.includes("M6") ||
        d.includes("v16.6") ||
        d.includes("19h4") ||
        d.includes("14h4") ||
        d.includes("H5.7")
      ) {
        return "pause";
      }
      // Play icon paths in Spotify Web (right-pointing triangle)
      if (
        d.includes("7.05") ||
        d.includes("3.606") ||
        d.includes("20.394") ||
        d.includes("13.49") ||
        d.includes("19.788")
      ) {
        return "play";
      }
    }

    return null;
  }

  // Dedicated helper to locate the true center Play/Pause button strictly in playback controls
  function getPlayPauseButton() {
    // 1. Direct data-testid check inside player-controls or footer
    const directPause = document.querySelector(
      'footer [data-testid="control-button-pause"], [data-testid="player-controls"] [data-testid="control-button-pause"], [data-testid="now-playing-bar"] [data-testid="control-button-pause"]'
    );
    if (directPause) return directPause;

    const directPlay = document.querySelector(
      'footer [data-testid="control-button-play"], [data-testid="player-controls"] [data-testid="control-button-play"], [data-testid="now-playing-bar"] [data-testid="control-button-play"]'
    );
    if (directPlay) return directPlay;

    // 2. Primary button in footer (In Spotify Encore design, Play/Pause is the ONLY buttonPrimary in footer)
    const primaryBtn = document.querySelector(
      'footer button[data-encore-id="buttonPrimary"], [data-testid="player-controls"] button[data-encore-id="buttonPrimary"], [data-testid="now-playing-bar"] button[data-encore-id="buttonPrimary"]'
    );
    if (primaryBtn) return primaryBtn;

    // 3. Button with exact Play/Pause aria-label strictly within player-controls or footer
    const ctrlButtons = document.querySelectorAll(
      '[data-testid="player-controls"] button, footer .player-controls button, footer button, [data-testid="now-playing-bar"] button'
    );
    for (const b of ctrlButtons) {
      const lbl = b.getAttribute("aria-label");
      if (isPauseLabel(lbl) || isPlayLabel(lbl)) {
        return b;
      }
    }

    // 4. Center button in player-controls (Index 2 in 5 buttons: Shuffle, Prev, [Play/Pause], Next, Repeat)
    const rowButtons = document.querySelectorAll(
      '[data-testid="player-controls"] button, footer .player-controls button'
    );
    if (rowButtons.length >= 3 && rowButtons.length <= 7) {
      return rowButtons[Math.floor(rowButtons.length / 2)];
    }

    return null;
  }

  // Tracking position changes to reliably detect if playback is advancing
  let lastPosSec = -1;
  let lastPosTime = 0;
  let isPositionAdvancing = false;

  function updatePositionAdvance(curSec) {
    const now = Date.now();
    if (lastPosSec >= 0 && now - lastPosTime >= 800) {
      isPositionAdvancing = curSec > lastPosSec;
    }
    lastPosSec = curSec;
    lastPosTime = now;
  }

  function detectIsPlaying() {
    // 1. Check exact data-testid in footer / player-controls
    const pauseBtn = document.querySelector(
      'footer [data-testid="control-button-pause"], [data-testid="player-controls"] [data-testid="control-button-pause"], [data-testid="now-playing-bar"] [data-testid="control-button-pause"]'
    );
    if (pauseBtn) return true;

    const playBtn = document.querySelector(
      'footer [data-testid="control-button-play"], [data-testid="player-controls"] [data-testid="control-button-play"], [data-testid="now-playing-bar"] [data-testid="control-button-play"]'
    );
    if (playBtn) return false;

    // 2. Inspect the Play/Pause button in footer
    const btn = getPlayPauseButton();
    if (btn) {
      const lbl = btn.getAttribute("aria-label");
      if (isPauseLabel(lbl)) return true; // Label is "Pause" -> actively playing
      if (isPlayLabel(lbl)) return false; // Label is "Play" -> paused

      const svgType = inspectSvgPlayPause(btn);
      if (svgType === "pause") return true; // Pause icon visible -> actively playing
      if (svgType === "play") return false; // Play icon visible -> paused
    }

    // 3. Native HTML5 Audio element check (Spotify streams through <audio>)
    const audios = document.querySelectorAll("audio");
    for (const a of audios) {
      if (!a.paused && a.currentTime > 0 && !a.ended) {
        return true;
      }
    }

    // 4. Native MediaSession API check
    if (navigator.mediaSession && navigator.mediaSession.playbackState) {
      if (navigator.mediaSession.playbackState === "playing") return true;
      if (navigator.mediaSession.playbackState === "paused") return false;
    }

    // 5. Playback position advancing check
    if (isPositionAdvancing) return true;

    return false;
  }

  // Inspect current player state
  function getPlayerState() {

    // Title & Artist
    const titleEl = findEl([
      '[data-testid="context-item-info-title"]',
      '[data-testid="now-playing-widget"] [data-testid="context-item-info-title"]',
      '.ellipsis-one-line[data-testid="context-item-info-title"]',
    ]);
    const title = titleEl ? titleEl.innerText.trim() : "未在播放";

    const artistEl = findEl([
      '[data-testid="context-item-info-artist"]',
      '[data-testid="context-item-info-subtitles"]',
      '[data-testid="now-playing-widget"] [data-testid="context-item-info-subtitles"]',
    ]);
    const artist = artistEl ? artistEl.innerText.trim() : "";

    // Cover Image
    const coverImg = findEl([
      'img[data-testid="cover-art-image"]',
      '[data-testid="now-playing-widget"] img',
      '.cover-art img',
    ]);
    const coverUrl = coverImg ? coverImg.src : "";

    // Progress
    const posEl = findEl([
      '[data-testid="playback-position"]',
      '.playback-bar__progress-time:first-child',
    ]);
    const durEl = findEl([
      '[data-testid="playback-duration"]',
      '.playback-bar__progress-time:last-child',
    ]);

    const curSec = parseTimeSeconds(currentTimeStr);
    const durSec = parseTimeSeconds(durationStr);
    const progressPercent = durSec > 0 ? Math.min(100, (curSec / durSec) * 100) : 0;
    updatePositionAdvance(curSec);

    // Accurately detect playback state
    const isPlaying = detectIsPlaying();

    // Shuffle & Repeat
    const shuffleBtn = findEl([
      'button[data-testid="control-button-shuffle"]',
      'button[aria-label*="Shuffle"]',
      'button[aria-label*="随机播放"]',
    ]);
    const isShuffle = shuffleBtn ? shuffleBtn.getAttribute("aria-checked") === "true" : false;

    const repeatBtn = findEl([
      'button[data-testid="control-button-repeat"]',
      'button[aria-label*="Repeat"]',
      'button[aria-label*="循环播放"]',
    ]);
    const repeatState = repeatBtn ? repeatBtn.getAttribute("aria-checked") : "false";

    // Like / Add
    const likeBtn = findEl([
      'button[data-testid="add-button"]',
      'button[aria-label*="Save to Your Library"]',
      'button[aria-label*="添加到已喜欢的歌曲"]',
      'button[aria-label*="从已喜欢的歌曲中移除"]',
    ]);
    const isLiked = likeBtn ? likeBtn.getAttribute("aria-checked") === "true" : false;

    // Volume
    const volumeSlider = findEl([
      'input[data-testid="volume-bar-slider"]',
      '[data-testid="volume-bar"] input[type="range"]',
    ]);
    let volume = 70;
    if (volumeSlider) {
      volume = Math.round(parseFloat(volumeSlider.value) * 100);
    } else {
      const audio = document.querySelector("audio");
      if (audio) volume = Math.round(audio.volume * 100);
    }

    // Determine Mute state accurately from volume bar & mute button
    let isMuted = false;
    const muteBtn = findEl([
      'footer [data-testid="volume-bar-toggle-mute-button"]',
      '[data-testid="volume-bar-toggle-mute-button"]',
      '[data-testid="volume-bar"] button',
      'footer .volume-bar button',
    ]);

    if (muteBtn) {
      // 1. Button aria-label check
      const btnLabel = (muteBtn.getAttribute("aria-label") || "").toLowerCase();
      if (
        btnLabel.includes("unmute") ||
        btnLabel.includes("取消静音") ||
        btnLabel.includes("恢复声音") ||
        btnLabel.includes("开启声音")
      ) {
        isMuted = true;
      }

      // 2. SVG inside button: aria-label and path
      const svg = muteBtn.querySelector("svg");
      if (svg) {
        const svgLabel = (svg.getAttribute("aria-label") || "").toLowerCase();
        if (
          svgLabel.includes("muted") ||
          svgLabel.includes("off") ||
          svgLabel.includes("已静音") ||
          svgLabel.includes("取消静音")
        ) {
          isMuted = true;
        }

        // Spotify's muted icon draws an 'X' (cross): path contains M13.86 or 1.5-1.5
        const path = svg.querySelector("path");
        const pathData = path ? path.getAttribute("d") || "" : "";
        if (pathData.includes("M13.86") || pathData.includes("1.5-1.5") || pathData.includes("1.5 1.5")) {
          isMuted = true;
        }
      }
    }

    // 3. Volume slider at 0
    if (volumeSlider) {
      const val = parseFloat(volumeSlider.value);
      if (val === 0 || volumeSlider.getAttribute("aria-valuenow") === "0") {
        isMuted = true;
      }
    }

    // 4. HTML audio element muted or volume 0
    const audio = document.querySelector("audio");
    if (audio && (audio.muted || audio.volume === 0)) {
      isMuted = true;
    }

    return {
      success: true,
      isPlaying,
      title,
      artist,
      coverUrl,
      currentTime: currentTimeStr,
      duration: durationStr,
      currentSeconds: curSec,
      durationSeconds: durSec,
      progressPercent,
      volume,
      isMuted,
      isShuffle,
      repeatState,
      isLiked,
      isAd: checkIsAd(),
    };
  }

  // Set Slider input value for React
  function setReactInputValue(input, val) {
    if (!input) return;
    try {
      const proto = Object.getPrototypeOf(input);
      const setVal = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setVal) {
        setVal.call(input, val);
      } else {
        input.value = val;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {
      console.warn("Failed to set React input value:", e);
    }
  }

  // Seek playback to target percentage (0-100)
  function seekToPercent(percent) {
    const progressBar = findEl([
      '[data-testid="playback-progressbar"]',
      '.playback-progressbar',
      '[data-testid="progress-bar"]',
    ]);

    if (!progressBar) return false;

    const rect = progressBar.getBoundingClientRect();
    const clampedPercent = Math.max(0, Math.min(100, percent));
    const targetX = rect.left + (rect.width * clampedPercent) / 100;
    const targetY = rect.top + rect.height / 2;

    const eventOptions = {
      bubbles: true,
      cancelable: true,
      clientX: targetX,
      clientY: targetY,
      view: window,
    };

    progressBar.dispatchEvent(new MouseEvent("mousedown", eventOptions));
    progressBar.dispatchEvent(new MouseEvent("mouseup", eventOptions));
    progressBar.dispatchEvent(new MouseEvent("click", eventOptions));
    return true;
  }

  // Set volume percentage (0-100)
  function setVolumePercent(vol) {
    const volumeSlider = findEl([
      'input[data-testid="volume-bar-slider"]',
      '[data-testid="volume-bar"] input[type="range"]',
    ]);

    const normalized = Math.max(0, Math.min(1, vol / 100));

    if (volumeSlider) {
      setReactInputValue(volumeSlider, normalized);
    }

    const audios = document.querySelectorAll("audio");
    audios.forEach((a) => {
      a.volume = normalized;
    });

    return true;
  }

  // Command handlers
  async function handleCommand(command, payload) {
    switch (command) {
      case "PLAY_PAUSE": {
        const btn = getPlayPauseButton();
        if (btn) {
          clickElement(btn);
        } else {
          const audio = document.querySelector("audio");
          if (audio) {
            if (audio.paused) audio.play();
            else audio.pause();
          }
        }
        break;
      }
      case "NEXT_TRACK": {
        const btn = findEl([
          'button[data-testid="control-button-skip-forward"]',
          'footer [data-testid="control-button-skip-forward"]',
          'button[aria-label*="Next" i]',
          'button[aria-label*="下一首"]',
        ]);
        if (btn) clickElement(btn);
        break;
      }
      case "PREV_TRACK": {
        const btn = findEl([
          'button[data-testid="control-button-skip-back"]',
          'footer [data-testid="control-button-skip-back"]',
          'button[aria-label*="Previous" i]',
          'button[aria-label*="上一首"]',
        ]);
        if (btn) clickElement(btn);
        break;
      }
      case "TOGGLE_SHUFFLE": {
        const btn = findEl([
          'button[data-testid="control-button-shuffle"]',
          'footer [data-testid="control-button-shuffle"]',
          'button[aria-label*="Shuffle" i]',
          'button[aria-label*="随机播放"]',
        ]);
        if (btn) clickElement(btn);
        break;
      }
      case "TOGGLE_REPEAT": {
        const btn = findEl([
          'button[data-testid="control-button-repeat"]',
          'footer [data-testid="control-button-repeat"]',
          'button[aria-label*="Repeat" i]',
          'button[aria-label*="循环播放"]',
        ]);
        if (btn) clickElement(btn);
        break;
      }
      case "TOGGLE_LIKE": {
        const btn = findEl([
          'button[data-testid="add-button"]',
          'footer [data-testid="add-button"]',
          'button[aria-label*="Save to Your Library" i]',
          'button[aria-label*="添加到已喜欢的歌曲"]',
          'button[aria-label*="从已喜欢的歌曲中移除"]',
        ]);
        if (btn) clickElement(btn);
        break;
      }
      case "TOGGLE_MUTE": {
        const btn = findEl([
          'button[data-testid="volume-bar-toggle-mute-button"]',
          'footer [data-testid="volume-bar-toggle-mute-button"]',
          'button[aria-label*="Mute" i]',
          'button[aria-label*="Unmute" i]',
          'button[aria-label*="静音"]',
          'button[aria-label*="取消静音"]',
          '[data-testid="volume-bar"] button',
          '.volume-bar button',
        ]);
        if (btn) {
          clickElement(btn);
        } else {
          const audios = document.querySelectorAll("audio");
          audios.forEach((a) => (a.muted = !a.muted));
        }
        break;
      }
      case "SEEK": {
        if (payload && typeof payload.percent === "number") {
          seekToPercent(payload.percent);
        }
        break;
      }
      case "SET_VOLUME": {
        if (payload && typeof payload.volume === "number") {
          setVolumePercent(payload.volume);
        }
        break;
      }
    }

    // Wait a brief tick (200ms) for Spotify React DOM state to update
    await new Promise((r) => setTimeout(r, 200));
    return getPlayerState();
  }

  // Runtime message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "PING") {
      sendResponse({ success: true });
      return;
    }

    if (request.action === "GET_PLAYER_STATE") {
      sendResponse(getPlayerState());
      return;
    }

    if (request.action === "COMMAND") {
      handleCommand(request.command, request.payload).then(sendResponse);
      return true; // asynchronous response
    }
  });

  // Watch for DOM mutations in the playback bar to reactively track changes
  let observer = null;
  function setupObserver() {
    const target = document.querySelector("footer") || document.body;
    if (!target) return;

    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      // Optional: Auto mute ads if enabled
      chrome.storage.local.get(["autoMuteAds", "isCurrentlyAdMuted"], (res) => {
        if (res.autoMuteAds) {
          const isAd = checkIsAd();
          const audios = document.querySelectorAll("audio");
          if (isAd && !res.isCurrentlyAdMuted) {
            audios.forEach((a) => (a.muted = true));
            chrome.storage.local.set({ isCurrentlyAdMuted: true });
          } else if (!isAd && res.isCurrentlyAdMuted) {
            audios.forEach((a) => (a.muted = false));
            chrome.storage.local.set({ isCurrentlyAdMuted: false });
          }
        }
      });
    });

    observer.observe(target, { childList: true, subtree: true, attributes: true });
  }

  setupObserver();
})();
