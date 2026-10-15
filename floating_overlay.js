// Spotify Web Controller - In-Page Floating Widget

(() => {
  // Only inject in top window (not inside iframes)
  if (window !== window.top) return;
  if (window.__SPOTIFY_OVERLAY_INJECTED__) return;
  window.__SPOTIFY_OVERLAY_INJECTED__ = true;

  // i18n
  const I18N = {
    "zh-CN": {
      brand: "Spotify 控制器",
      notPlaying: "未在播放",
      playToStart: "打开 Spotify 播放",
      collapse: "收起",
      expand: "展开",
      prev: "上一首",
      playPause: "播放/暂停",
      next: "下一首",
    },
    "en-US": {
      brand: "Spotify Controller",
      notPlaying: "Not Playing",
      playToStart: "Open Spotify to play",
      collapse: "Collapse",
      expand: "Expand",
      prev: "Previous",
      playPause: "Play / Pause",
      next: "Next",
    },
  };

  let currentLang = "zh-CN";
  let isEnabled = true;
  let isExpanded = false;
  let pollInterval = null;
  let currentState = null;

  // Create Shadow Host
  const host = document.createElement("div");
  host.id = "spotify-web-ctrl-widget-host";
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  // Load CSS into Shadow DOM
  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("floating_overlay.css");
  shadow.appendChild(styleLink);

  // Widget Container
  const widgetRoot = document.createElement("div");
  widgetRoot.className = "widget-root hidden";
  shadow.appendChild(widgetRoot);

  // Render HTML Structure
  widgetRoot.innerHTML = `
    <!-- Compact Pill -->
    <div id="floating-pill" class="floating-pill">
      <div id="disc-wrapper" class="disc-wrapper paused">
        <img id="pill-cover" class="disc-cover" style="display:none;" />
        <svg id="pill-logo" class="disc-fallback-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.627.627 0 0 1-.86.208c-2.355-1.439-5.32-1.764-8.814-.966a.627.627 0 1 1-.28-1.222c3.824-.875 7.098-.507 9.746 1.118a.627.627 0 0 1 .208.862zm1.225-2.723a.784.784 0 0 1-1.077.26c-2.696-1.657-6.805-2.136-9.993-1.168a.784.784 0 1 1-.462-1.498c3.64-1.104 8.18-.574 11.272 1.329a.785.785 0 0 1 .26 1.077zm.106-2.836C14.689 8.94 9.362 8.766 6.273 9.704a.942.942 0 1 1-.55-1.802c3.543-1.076 9.426-.874 13.23 1.385a.942.942 0 0 1-.995 1.578z"/>
        </svg>
      </div>

      <div class="pill-info">
        <span id="pill-title" class="pill-title">未在播放</span>
        <span id="pill-artist" class="pill-artist">Spotify</span>
      </div>

      <div class="pill-actions">
        <button id="pill-btn-play" class="pill-btn play-btn" title="播放/暂停">
          <svg id="pill-icon-play" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <polygon points="6 4 20 12 6 20 6 4"></polygon>
          </svg>
          <svg id="pill-icon-pause" style="display:none;" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          </svg>
        </button>

        <button id="pill-btn-next" class="pill-btn" title="下一首">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.5"></line>
          </svg>
        </button>

        <button id="pill-btn-expand" class="pill-btn" title="展开">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- Expanded Card -->
    <div id="expanded-card" class="expanded-card" style="display: none;">
      <div id="card-drag-handle" class="card-header">
        <div class="card-brand">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.627.627 0 0 1-.86.208c-2.355-1.439-5.32-1.764-8.814-.966a.627.627 0 1 1-.28-1.222c3.824-.875 7.098-.507 9.746 1.118a.627.627 0 0 1 .208.862zm1.225-2.723a.784.784 0 0 1-1.077.26c-2.696-1.657-6.805-2.136-9.993-1.168a.784.784 0 1 1-.462-1.498c3.64-1.104 8.18-.574 11.272 1.329a.785.785 0 0 1 .26 1.077zm.106-2.836C14.689 8.94 9.362 8.766 6.273 9.704a.942.942 0 1 1-.55-1.802c3.543-1.076 9.426-.874 13.23 1.385a.942.942 0 0 1-.995 1.578z"/>
          </svg>
          <span id="card-brand-text">Spotify 控制器</span>
        </div>
        <button id="card-btn-close" class="card-close-btn" title="收起">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="card-track">
        <img id="card-cover" class="card-cover" src="" />
        <div class="card-details">
          <div id="card-title" class="card-title">未在播放</div>
          <div id="card-artist" class="card-artist">Spotify 网页版</div>
        </div>
      </div>

      <div class="card-progress">
        <div id="card-progress-bar" class="card-progress-bar">
          <div id="card-progress-fill" class="card-progress-fill" style="width: 0%;"></div>
        </div>
        <div class="card-times">
          <span id="card-current-time">0:00</span>
          <span id="card-duration">0:00</span>
        </div>
      </div>

      <div class="card-controls">
        <button id="card-btn-prev" class="card-ctrl-btn" title="上一首">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <polygon points="19 20 9 12 19 4 19 20"></polygon>
            <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2.5"></line>
          </svg>
        </button>

        <button id="card-btn-play" class="card-ctrl-btn card-play-btn" title="播放 / 暂停">
          <svg id="card-icon-play" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <polygon points="6 4 20 12 6 20 6 4"></polygon>
          </svg>
          <svg id="card-icon-pause" style="display:none;" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          </svg>
        </button>

        <button id="card-btn-next" class="card-ctrl-btn" title="下一首">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.5"></line>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Get Shadow Elements
  const floatingPill = shadow.getElementById("floating-pill");
  const discWrapper = shadow.getElementById("disc-wrapper");
  const pillCover = shadow.getElementById("pill-cover");
  const pillLogo = shadow.getElementById("pill-logo");
  const pillTitle = shadow.getElementById("pill-title");
  const pillArtist = shadow.getElementById("pill-artist");
  const pillBtnPlay = shadow.getElementById("pill-btn-play");
  const pillIconPlay = shadow.getElementById("pill-icon-play");
  const pillIconPause = shadow.getElementById("pill-icon-pause");
  const pillBtnNext = shadow.getElementById("pill-btn-next");
  const pillBtnExpand = shadow.getElementById("pill-btn-expand");

  const expandedCard = shadow.getElementById("expanded-card");
  const cardBrandText = shadow.getElementById("card-brand-text");
  const cardBtnClose = shadow.getElementById("card-btn-close");
  const cardCover = shadow.getElementById("card-cover");
  const cardTitle = shadow.getElementById("card-title");
  const cardArtist = shadow.getElementById("card-artist");
  const cardProgressBar = shadow.getElementById("card-progress-bar");
  const cardProgressFill = shadow.getElementById("card-progress-fill");
  const cardCurrentTime = shadow.getElementById("card-current-time");
  const cardDuration = shadow.getElementById("card-duration");
  const cardBtnPrev = shadow.getElementById("card-btn-prev");
  const cardBtnPlay = shadow.getElementById("card-btn-play");
  const cardIconPlay = shadow.getElementById("card-icon-play");
  const cardIconPause = shadow.getElementById("card-icon-pause");
  const cardBtnNext = shadow.getElementById("card-btn-next");

  // Restore Dragged Position
  function restorePosition() {
    try {
      const saved = localStorage.getItem("__spotify_floating_pos");
      if (saved) {
        const { left, top } = JSON.parse(saved);
        const maxLeft = window.innerWidth - 80;
        const maxTop = window.innerHeight - 80;
        widgetRoot.style.left = `${Math.max(10, Math.min(left, maxLeft))}px`;
        widgetRoot.style.top = `${Math.max(10, Math.min(top, maxTop))}px`;
        widgetRoot.style.bottom = "auto";
        widgetRoot.style.right = "auto";
      }
    } catch (e) {}
  }
  restorePosition();

  // Make Draggable
  function makeDraggable(handleEl) {
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;
    let isDragging = false;

    handleEl.addEventListener("mousedown", (e) => {
      // Don't drag if clicking buttons
      if (e.target.closest("button")) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = widgetRoot.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;

      widgetRoot.style.left = `${origLeft}px`;
      widgetRoot.style.top = `${origTop}px`;
      widgetRoot.style.bottom = "auto";
      widgetRoot.style.right = "auto";

      const onMouseMove = (ev) => {
        if (!isDragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        const newLeft = Math.max(10, Math.min(window.innerWidth - widgetRoot.offsetWidth - 10, origLeft + dx));
        const newTop = Math.max(10, Math.min(window.innerHeight - widgetRoot.offsetHeight - 10, origTop + dy));

        widgetRoot.style.left = `${newLeft}px`;
        widgetRoot.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          try {
            const rect = widgetRoot.getBoundingClientRect();
            localStorage.setItem(
              "__spotify_floating_pos",
              JSON.stringify({ left: rect.left, top: rect.top })
            );
          } catch (e) {}
        }
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  makeDraggable(floatingPill);
  makeDraggable(shadow.getElementById("card-drag-handle"));

  // Send Command helper
  function sendCommand(command, payload = null) {
    chrome.runtime.sendMessage(
      { action: "EXECUTE_COMMAND", command, payload },
      (res) => {
        if (res && res.found) {
          renderState(res);
        }
      }
    );
  }

  // Update UI with Player State
  function renderState(state) {
    currentState = state;
    const dict = I18N[currentLang] || I18N["zh-CN"];

    if (!state || !state.found) {
      // No active tab
      pillTitle.innerText = dict.notPlaying;
      pillArtist.innerText = "Spotify";
      discWrapper.className = "disc-wrapper paused";
      pillCover.style.display = "none";
      pillLogo.style.display = "block";
      pillIconPlay.style.display = "block";
      pillIconPause.style.display = "none";
      return;
    }

    // Texts
    const title = state.title || dict.notPlaying;
    const artist = state.artist || dict.playToStart;
    pillTitle.innerText = title;
    pillArtist.innerText = artist;
    cardTitle.innerText = title;
    cardArtist.innerText = artist;

    // Cover art
    if (state.coverUrl) {
      pillCover.src = state.coverUrl;
      pillCover.style.display = "block";
      pillLogo.style.display = "none";
      cardCover.src = state.coverUrl;
    } else {
      pillCover.style.display = "none";
      pillLogo.style.display = "block";
    }

    // Play / Pause disc animation and icons
    if (state.isPlaying) {
      discWrapper.className = "disc-wrapper playing";
      pillIconPlay.style.display = "none";
      pillIconPause.style.display = "block";
      cardIconPlay.style.display = "none";
      cardIconPause.style.display = "block";
    } else {
      discWrapper.className = "disc-wrapper paused";
      pillIconPlay.style.display = "block";
      pillIconPause.style.display = "none";
      cardIconPlay.style.display = "block";
      cardIconPause.style.display = "none";
    }

    // Progress
    const percent = typeof state.progressPercent === "number" ? state.progressPercent : 0;
    cardProgressFill.style.width = `${percent}%`;
    cardCurrentTime.innerText = state.currentTime || "0:00";
    cardDuration.innerText = state.duration || "0:00";
  }

  // Fetch State from background
  function fetchState() {
    if (!isEnabled || document.hidden) return;
    chrome.runtime.sendMessage({ action: "QUERY_PLAYER_STATE" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.found) {
        renderState({ found: false });
      } else {
        renderState(response);
      }
    });
  }

  // Toggle Expanded Card
  function toggleExpand(expand) {
    isExpanded = expand;
    if (isExpanded) {
      floatingPill.style.display = "none";
      expandedCard.style.display = "flex";
    } else {
      floatingPill.style.display = "flex";
      expandedCard.style.display = "none";
    }
  }

  pillBtnExpand.addEventListener("click", () => toggleExpand(true));
  cardBtnClose.addEventListener("click", () => toggleExpand(false));

  // Playback Controls
  pillBtnPlay.addEventListener("click", (e) => {
    e.stopPropagation();
    sendCommand("PLAY_PAUSE");
  });
  cardBtnPlay.addEventListener("click", () => sendCommand("PLAY_PAUSE"));

  pillBtnNext.addEventListener("click", (e) => {
    e.stopPropagation();
    sendCommand("NEXT_TRACK");
  });
  cardBtnNext.addEventListener("click", () => sendCommand("NEXT_TRACK"));
  cardBtnPrev.addEventListener("click", () => sendCommand("PREV_TRACK"));

  // Progress Click
  cardProgressBar.addEventListener("click", (e) => {
    const rect = cardProgressBar.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    sendCommand("SEEK", { percent: Math.max(0, Math.min(100, percent)) });
  });

  // Apply Preferences
  function applyPreferences(prefs) {
    if (prefs.enableInPageFloating !== undefined) {
      isEnabled = prefs.enableInPageFloating;
      if (isEnabled) {
        widgetRoot.classList.remove("hidden");
        fetchState();
      } else {
        widgetRoot.classList.add("hidden");
      }
    }
    if (prefs.userLanguage) {
      currentLang = prefs.userLanguage;
      const dict = I18N[currentLang] || I18N["zh-CN"];
      cardBrandText.innerText = dict.brand;
    }
  }

  // Initial preferences load
  chrome.storage.local.get(["enableInPageFloating", "userLanguage"], (res) => {
    applyPreferences({
      enableInPageFloating: res.enableInPageFloating !== false, // default true
      userLanguage: res.userLanguage || "zh-CN",
    });
  });

  // Watch for storage changes (realtime toggle)
  chrome.storage.onChanged.addListener((changes) => {
    const updated = {};
    if (changes.enableInPageFloating) {
      updated.enableInPageFloating = changes.enableInPageFloating.newValue;
    }
    if (changes.userLanguage) {
      updated.userLanguage = changes.userLanguage.newValue;
    }
    applyPreferences(updated);
  });

  // Polling loop
  pollInterval = setInterval(fetchState, 1500);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) fetchState();
  });
})();
