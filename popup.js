// Scrollnt Popup Script

async function updateStats() {
    const data = await chrome.storage.local.get([
        "sessionStart",
        "videoCount",
        "lastUpdate",
        "maxDuration",
    ]);

    const sessionStart = data.sessionStart || Date.now();
    const duration = Math.floor((Date.now() - sessionStart) / 1000 / 60);
    const videoCount = data.videoCount || 0;
    const maxDuration = data.maxDuration || 0;

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

document.getElementById("resetBtn").addEventListener("click", async () => {
    await chrome.storage.local.set({
        sessionStart: Date.now(),
        videoCount: 0,
        lastUpdate: Date.now(),
    });

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
