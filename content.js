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

  // Inspect current player state
  function getPlayerState() {
    // 1. Accurately detect playback state strictly from footer playback bar
    let isPlaying = false;

    // Direct check: In Spotify Web, pause button exists in footer ONLY when actively playing
    const footerPauseBtn = document.querySelector(
      'footer [data-testid="control-button-pause"], [data-testid="player-controls"] [data-testid="control-button-pause"], [data-testid="control-button-pause"], footer button[aria-label*="Pause" i], footer button[aria-label*="暂停"]'
    );
    // Play button exists in footer ONLY when paused
    const footerPlayBtn = document.querySelector(
      'footer [data-testid="control-button-play"], [data-testid="player-controls"] [data-testid="control-button-play"], [data-testid="control-button-play"], footer button[aria-label*="Play" i], footer button[aria-label*="播放"]'
    );

    if (footerPauseBtn) {
      isPlaying = true;
    } else if (footerPlayBtn) {
      isPlaying = false;
    } else {
      // Fallback: check primary button in footer
      const primaryBtn = document.querySelector(
        'footer [data-testid="player-controls"] button[data-encore-id="buttonPrimary"], footer button[data-encore-id="buttonPrimary"], footer [data-testid="control-button-playpause"]'
      );
      if (primaryBtn) {
        const label = (primaryBtn.getAttribute("aria-label") || "").toLowerCase();
        if (label.includes("pause") || label.includes("暂停")) {
          isPlaying = true;
        } else if (label.includes("play") || label.includes("播放")) {
          isPlaying = false;
        } else {
          const hasPauseBars = !!primaryBtn.querySelector('path[d*="M5.7"], path[d*="M6"], rect');
          if (hasPauseBars) {
            isPlaying = true;
          }
        }
      } else {
        const audio = document.querySelector("audio");
        if (audio && !audio.paused && audio.currentTime > 0) {
          isPlaying = true;
        }
      }
    }

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

    const currentTimeStr = posEl ? posEl.innerText.trim() : "0:00";
    const durationStr = durEl ? durEl.innerText.trim() : "0:00";

    const curSec = parseTimeSeconds(currentTimeStr);
    const durSec = parseTimeSeconds(durationStr);
    const progressPercent = durSec > 0 ? Math.min(100, (curSec / durSec) * 100) : 0;

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
        const btn = findEl([
          'footer [data-testid="control-button-pause"]',
          'footer [data-testid="control-button-play"]',
          '[data-testid="player-controls"] [data-testid="control-button-pause"]',
          '[data-testid="player-controls"] [data-testid="control-button-play"]',
          'footer button[data-encore-id="buttonPrimary"]',
          '[data-testid="player-controls"] button:nth-child(3)',
          'footer [data-testid="control-button-playpause"]',
          'button[data-testid="control-button-playpause"]',
        ]);
        if (btn) {
          btn.click();
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
          'button[aria-label*="Next" i]',
          'button[aria-label*="下一首"]',
          'footer [data-testid="control-button-skip-forward"]',
        ]);
        if (btn) btn.click();
        break;
      }
      case "PREV_TRACK": {
        const btn = findEl([
          'button[data-testid="control-button-skip-back"]',
          'button[aria-label*="Previous" i]',
          'button[aria-label*="上一首"]',
          'footer [data-testid="control-button-skip-back"]',
        ]);
        if (btn) btn.click();
        break;
      }
      case "TOGGLE_SHUFFLE": {
        const btn = findEl([
          'button[data-testid="control-button-shuffle"]',
          'button[aria-label*="Shuffle" i]',
          'button[aria-label*="随机播放"]',
          'footer [data-testid="control-button-shuffle"]',
        ]);
        if (btn) btn.click();
        break;
      }
      case "TOGGLE_REPEAT": {
        const btn = findEl([
          'button[data-testid="control-button-repeat"]',
          'button[aria-label*="Repeat" i]',
          'button[aria-label*="循环播放"]',
          'footer [data-testid="control-button-repeat"]',
        ]);
        if (btn) btn.click();
        break;
      }
      case "TOGGLE_LIKE": {
        const btn = findEl([
          'button[data-testid="add-button"]',
          'button[aria-label*="Save to Your Library" i]',
          'button[aria-label*="添加到已喜欢的歌曲"]',
          'button[aria-label*="从已喜欢的歌曲中移除"]',
        ]);
        if (btn) btn.click();
        break;
      }
      case "TOGGLE_MUTE": {
        const btn = findEl([
          'button[data-testid="volume-bar-toggle-mute-button"]',
          'button[aria-label*="Mute" i]',
          'button[aria-label*="Unmute" i]',
          'button[aria-label*="静音"]',
          'button[aria-label*="取消静音"]',
          '[data-testid="volume-bar"] button',
          'footer [data-testid="volume-bar-toggle-mute-button"]',
          '.volume-bar button',
        ]);
        if (btn) {
          btn.click();
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

    // Wait a brief tick (120ms) for Spotify React DOM state to update
    await new Promise((r) => setTimeout(r, 120));
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
