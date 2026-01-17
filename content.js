// Scrollnt - Content Script for TikTok
// Tracks user behavior and applies progressive discouragement

class ScrollntTracker {
    observedArticles = new Set();
    viewedArticles = new Set();
    constructor() {
        this.sessionStart = Date.now();
        this.maxDuration = 60; // in minutes (default)
        this.videoCount = 0;
        this.swipeSpeed = 0;
        this.lastSwipeTime = 0;
        this.interventionLevel = 0;
        this.checkInterval = null;
        this.currentPaddingSide = null;
        this.lastPaddingCycleTime = 0; // Track when padding was last cycled (in minutes)
        this.loadUserSettings();
    }

    async loadUserSettings() {
        // Prompt for max session duration if not set
        const data = await chrome.storage.local.get(["maxDuration"]);
        if (!data.maxDuration || data.maxDuration <= 0) {
            let input = prompt("Set your max TikTok session duration in minutes (default 60):", "60");
            let val = parseInt(input);
            if (isNaN(val) || val <= 0) val = 60;
            this.maxDuration = val;
            await chrome.storage.local.set({ maxDuration: val });
        } else {
            this.maxDuration = data.maxDuration;
        }
    }

    init() {
        console.log("Scrollnt initialized on TikTok");
        this.loadSessionData();
        this.trackScrollBehavior();
        this.observeArticles();
        this.startMonitoring();
    }

    async loadSessionData() {
        try {
            const data = await chrome.storage.local.get([
                "sessionStart",
                "videoCount",
                "maxDuration",
            ]);
            if (data.sessionStart) {
                this.sessionStart = data.sessionStart;
                this.videoCount = data.videoCount || 0;
                if (data.maxDuration) this.maxDuration = data.maxDuration;
                console.log('[Scrollnt] Loaded session data:', {
                    sessionStart: new Date(this.sessionStart).toLocaleTimeString(),
                    videoCount: this.videoCount,
                    maxDuration: this.maxDuration
                });
            } else {
                await chrome.storage.local.set({
                    sessionStart: this.sessionStart,
                    videoCount: 0,
                    maxDuration: this.maxDuration,
                });
            }
        } catch (error) {
            console.warn('[Scrollnt] Error loading session data:', error);
            // Continue with default values
        }
    }

    async saveSessionData() {
        try {
            await chrome.storage.local.set({
                sessionStart: this.sessionStart,
                videoCount: this.videoCount,
                lastUpdate: Date.now(),
                maxDuration: this.maxDuration,
            });
        } catch (error) {
            console.warn('[Scrollnt] Error saving session data:', error);
        }
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

        // Track new articles (videos) added to DOM
        const observer = new MutationObserver(() => {
            this.observeArticles();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    observeArticles() {
        // Find all TikTok articles (each video is wrapped in an article)
        const articles = document.querySelectorAll("article");
        articles.forEach(article => {
            if (!this.observedArticles.has(article)) {
                this.observedArticles.add(article);
                this.setupIntersectionObserver(article);

                // Check if article is already visible (in case page loaded with articles in view)
                const rect = article.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
                const visibleRatio = isVisible ? Math.min(1, (Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)) / rect.height) : 0;

                if (visibleRatio >= 0.5 && !this.viewedArticles.has(article)) {
                    // Article is already visible and meets threshold
                    this.viewedArticles.add(article);
                    this.videoCount++;
                    this.saveSessionData();
                    this.checkInterventionNeeded();
                }
            }
        });
    }

    setupIntersectionObserver(article) {
        if (!this.intersectionObserver) {
            this.intersectionObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && !this.viewedArticles.has(entry.target)) {
                            this.viewedArticles.add(entry.target);
                            // Increment count instead of using Set size to preserve stored count
                            this.videoCount++;
                            this.saveSessionData();
                            this.checkInterventionNeeded();
                            // Optional: log for debugging
                            console.log('[Scrollnt] Article viewed. Total viewed:', this.videoCount);
                        }
                    });
                },
                {
                    threshold: 0.5,
                    rootMargin: '0px'
                }
            );
        }
        this.intersectionObserver.observe(article);
    }


    getSessionDuration() {
        return Math.floor((Date.now() - this.sessionStart) / 1000 / 60); // minutes
    }

    checkInterventionNeeded() {
        const duration = this.getSessionDuration();
        const md = this.maxDuration;
        if (duration >= md) {
            this.interventionLevel = 9; // Full Lockdown
        } else if (duration >= (5/6) * md) {
            this.interventionLevel = 8; // Viewport shrink + padding + desaturation + zoom drift + friction + Blur + Reminder 2
        } else if (duration >= (9/12) * md) {
            this.interventionLevel = 7; // Viewport shrink + padding + desaturation + zoom drift + friction + Blur + Challenge 2
        } else if (duration >= (4/6) * md) {
            this.interventionLevel = 6; // Viewport shrink + padding + desaturation + zoom drift + friction + Blur
        } else if (duration >= (7/12) * md) {
            this.interventionLevel = 5; // Viewport shrink + padding + desaturation + zoom drift + friction + Reminder 2
        } else if (duration >= (3/6) * md) {
            this.interventionLevel = 4; // Viewport shrink + padding + desaturation + zoom drift + Challenge 1
        } else if (duration >= (5/12) * md) {
            this.interventionLevel = 3; // Viewport shrink + padding + desaturation + zoom drift
        } else if (duration >= (2/6) * md) {
            this.interventionLevel = 2; // Viewport shrink + padding + desaturation + Reminder 1
        } else if (duration >= (1/6) * md) {
            this.interventionLevel = 1; // Viewport shrink + padding
        } else {
            this.interventionLevel = 0;
        }
        this.applyIntervention();
        this.checkPaddingCycle();
    }

    applyIntervention() {
        const container =
            document.querySelector(
                '[data-e2e="recommend-list-item-container"]',
            ) || document.body;

        switch (this.interventionLevel) {
            case 1:
                this.applyViewportShrink();
                this.applyViewportPaddingTop();
                this.applyDesaturation();
                break;
            case 2:
                this.applyViewportShrink();
                this.applyViewportPadding();
                this.applyDesaturation();
                break;
            case 3:
                this.applyViewportShrink();
                this.applyViewportPadding();
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                break;
            default:
                this.removeInterventions();
        }
    }

    applyViewportShrink() {
        // Remove all shrink classes first
        document.documentElement.classList.remove(
            "scrollnt-viewport-shrink-1",
            "scrollnt-viewport-shrink-2",
            "scrollnt-viewport-shrink-3"
        );

        // Apply the appropriate shrink level based on intervention level
        const shrinkClass = `scrollnt-viewport-shrink-${this.interventionLevel}`;
        document.documentElement.classList.add(shrinkClass);
    }

    checkPaddingCycle() {
        const duration = this.getSessionDuration();

        // Padding starts at 1.5 minutes and cycles every 2 minutes
        if (duration >= 1.5) {
            // Calculate which 2-minute cycle we're in (starting from 1.5 minutes)
            // Cycle 0: 1.5-3.5 min, Cycle 1: 3.5-5.5 min, Cycle 2: 5.5-7.5 min, etc.
            const cycleStart = 1.5;
            const cycleDuration = 2.0;
            const currentCycle = Math.floor((duration - cycleStart) / cycleDuration);
            const lastCycle = this.lastPaddingCycleTime >= cycleStart
                ? Math.floor((this.lastPaddingCycleTime - cycleStart) / cycleDuration)
                : -1;

            // If we're in a new cycle, or haven't initialized yet, cycle the padding
            if (currentCycle > lastCycle || this.currentPaddingSide === null) {
                this.cyclePadding();
                this.lastPaddingCycleTime = duration;
            }
        } else if (duration < 1.5) {
            // Remove padding if we're below 1.5 minutes
            this.removePadding();
            this.currentPaddingSide = null;
            this.lastPaddingCycleTime = 0;
        }
    }

    cyclePadding() {
        // Remove all padding classes
        document.documentElement.classList.remove(
            "scrollnt-viewport-padding-top",
            "scrollnt-viewport-padding-bottom"
        );

        // Toggle between top and bottom
        if (this.currentPaddingSide === 'top') {
            this.currentPaddingSide = 'bottom';
        } else {
            this.currentPaddingSide = 'top';
        }

        const paddingClass = `scrollnt-viewport-padding-${this.currentPaddingSide}`;
        document.documentElement.classList.add(paddingClass);

        const duration = this.getSessionDuration();
        console.log(`[Scrollnt] Padding cycled to: ${this.currentPaddingSide} (at ${duration.toFixed(1)} minutes)`);
    }

    applyViewportPadding() {
        // This method is called from applyIntervention, but actual padding logic
        // is handled in checkPaddingCycle which is called from checkInterventionNeeded
        // This method is kept for consistency with the intervention structure
    }

    applyDesaturation() {
        document.documentElement.classList.add("scrollnt-desaturate");
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

    removePadding() {
        document.documentElement.classList.remove(
            "scrollnt-viewport-padding-top",
            "scrollnt-viewport-padding-bottom"
        );
    }

    removeDesaturation() {
        document.documentElement.classList.remove("scrollnt-desaturate");
    }

    removeInterventions() {
        const container =
            document.querySelector(
                '[data-e2e="recommend-list-item-container"]',
            ) || document.body;

        document.documentElement.classList.remove(
            "scrollnt-viewport-shrink-1",
            "scrollnt-viewport-shrink-2",
            "scrollnt-viewport-shrink-3",
            "scrollnt-desaturate"
        );
        this.removePadding();
        container.classList.remove(
            "scrollnt-zoom-drift",
            "scrollnt-blur",
        );
    }

    startMonitoring() {
        this.checkInterval = setInterval(() => {
            this.checkInterventionNeeded();
        }, 30000); // Check every 30 seconds to catch 1.5 and 2-minute intervals accurately
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
