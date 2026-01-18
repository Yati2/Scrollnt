# Scrollnt

> A Chrome extension that discourages doomscrolling through progressive friction—because sometimes you need a gentle nudge to take back control.

Have you ever opened TikTok for "just 5 minutes" and realized 45 minutes later with hundreds of videos scrolled through? 

Most anti-doomscrolling tools rely on hard limits, such as blocking apps, shutting down feeds, or enforcing strict timers. While effective in theory, these solutions often feel restrictive and are easy to bypass in moments of low self-control.

**Scrollnt takes a different approach**: instead of stopping you outright, it annoys you incrementally until you get tired of it and stop by yourself. Rather than removing control, Scrollnt nudges users to take it back.

The longer you scroll, the more effort it takes—until stopping becomes the easiest option.

## ✨ Features

**Behavioral Tracking**
- Scroll / session duration
- Video count

**Progressive Discouragement System**
- Viewport shrinking
- Visual misalignment
- Screen desaturation and oversaturation
- Random video tilting
- Zoom drift
- Button swaps

**Reminders**
- Motivational scoldings
- “Interesting” video reminder

**Interactive Challenges**
- Annoying captchas
  - Whack-a-Mole
  - Sarcastic AI: Convince It That You Are Human
- Cat jump game
- Memory test
- Typing challenge
- Math problem

**Customization**
- Configurable maximum scroll duration

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

## 🎯 Supported Platforms

- ✅ **TikTok**
- 🔜 **YouTube Shorts** (coming soon)
- 🔜 **Instagram Reels** (planned)

## 🛠️ How It Works

Scrollnt is built as a Chrome extension that directly interfaces with TikTok's web UI using JavaScript, HTML, and CSS to track user scrolling behavior and dynamically inject UI distortions as thresholds are crossed.

**Tech Stack:**
- **Frontend**: Chrome Extension APIs, JavaScript, HTML, CSS
- **Backend**: Flask (for AI-related challenge states and reminders)
- **AI Integration**: OpenAI API (for sarcastic AI challenge interactions and quote generation)

By leveraging Chrome Extension APIs, Scrollnt intercepts page behavior, modifies DOM elements, and overlays custom components without altering the underlying platform. This allows Scrollnt to remain flexible, extensible, and non-destructive.

## 📁 Project Structure

```
Scrollnt/
├── manifest.json          # Extension configuration and permissions
├── content.js             # Main tracking & intervention logic
├── background.js          # Service worker for data persistence
├── styles.css             # Visual intervention styles
├── popup.html             # Extension popup UI
├── popup.js               # Popup functionality
├── autolockCard.js        # Auto-lock card component
├── reminderCard.js        # Reminder card component
├── scoldGPT.js            # GPT-powered motivational messages
├── challenges/            # Interactive challenge modules
│   ├── index.js           # Challenge orchestrator
│   ├── catGame.js         # Cat jump game
│   ├── memoryTest.js      # Memory test challenge
│   ├── typing.js          # Typing challenge
│   ├── typing.css
│   ├── math.js            # Math problem challenge
│   ├── math.css
│   ├── youtubeWatch.js    # YouTube watch challenge
│   └── captcha/           # CAPTCHA challenges
│       ├── captcha.css
│       ├── mole/          # Whack-a-Mole game
│       │   ├── mole.js
│       │   └── mole.css
│       └── sarcasticAI/   # Sarcastic AI challenge
│           ├── index.js
│           ├── api.js
│           └── sarcasticAI.css
└── assets/                # Images, icons, and game assets
    ├── icons/             # Extension icons
    ├── catgame/           # Cat game assets
    ├── cats/              # Cat sprites
    └── mole/              # Whack-a-Mole game assets
```

## 🧪 Testing

1. Visit [TikTok](https://www.tiktok.com)
2. Start scrolling through videos
3. Open the extension popup to view stats
4. Wait for interventions
5. Use "Reset Session" button to restart tracking

## 🔧 Development

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


## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, or platform support, feel free to open an issue or submit a pull request.

## 📝 License

This project is open source and available for educational and personal use.

---

**Stay mindful of your screen time!** ✨
