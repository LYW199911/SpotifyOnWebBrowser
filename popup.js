// Spotify Web Controller - Popup & Player Logic with i18n & Desktop Pop-out

// Internationalization Dictionaries
const I18N = {
  "zh-CN": {
    langBtn: "中 / EN",
    brandTitle: "Spotify 控制器",
    statusOnline: "已连接",
    statusOffline: "未连接",
    statusConnecting: "检测中",
    btnPopout: "桌面置顶/独立悬浮窗",
    btnFocus: "跳转至 Spotify 网页",
    emptyTitle: "未检测到 Spotify 网页",
    emptyDesc: "打开 Spotify Web 播放器即可在任意页面轻松遥控，无需 Premium 会员。",
    btnOpenSpotify: "打开 Spotify 网页版",
    notPlaying: "暂未播放",
    playToStart: "打开歌曲即可控制",
    adBadge: "广告中",
    btnLike: "添加到喜欢",
    btnShuffle: "随机播放",
    btnPrev: "上一首 (Alt+Shift+Left)",
    btnPlayPause: "播放 / 暂停 (Alt+Shift+P)",
    btnNext: "下一首 (Alt+Shift+Right)",
    btnRepeat: "循环播放",
    btnMute: "静音切换",
    toggleAutoMute: "广告静音",
    toggleFloatingWidget: "网页悬浮球",
    tipShortcuts: "快捷键: Alt+Shift+P 播放/暂停",
  },
  "en-US": {
    langBtn: "EN / 中",
    brandTitle: "Spotify Controller",
    statusOnline: "Connected",
    statusOffline: "Offline",
    statusConnecting: "Connecting...",
    btnPopout: "Desktop Always-On-Top Window",
    btnFocus: "Focus Spotify Tab",
    emptyTitle: "No Spotify Tab Found",
    emptyDesc: "Open Spotify Web Player to easily control playback anywhere, no Premium required.",
    btnOpenSpotify: "Open Spotify Web",
    notPlaying: "Not Playing",
    playToStart: "Play a song to control",
    adBadge: "Ad",
    btnLike: "Add to Favorites",
    btnShuffle: "Shuffle",
    btnPrev: "Previous (Alt+Shift+Left)",
    btnPlayPause: "Play / Pause (Alt+Shift+P)",
    btnNext: "Next (Alt+Shift+Right)",
    btnRepeat: "Repeat",
    btnMute: "Toggle Mute",
    toggleAutoMute: "Mute Ads",
    toggleFloatingWidget: "In-Page Floating",
    tipShortcuts: "Shortcut: Alt+Shift+P Play/Pause",
  },
};

let currentLang = "zh-CN";

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const btnLang = document.getElementById("btn-lang");
  const langText = document.getElementById("lang-text");
  const statusPill = document.getElementById("status-pill");
  const statusText = document.getElementById("status-text");
  const btnPopout = document.getElementById("btn-popout");
  const btnFocusTab = document.getElementById("btn-focus-tab");
  const btnOpenSpotify = document.getElementById("btn-open-spotify");

  const noTabView = document.getElementById("no-tab-view");
  const playerView = document.getElementById("player-view");

  const coverArt = document.getElementById("cover-art");
  const coverFallback = document.getElementById("cover-fallback");
  const adBadge = document.getElementById("ad-badge");

  const trackTitle = document.getElementById("track-title");
  const trackArtist = document.getElementById("track-artist");
  const btnLike = document.getElementById("btn-like");

  const seekSlider = document.getElementById("seek-slider");
  const progressFill = document.getElementById("progress-fill");
  const currentTime = document.getElementById("current-time");
  const totalDuration = document.getElementById("total-duration");

  const btnShuffle = document.getElementById("btn-shuffle");
  const btnPrev = document.getElementById("btn-prev");
  const btnPlayPause = document.getElementById("btn-play-pause");
  const playIcon = document.getElementById("play-icon");
  const pauseIcon = document.getElementById("pause-icon");
  const btnNext = document.getElementById("btn-next");
  const btnRepeat = document.getElementById("btn-repeat");

  const btnMute = document.getElementById("btn-mute");
  const volHighIcon = document.getElementById("vol-high-icon");
  const volMuteIcon = document.getElementById("vol-mute-icon");
  const volumeSlider = document.getElementById("volume-slider");
  const volumeFill = document.getElementById("volume-fill");
  const volumePercent = document.getElementById("volume-percent");

  const chkAutoMute = document.getElementById("chk-auto-mute");
  const chkFloatingWidget = document.getElementById("chk-floating-widget");

  // Interaction flags
  let isSeeking = false;
  let isVolumeDragging = false;
  let pollTimer = null;
  let lastKnownState = null;

  // Language management
  function applyLanguage(lang) {
    currentLang = lang;
    const dict = I18N[lang] || I18N["zh-CN"];

    if (langText) langText.innerText = dict.langBtn;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) {
        el.innerText = dict[key];
      }
    });

    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      if (dict[key]) {
        el.title = dict[key];
      }
    });

    // Update dynamic state texts
    if (lastKnownState) {
      renderPlayerState(lastKnownState);
    } else {
      statusText.innerText = dict.statusConnecting;
    }
  }

  // Load language and preferences
  chrome.storage.local.get(["userLanguage", "autoMuteAds", "enableInPageFloating"], (res) => {
    const lang = res.userLanguage || "zh-CN";
    applyLanguage(lang);

    chkAutoMute.checked = !!res.autoMuteAds;
    chkFloatingWidget.checked = res.enableInPageFloating !== false; // Default true
  });

  // Language toggle click
  btnLang.addEventListener("click", () => {
    const nextLang = currentLang === "zh-CN" ? "en-US" : "zh-CN";
    applyLanguage(nextLang);
    chrome.storage.local.set({ userLanguage: nextLang });
  });

  // Auto-mute toggle
  chkAutoMute.addEventListener("change", () => {
    chrome.storage.local.set({ autoMuteAds: chkAutoMute.checked });
  });

  // In-Page Floating toggle
  chkFloatingWidget.addEventListener("change", () => {
    chrome.storage.local.set({ enableInPageFloating: chkFloatingWidget.checked });
  });

  // Query background for current state
  function refreshState() {
    chrome.runtime.sendMessage({ action: "QUERY_PLAYER_STATE" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.found) {
        showNoTabState();
        return;
      }
      renderPlayerState(response);
    });
  }

  // Display disconnected state
  function showNoTabState() {
    lastKnownState = null;
    const dict = I18N[currentLang] || I18N["zh-CN"];
    statusPill.className = "status-pill offline";
    statusText.innerText = dict.statusOffline;
    noTabView.classList.remove("hidden");
    playerView.classList.add("hidden");
  }

  // Render player state to UI
  function renderPlayerState(state) {
    lastKnownState = state;
    const dict = I18N[currentLang] || I18N["zh-CN"];

    statusPill.className = "status-pill online";
    statusText.innerText = dict.statusOnline;
    noTabView.classList.add("hidden");
    playerView.classList.remove("hidden");

    // Track Title & Artist
    trackTitle.innerText = state.title || dict.notPlaying;
    trackTitle.title = state.title || "";
    trackArtist.innerText = state.artist || dict.playToStart;
    trackArtist.title = state.artist || "";

    // Cover Art
    if (state.coverUrl) {
      coverArt.src = state.coverUrl;
      coverArt.classList.remove("hidden");
      coverFallback.classList.add("hidden");
    } else {
      coverArt.classList.add("hidden");
      coverFallback.classList.remove("hidden");
    }

    // Ad indicator
    if (state.isAd) {
      adBadge.classList.remove("hidden");
    } else {
      adBadge.classList.add("hidden");
    }

    // Play/Pause icon
    if (state.isPlaying) {
      playIcon.classList.add("hidden");
      pauseIcon.classList.remove("hidden");
    } else {
      playIcon.classList.remove("hidden");
      pauseIcon.classList.add("hidden");
    }

    // Shuffle & Repeat
    if (state.isShuffle) {
      btnShuffle.classList.add("active");
    } else {
      btnShuffle.classList.remove("active");
    }

    if (state.repeatState && state.repeatState !== "false") {
      btnRepeat.classList.add("active");
    } else {
      btnRepeat.classList.remove("active");
    }

    // Like
    if (state.isLiked) {
      btnLike.classList.add("liked");
    } else {
      btnLike.classList.remove("liked");
    }

    // Progress Bar (only update if user is not currently seeking)
    if (!isSeeking) {
      currentTime.innerText = state.currentTime || "0:00";
      totalDuration.innerText = state.duration || "0:00";
      const percent = typeof state.progressPercent === "number" ? state.progressPercent : 0;
      progressFill.style.width = `${percent}%`;
      seekSlider.value = percent;
    }

    // Volume (only update if user is not currently dragging slider)
    if (!isVolumeDragging && typeof state.volume === "number") {
      volumeSlider.value = state.volume;
      if (volumeFill) volumeFill.style.width = `${state.volume}%`;
      volumePercent.innerText = `${state.volume}%`;
    }

    // Mute state
    if (state.isMuted) {
      volHighIcon.classList.add("hidden");
      volMuteIcon.classList.remove("hidden");
    } else {
      volHighIcon.classList.remove("hidden");
      volMuteIcon.classList.add("hidden");
    }
  }

  // Send command helper
  function sendCommand(command, payload = null) {
    chrome.runtime.sendMessage(
      { action: "EXECUTE_COMMAND", command, payload },
      (res) => {
        if (res && res.found) {
          renderPlayerState(res);
        }
      }
    );
  }

  // Pop-out Window (Desktop Independent Floating Window)
  if (btnPopout) {
    btnPopout.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const popUrl = chrome.runtime.getURL("popup.html?detached=true");

      if (chrome.windows && chrome.windows.create) {
        chrome.windows.create(
          {
            url: popUrl,
            type: "popup",
            width: 340,
            height: 520,
            focused: true,
          },
          () => {
            window.close();
          }
        );
      } else {
        chrome.runtime.sendMessage({ action: "OPEN_DETACHED_WINDOW" }, () => {
          window.close();
        });
      }
    });
  }

  // Open & Focus Tab actions
  btnOpenSpotify.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "OPEN_SPOTIFY" }, () => {
      window.close();
    });
  });

  btnFocusTab.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "FOCUS_SPOTIFY" }, () => {
      window.close();
    });
  });

  // Playback control buttons
  btnPlayPause.addEventListener("click", () => {
    const isPlaying = playIcon.classList.contains("hidden");
    if (isPlaying) {
      playIcon.classList.remove("hidden");
      pauseIcon.classList.add("hidden");
    } else {
      playIcon.classList.add("hidden");
      pauseIcon.classList.remove("hidden");
    }
    sendCommand("PLAY_PAUSE");
  });

  btnNext.addEventListener("click", () => sendCommand("NEXT_TRACK"));
  btnPrev.addEventListener("click", () => sendCommand("PREV_TRACK"));
  btnShuffle.addEventListener("click", () => sendCommand("TOGGLE_SHUFFLE"));
  btnRepeat.addEventListener("click", () => sendCommand("TOGGLE_REPEAT"));

  btnLike.addEventListener("click", () => {
    btnLike.classList.toggle("liked");
    sendCommand("TOGGLE_LIKE");
  });

  btnMute.addEventListener("click", () => {
    volHighIcon.classList.toggle("hidden");
    volMuteIcon.classList.toggle("hidden");
    sendCommand("TOGGLE_MUTE");
  });

  // Seek bar events
  seekSlider.addEventListener("mousedown", () => {
    isSeeking = true;
  });
  seekSlider.addEventListener("touchstart", () => {
    isSeeking = true;
  });

  seekSlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    progressFill.style.width = `${val}%`;
  });

  seekSlider.addEventListener("change", (e) => {
    const val = parseFloat(e.target.value);
    isSeeking = false;
    sendCommand("SEEK", { percent: val });
  });

  // Volume slider events
  volumeSlider.addEventListener("mousedown", () => {
    isVolumeDragging = true;
  });
  volumeSlider.addEventListener("touchstart", () => {
    isVolumeDragging = true;
  });

  volumeSlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    if (volumeFill) volumeFill.style.width = `${val}%`;
    volumePercent.innerText = `${val}%`;
  });

  volumeSlider.addEventListener("change", (e) => {
    const val = parseInt(e.target.value, 10);
    isVolumeDragging = false;
    sendCommand("SET_VOLUME", { volume: val });
  });

  // If running in detached mode, hide the popout button to avoid duplicate popouts
  if (window.location.search.includes("detached=true")) {
    if (btnPopout) btnPopout.style.display = "none";
  }

  // Initial load & Polling loop
  refreshState();
  pollTimer = setInterval(refreshState, 1000);

  window.addEventListener("unload", () => {
    if (pollTimer) clearInterval(pollTimer);
  });
});
