# Privacy Policy for Spotify Web Controller

**Last Updated: October 2026**

This Privacy Policy describes how the **Spotify Web Controller** browser extension ("the Extension") handles user information and data.

---

### 1. Zero Data Collection (无数据收集声明)
The Spotify Web Controller extension strictly values and respects your privacy:
- **No Personal Data Collection**: We do NOT collect, store, transmit, or sell any personal data, user credentials, browsing history, or Spotify account details.
- **Local Operation**: All playback control commands, track info extraction, and settings storage (`chrome.storage.local`) operate 100% locally within your browser.

---

### 2. Permissions Justification (权限使用声明)

The Extension requests the following permissions purely to enable core playback functionality:

- **`tabs`**: Used solely to locate and communicate with the active Spotify Web Player tab (`open.spotify.com`) in your browser to send media commands (play, pause, skip, volume).
- **`scripting`**: Used to communicate with the playback controls on `open.spotify.com` and reflect current track metadata (title, artist, album art, progress) in the controller UI.
- **`storage`**: Used exclusively to store user interface preferences locally (e.g., UI language selection, mini mode state, and auto-mute ads preference).
- **Host Permissions (`https://open.spotify.com/*`, `<all_urls>`)**:
  - `https://open.spotify.com/*`: Required to interact with Spotify Web Player.
  - `<all_urls>`: Required to display the optional in-page floating music capsule widget while browsing other web pages. Can be toggled off at any time.

---

### 3. Third-Party Services
The Extension does not integrate any third-party analytics, tracking SDKs, or advertising networks.

---

### 4. Contact
If you have any questions about this Privacy Policy, please contact the developer via GitHub Issues at:
https://github.com/LYW199911/SpotifyOnWebBrowser
