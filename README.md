# Spotify Web Controller (免 Spotify Premium 网页控制器)

[English](#english) | [中文说明](#中文说明)

---

## 中文说明

一款专为 **Microsoft Edge** 和 **Google Chrome** 设计的高颜值浏览器扩展。无需 Spotify Premium 会员，即可在浏览器的任何网页及桌面任意角落随时随地随心控制 Spotify Web 播放器。

### 🌟 核心特性

1. **双重全局悬浮控制 (Dual Floating Control)**：
   - 🖥️ **桌面级置顶独立悬浮窗 (Always-On-Top PiP Window)**：
     - 支持无边框独立置顶小窗，切换到 VSCode、游戏、办公软件等任意窗口，播放器始终悬浮在桌面边缘，点击其他地方不会关闭！
     - 📌 **系统级永远置顶 (System-level Always on Top)**：
       - **方式 1（内置画中画）**：点击顶栏或迷你条上的 **📌 置顶图标**，直接开启 Chromium 原生 Document Picture-in-Picture 永远置顶小窗（浮于所有软件及全屏窗口之上）！
       - **方式 2（系统快捷键）**：安装微软官方 PowerToys 后，在独立小窗上按下 **`Win + Ctrl + T`** 即可一键锁定在屏幕最前！
       - **方式 3（一键脚本）**：双击项目根目录下的 **`置顶当前窗口.bat`**，自动将控制器置为 Windows 系统底层最前端！
     - 🎛️ **双形态窗口模式（正常模式 & 极致迷你模式）**：
       - **正常模式**：显示完整封面、进度条、全功能播放控制与音量条。
       - **迷你模式**：专为小尺寸设计，超窄横条仅保留核心的 **播放/暂停、下一首、静音、置顶** 按钮及歌名，窗口锁定至固定超小尺寸（320×92px），杜绝任何内容遮挡！
   - 🌐 **网页内拖拽悬浮音乐胶囊 (In-Page Floating Widget)**：
     - 在浏览任意网页时，页面右下角显示小巧的音乐悬浮球/胶囊。
     - 实时旋转唱片封面、歌名滚动显示、快捷切歌；可自由拖拽放置在页面任意位置并自动记忆位置。
     - 点击可一键展开为完整控制器卡片；可在插件面板底部随时一键开启或关闭。
2. **中英双语切换 (Language Switch)**：
   - 顶部快捷按钮一键无缝切换 **中文 / English**，自动保存用户语言偏好。
3. **无需 Spotify Premium**：
   - 基于原生 DOM 事件与播放器通信，完全突破官方 Web Playback SDK 对 Premium 账户的限制。
4. **完整播放控制与进度拖拽**：
   - 实时专辑封面、歌曲名、演唱者信息。
   - 交互式进度条实时拖动与快进/快退。
   - 播放/暂停、上一首、下一首、随机播放、单曲循环、喜欢收藏。
   - 音量平滑滑动调节与一键静音。
5. **智能广告自动静音 (免费版福利)**：
   - 检测到音频广告插播时自动静音网页，广告播完正片曲目开始后自动恢复音量。
6. **全局键盘快捷键**：
   - `Alt + Shift + P`：播放 / 暂停
   - `Alt + Shift + Right`：下一首
   - `Alt + Shift + Left`：上一首

### 🚀 安装与加载指南

#### Microsoft Edge：
1. 地址栏访问 `edge://extensions/`
2. 打开左下角 **「开发人员模式」**（Developer Mode）。
3. 点击 **「加载解压缩的扩展」**（Load unpacked）。
4. 选择本项目文件夹：
   ```text
   c:\Users\lin\Desktop\c#\SpotifyOnEdge
   ```
5. 在 Edge 工具栏中点击扩展图标，将「Spotify 控制器」固定在工具栏即可。

#### Google Chrome：
1. 地址栏访问 `chrome://extensions/`
2. 打开右上角 **「开发者模式」**。
3. 点击左上角 **「加载已解压的扩展程序」** 并选择本项目文件夹。

---

## English

A premium browser extension designed for **Microsoft Edge** and **Google Chrome**. Easily control Spotify Web Player without Spotify Premium, from any webpage or anywhere on your desktop.

### 🌟 Key Features

1. **Dual Floating Modes**:
   - 🖥️ **Desktop Always-On-Top Window**:
     - Detached standalone window that stays on top across all apps (IDE, games, desktop).
     - 🎛️ **Dual Window Modes (Normal & Ultra-Mini)**:
       - **Normal Mode**: Full layout with large album art, interactive seek bar, volume slider, and toggles.
       - **Mini Mode**: Ultra-compact strip containing only the essential **Play/Pause, Next Track, Mute** buttons + track info, shrinking down to ~300x90px with zero clipping!
   - 🌐 **In-Page Draggable Floating Widget**:
     - Floating music pill widget injected onto web pages with vinyl disc animation.
     - Fully draggable with position memory.
     - Can be expanded into a mini player card or collapsed into a compact capsule.
2. **Bilingual UI (Chinese / English)**:
   - Instant language switching directly from the header (`中 / EN`).
3. **No Spotify Premium Required**:
   - Direct DOM player communication bypasses Spotify's Web Playback SDK restrictions.
4. **Playback & Seeking**:
   - Real-time album art, song title, artist name.
   - Interactive scrub bar for precise seeking.
   - Play/Pause, Next/Prev, Shuffle, Repeat, Like button.
   - Volume slider & mute toggle.
5. **Smart Ad Auto-Mute (Free tier bonus)**:
   - Automatically mutes audio during ads and unmutes when music resumes.
6. **Global Keyboard Shortcuts**:
   - `Alt + Shift + P`: Play / Pause
   - `Alt + Shift + Right`: Next Track
   - `Alt + Shift + Left`: Previous Track

---

## ⌨️ Custom Shortcuts / 自定义快捷键
- **Edge**: `edge://extensions/shortcuts`
- **Chrome**: `chrome://extensions/shortcuts`
