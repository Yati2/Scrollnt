// Scrollnt Popup Script

async function updateStats() {
    const data = await chrome.storage.local.get([
        "sessionStart",
        "videoCount",
        "lastUpdate",
        "maxDuration",
        "sessionPaused",
        "pauseStartTime",
    ]);

    const sessionStart = data.sessionStart || Date.now();
    const pauseStartTime = data.pauseStartTime || null;
    const sessionPaused = data.sessionPaused || false;

    // Calculate duration accounting for paused time
    let elapsedTime = Date.now() - sessionStart;
    if (sessionPaused && pauseStartTime) {
        elapsedTime -= (Date.now() - pauseStartTime);
    }
    const duration = Math.floor(elapsedTime / 1000 / 60);

    const videoCount = data.videoCount || 0;
    const maxDuration = data.maxDuration || 0;

    // Update button text based on session state
    const startStopBtn = document.getElementById("startStopBtn");
    startStopBtn.textContent = sessionPaused ? "Start" : "Stop";
    startStopBtn.className = sessionPaused ? "" : "button-opposite";

    const resetBtn = document.getElementById("resetBtn");
    resetBtn.disabled = !sessionPaused;
    resetBtn.className = sessionPaused ? "buttonPad" : "buttonPad button-opposite button-disabled";

    // Update stats display
    document.getElementById("duration").textContent = `${duration} min`;
    document.getElementById("videoCount").textContent = videoCount;
    document.getElementById("maxDuration").textContent = `${maxDuration} min`;

    // Update status
    const statusEl = document.getElementById("status");

    if (duration >= 45) {
        statusEl.textContent = "🚨 Take a break!";
        statusEl.className = "status danger";
    } else if (duration >= 30) {
        statusEl.textContent = "⚠️ High usage - Consider stopping";
        statusEl.className = "status warning";
    } else if (duration >= 20) {
        statusEl.textContent = "⏰ Moderate usage detected";
        statusEl.className = "status warning";
    } else {
        statusEl.textContent = "✅ Normal browsing";
        statusEl.className = "status";
    }
}

document.getElementById("startStopBtn").addEventListener("click", async () => {
    const data = await chrome.storage.local.get([
        "sessionPaused",
        "sessionStart",
        "pauseStartTime",
    ]);
    const isPaused = data.sessionPaused || false;
    const sessionStart = data.sessionStart || Date.now();
    const pauseStartTime = data.pauseStartTime || null;

    if (isPaused) {
        // Resuming: adjust sessionStart forward by the pause duration
        const pauseDuration = pauseStartTime ? (Date.now() - pauseStartTime) : 0;
        await chrome.storage.local.set({
            sessionPaused: false,
            sessionStart: sessionStart + pauseDuration,
            pauseStartTime: null,
        });
    } else {
        // Pausing: record pause start time
        await chrome.storage.local.set({
            sessionPaused: true,
            pauseStartTime: Date.now(),
        });
    }

    document.getElementById("startStopBtn").textContent = isPaused ? "Stop" : "Start";
    updateStats();
});

document.getElementById("resetBtn").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ action: "resetSession" });
    updateStats();

    // Notify content scripts to reset
    const tabs = await chrome.tabs.query({ url: "*://*.tiktok.com/*" });
    tabs.forEach((tab) => {
        chrome.tabs.reload(tab.id);
    });
});

// Update stats on load and every second
updateStats();
setInterval(updateStats, 1000);
