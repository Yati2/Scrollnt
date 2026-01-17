// Scrollnt - Content Script for TikTok
// Tracks user behavior and applies progressive discouragement

class ScrollntTracker {
    constructor() {
        this.sessionStart = Date.now();
        this.videoCount = 0;
        this.swipeSpeed = 0;
        this.lastSwipeTime = 0;
        this.interventionLevel = 0;
        this.checkInterval = null;
    }

    init() {
        console.log("Scrollnt initialized on TikTok");
        this.loadSessionData();
        this.trackScrollBehavior();
        this.startMonitoring();
    }

    async loadSessionData() {
        const data = await chrome.storage.local.get([
            "sessionStart",
            "videoCount",
        ]);
        if (data.sessionStart) {
            this.sessionStart = data.sessionStart;
            this.videoCount = data.videoCount || 0;
        } else {
            await chrome.storage.local.set({
                sessionStart: this.sessionStart,
                videoCount: 0,
            });
        }
    }

    async saveSessionData() {
        await chrome.storage.local.set({
            sessionStart: this.sessionStart,
            videoCount: this.videoCount,
            lastUpdate: Date.now(),
        });
    }

    trackScrollBehavior() {
        // Track swipe/scroll events
        let lastScrollY = window.scrollY;

        window.addEventListener(
            "scroll",
            () => {
                const now = Date.now();
                const timeDiff = now - this.lastSwipeTime;

                if (timeDiff > 0) {
                    this.swipeSpeed =
                        Math.abs(window.scrollY - lastScrollY) / timeDiff;
                }

                lastScrollY = window.scrollY;
                this.lastSwipeTime = now;
            },
            { passive: true },
        );

        // Track video count (observes DOM changes for new videos)
        const observer = new MutationObserver(() => {
            this.detectNewVideo();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    detectNewVideo() {
        // TikTok-specific video detection
        const videos = document.querySelectorAll("video");
        if (videos.length > this.videoCount) {
            this.videoCount = videos.length;
            this.saveSessionData();
            this.checkInterventionNeeded();
        }
    }

    getSessionDuration() {
        return Math.floor((Date.now() - this.sessionStart) / 1000 / 60); // minutes
    }

    checkInterventionNeeded() {
        const duration = this.getSessionDuration();

        // Progressive intervention levels based on your specs
        if (duration >= 30) {
            this.interventionLevel = 3; // Challenge level
        } else if (duration >= 20) {
            this.interventionLevel = 2; // Micro zoom drift + desaturation
        } else if (duration >= 10) {
            this.interventionLevel = 1; // Viewport shrink + desaturation
        } else {
            this.interventionLevel = 0;
        }

        this.applyIntervention();
    }

    applyIntervention() {
        const container =
            document.querySelector(
                '[data-e2e="recommend-list-item-container"]',
            ) || document.body;

        switch (this.interventionLevel) {
            case 1:
                this.applyViewportShrink(container);
                this.applyDesaturation(container);
                break;
            case 2:
                this.applyViewportShrink(container);
                this.applyDesaturation(container);
                this.applyMicroZoomDrift(container);
                this.applyBlur(container);
                this.showReminder();
                break;
            case 3:
                this.applyViewportShrink(container);
                this.applyDesaturation(container);
                this.applyMicroZoomDrift(container);
                this.applyBlur(container);
                this.showChallenge();
                break;
            default:
                this.removeInterventions(container);
        }
    }

    applyViewportShrink(element) {
        element.classList.add("scrollnt-viewport-shrink");
    }

    applyDesaturation(element) {
        element.classList.add("scrollnt-desaturate");
    }

    applyMicroZoomDrift(element) {
        element.classList.add("scrollnt-zoom-drift");
    }

    applyBlur(element) {
        element.classList.add("scrollnt-blur");
    }

    showReminder() {
        if (document.querySelector(".scrollnt-reminder")) return;

        const reminder = document.createElement("div");
        reminder.className = "scrollnt-reminder";
        reminder.innerHTML = `
      <div class="scrollnt-reminder-content">
        <h3>You've watched ${this.videoCount} videos</h3>
        <p>Consider taking a break? 🌟</p>
        <button class="scrollnt-dismiss">Dismiss</button>
      </div>
    `;
        document.body.appendChild(reminder);

        reminder
            .querySelector(".scrollnt-dismiss")
            .addEventListener("click", () => {
                reminder.remove();
            });

        setTimeout(() => {
            if (reminder.parentNode) reminder.remove();
        }, 10000);
    }

    showChallenge() {
        if (document.querySelector(".scrollnt-challenge")) return;

        const challenge = document.createElement("div");
        challenge.className = "scrollnt-challenge";
        challenge.innerHTML = `
      <div class="scrollnt-challenge-content">
        <h2>Time for a Challenge! 🎯</h2>
        <p>You've been scrolling for ${this.getSessionDuration()} minutes</p>
        <p>Complete a quick challenge to continue:</p>
        <div id="scrollnt-challenge-task"></div>
        <button class="scrollnt-challenge-btn">Start Challenge</button>
      </div>
    `;
        document.body.appendChild(challenge);

        this.loadRandomChallenge(challenge);
    }

    loadRandomChallenge(challengeElement) {
        const challenges = [
            "Solve: 15 × 7 = ?",
            'Type "productivity" backwards',
            "Name 3 things you're grateful for today",
            "Do 10 jumping jacks",
        ];

        const randomChallenge =
            challenges[Math.floor(Math.random() * challenges.length)];
        const taskDiv = challengeElement.querySelector(
            "#scrollnt-challenge-task",
        );
        taskDiv.innerHTML = `<p><strong>${randomChallenge}</strong></p>`;
    }

    removeInterventions(element) {
        element.classList.remove(
            "scrollnt-viewport-shrink",
            "scrollnt-desaturate",
            "scrollnt-zoom-drift",
            "scrollnt-blur",
        );
    }

    startMonitoring() {
        this.checkInterval = setInterval(() => {
            this.checkInterventionNeeded();
        }, 60000); // Check every minute
    }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        const tracker = new ScrollntTracker();
        tracker.init();
    });
} else {
    const tracker = new ScrollntTracker();
    tracker.init();
}
