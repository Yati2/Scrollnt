// Scrollnt - Background Service Worker
// Handles data persistence and cross-tab communication

chrome.runtime.onInstalled.addListener(() => {
    console.log("Scrollnt extension installed");

    // Initialize storage
    chrome.storage.local.set({
        sessionStart: 0,
        videoCount: 0,
        maxDuration: 0, // default max duration in minutes
        sessionPaused: true,
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateStats") {
        // Only update sessionPaused if explicitly sent, preserve maxDuration
        chrome.storage.local.get(["maxDuration"], (data) => {
            chrome.storage.local.set({
                videoCount: request.videoCount,
                sessionDuration: request.sessionDuration,
                lastUpdate: Date.now(),
                maxDuration: data.maxDuration || request.maxDuration,
                sessionPaused: request.sessionPaused,
            });
        });
    }

    if (request.action === "getStats") {
        chrome.storage.local.get(
            ["videoCount", "sessionStart", "sessionDuration", "maxDuration", "sessionPaused"],
            (data) => {
                sendResponse(data);
            },
        );
        return true; // Keep channel open for async response
    }

    if (request.action === "resetSession") {
        chrome.storage.local.get(["maxDuration"], (data) => {
            chrome.storage.local.set({
                sessionStart: Date.now(),
                videoCount: 0,
                sessionDuration: 0,
                maxDuration: 0,
                sessionPaused: true,
            });
            sendResponse({ success: true });
        });
        return true;
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
