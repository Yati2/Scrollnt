// Scrollnt - Background Service Worker
// Handles data persistence and cross-tab communication

chrome.runtime.onInstalled.addListener(() => {
    console.log("Scrollnt extension installed");

    // Initialize storage
    chrome.storage.local.set({
        sessionStart: Date.now(),
        videoCount: 0,
        totalTimeSpent: 0,
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateStats") {
        chrome.storage.local.set({
            videoCount: request.videoCount,
            sessionDuration: request.sessionDuration,
            lastUpdate: Date.now(),
        });
    }

    if (request.action === "getStats") {
        chrome.storage.local.get(
            ["videoCount", "sessionStart", "sessionDuration"],
            (data) => {
                sendResponse(data);
            },
        );
        return true; // Keep channel open for async response
    }

    if (request.action === "resetSession") {
        chrome.storage.local.set({
            sessionStart: Date.now(),
            videoCount: 0,
            sessionDuration: 0,
            maxDuration: 0,
        });
        sendResponse({ success: true });
    }
});

// Reset session on browser startup or after long inactivity
chrome.idle.onStateChanged.addListener((state) => {
    if (state === "locked" || state === "idle") {
        chrome.storage.local.set({
            sessionPaused: true,
            pauseTime: Date.now(),
        });
    }
});
