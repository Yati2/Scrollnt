# Scrollnt - Chrome Extension

A behavior-aware Chrome extension that progressively discourages excessive scrolling on short-form video platforms (TikTok Phase 1, YouTube Shorts Phase 2).

## 🚀 Getting Started

### Installation (Developer Mode)

1. **Open Chrome Extensions Page**
    - Navigate to `chrome://extensions/`
    - Or click Menu (⋮) → Extensions → Manage Extensions

2. **Enable Developer Mode**
    - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**
    - Click "Load unpacked"
    - Select the `Scrollnt` folder containing `manifest.json`

4. **Verify Installation**
    - You should see the Scrollnt extension icon in your toolbar
    - Pin it for easy access

### Add Extension Icons

Before loading, add icon files to the `icons/` folder:

- `icon16.png` (16×16px)
- `icon48.png` (48×48px)
- `icon128.png` (128×128px)

You can create simple icons or use a placeholder initially.

## ✨ Features

### Behavioral Tracking

- **Session Duration**: Tracks how long you've been scrolling
- **Video Count**: Counts videos watched
- **Swipe Speed**: Monitors scrolling velocity

### Progressive Discouragement System

#### Level 1 (10 minutes)

- Viewport shrinks to 80%
- Desaturation to ~85%
- Uneven padding

#### Level 2 (20 minutes)

- Continued viewport effects
- Micro zoom drift animation
- Video blur effect
- Reminder popup with video count

#### Level 3 (30 minutes)

- All previous effects
- Challenge modal (CAPTCHA, games, tasks)
- Strong encouragement to take a break

## 📁 Project Structure

```
Scrollnt/
├── manifest.json       # Extension configuration
├── content.js         # Main tracking & intervention logic
├── background.js      # Service worker for data persistence
├── styles.css         # Visual intervention styles
├── popup.html         # Extension popup UI
├── popup.js           # Popup functionality
├── icons/             # Extension icons
└── README.md          # This file
```

## 🎯 Supported Platforms

- ✅ **Phase 1**: TikTok
- 🔜 **Phase 2**: YouTube Shorts (coming soon)

## 🧪 Testing

1. Visit [TikTok](https://www.tiktok.com)
2. Start scrolling through videos
3. Open the extension popup to view stats
4. Wait for interventions at 10, 20, and 30 minutes (or modify timings in `content.js` for testing)
5. Use "Reset Session" button to restart tracking

## 🛠️ Development

### Modifying the Extension

After making changes:

1. Go to `chrome://extensions/`
2. Click the refresh icon on the Scrollnt extension
3. Reload any TikTok tabs

### Key Files to Edit

- **`content.js`**: Add new tracking features or intervention logic
- **`styles.css`**: Customize visual effects
- **`popup.html/js`**: Modify the extension popup interface
- **`manifest.json`**: Add permissions or new platforms

### Quick Testing (Modify Time Thresholds)

In `content.js`, find the `checkInterventionNeeded()` method and change durations:

```javascript
// Change from 30, 20, 10 to 3, 2, 1 for quick testing
if (duration >= 3) {
    // was 30
    this.interventionLevel = 3;
} else if (duration >= 2) {
    // was 20
    this.interventionLevel = 2;
} else if (duration >= 1) {
    // was 10
    this.interventionLevel = 1;
}
```

## 🔧 Adding YouTube Shorts Support

To add YouTube Shorts (Phase 2):

1. Update `manifest.json`:

```json
"host_permissions": [
  "*://*.tiktok.com/*",
  "*://*.youtube.com/*"
],
"content_scripts": [
  {
    "matches": ["*://*.tiktok.com/*", "*://*.youtube.com/shorts/*"],
    "js": ["content.js"],
    "css": ["styles.css"]
  }
]
```

2. Update `content.js` to detect YouTube-specific selectors

## 📊 Future Enhancements

- Daily/weekly usage reports
- Custom challenge library
- Configurable time thresholds
- Export usage data
- Whitelist/blacklist features
- Instagram Reels support

## 🤝 Contributing

This is a university project for SMU_IS. Feel free to extend functionality based on the problem statement requirements.

---

**Stay mindful of your screen time!** ✨
