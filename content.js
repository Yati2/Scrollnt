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
        this.lastPaddingCycleTime = 0;
        this.lastShrinkCycleTime = 0;
        this.sessionPaused = false;
        this.pauseStartTime = null;
        this.challengeManager = new ChallengeManager(this);
        this.reminderCardManager = new ReminderCard();
        this.loadUserSettings();
    }

    async loadUserSettings() {
        // Prompt for max session duration if not set
        const data = await chrome.storage.local.get(["maxDuration"]);
        if (!data.maxDuration || data.maxDuration <= 0) {
            do {
                let input = prompt("Set your max TikTok session duration in minutes (default 60, minimum 6):", "60");
                let val = parseInt(input);
                this.maxDuration = val;
                await chrome.storage.local.set({ maxDuration: val });
            } while (this.maxDuration <= 0);
        } else {
            this.maxDuration = data.maxDuration;
        }
    }

    async init() {
        console.log("Scrollnt initialized on TikTok");
        await this.loadSessionData();
        // Only start tracking if sessionPaused is false
        const data = await chrome.storage.local.get(["sessionPaused"]);
        if (!data.sessionPaused) {
            this.startTracking();
        }
        // Listen for sessionPaused changes and start/stop tracking accordingly
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.sessionPaused) {
                this.sessionPaused = changes.sessionPaused.newValue;
                if (changes.pauseStartTime) {
                    this.pauseStartTime = changes.pauseStartTime.newValue;
                }
                if (changes.sessionStart) {
                    this.sessionStart = changes.sessionStart.newValue;
                }

                if (changes.sessionPaused.newValue === false) {
                    this.startTracking();
                } else if (changes.sessionPaused.newValue === true) {
                    this.stopTracking();
                }
            }
        });
    }

    startTracking() {
        this.trackScrollBehavior();
        this.observeArticles();
        this.startMonitoring();
    }

    stopTracking() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        if (this.intersectionObserver) this.intersectionObserver.disconnect();
        this.observedArticles.clear();
        this.viewedArticles.clear();
    }

    async loadSessionData() {
        try {
            const data = await chrome.storage.local.get([
                "sessionStart",
                "videoCount",
                "maxDuration",
                "sessionPaused",
                "pauseStartTime",
            ]);
            if (data.sessionStart) {
                this.sessionStart = data.sessionStart;
                this.videoCount = data.videoCount || 0;
                if (data.maxDuration) this.maxDuration = data.maxDuration;
                this.sessionPaused = data.sessionPaused || false;
                this.pauseStartTime = data.pauseStartTime || null;

                // If session is paused but pauseStartTime is not set, set it now
                if (this.sessionPaused && !this.pauseStartTime) {
                    this.pauseStartTime = Date.now();
                    this.saveSessionData();
                }
            } else {
                await chrome.storage.local.set({
                    sessionStart: this.sessionStart,
                    videoCount: 0,
                    maxDuration: this.maxDuration,
                    sessionPaused: true,
                    pauseStartTime: null,
                });
            }
        } catch (error) {
            console.warn("[Scrollnt] Error loading session data:", error);
        }
    }

    async saveSessionData() {
        try {
            await chrome.storage.local.set({
                sessionStart: this.sessionStart,
                videoCount: this.videoCount,
                lastUpdate: Date.now(),
                maxDuration: this.maxDuration,
                sessionPaused: this.sessionPaused,
                pauseStartTime: this.pauseStartTime,
            });
        } catch (error) {
            console.warn("[Scrollnt] Error saving session data:", error);
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
        chrome.storage.local.get(["sessionPaused"], (data) => {
            if (data.sessionPaused) return;
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
        });
    }

    setupIntersectionObserver(article) {
        if (!this.intersectionObserver) {
            this.intersectionObserver = new IntersectionObserver(
                (entries) => {
                    chrome.storage.local.get(["sessionPaused"], (data) => {
                        if (data.sessionPaused) return;
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
                    });
                },
                {
                    threshold: 0.5,
                    rootMargin: "0px",
                },
            );
        }
        this.intersectionObserver.observe(article);
    }

    getSessionDuration() {
        let elapsedTime = Date.now() - this.sessionStart;

        // If currently paused, subtract the current pause period
        if (this.sessionPaused && this.pauseStartTime) {
            elapsedTime -= (Date.now() - this.pauseStartTime);
        }

        const durationCalc = elapsedTime / 1000 / 60; // minutes

        if (parseInt(durationCalc) <= 0 || this.maxDuration < 6) {
            return durationCalc;
        } else {
            return parseInt(durationCalc);
        }
    }

    checkInterventionNeeded() {
        if (this.sessionPaused) return;
        // Don't apply interventions if challenge is currently showing
        if (document.querySelector(".scrollnt-challenge")) return;
        const duration = this.getSessionDuration();
        const md = this.maxDuration;
        if (duration >= md) {
            this.interventionLevel = 9; // Full Lockdown
        } else if (duration >= (5 / 6) * md) {
            this.interventionLevel = 8; // Viewport shrink + padding + desaturation + zoom drift + friction + Blur + Reminder 3
        } else if (duration >= (9 / 12) * md) {
            this.interventionLevel = 7; // Viewport shrink + padding + desaturation + zoom drift + friction + Blur + Challenge 2
        } else if (duration >= (4 / 6) * md) {
            this.interventionLevel = 6; // Viewport shrink + padding + desaturation + zoom drift + friction + Blur
        } else if (duration >= (7 / 12) * md) {
            this.interventionLevel = 5; // Viewport shrink + padding + desaturation + zoom drift + friction + Reminder 2
        } else if (duration >= (3 / 6) * md) {
            this.interventionLevel = 4; // Viewport shrink + padding + desaturation + zoom drift + Challenge 1
        } else if (duration >= (5 / 12) * md) {
            this.interventionLevel = 3; // Viewport shrink + padding + desaturation + zoom drift
        } else if (duration >= (2 / 6) * md) {
            this.interventionLevel = 2; // Viewport shrink + padding + desaturation + Reminder 1
        } else if (duration >= (1 / 6) * md) {
            this.interventionLevel = 1; // Viewport shrink + padding
        } else {
            this.interventionLevel = 0;
        }
        this.applyIntervention();
        this.checkPaddingCycle();
        this.checkShrinkCycle();
    }

    applyIntervention() {
        // Don't apply interventions while game is active
        if (this.gameInProgress) return;

        const container =
            document.querySelector(
                '[data-e2e="recommend-list-item-container"]',
            ) || document.body;

        if (this.interventionLevel === 0) {
            this.removeInterventions();
            return;
        }

        // Apply viewport shrink in all intervention phases (cycles through 1, 2, 3)
        this.applyViewportShrink();

        // Apply other interventions based on level
        switch (this.interventionLevel) {
            case 1:
                // Padding handled by checkPaddingCycle
                // this.challengeManager.checkChallengeTrigger(1);
                break;
            case 2:
                // Padding handled by checkPaddingCycle
                this.applyDesaturation();
                this.showReminder();
                // Scroll friction temporarily disabled - needs better implementation
                // this.applyScrollFriction();
                // this.challengeManager.checkChallengeTrigger(2);
                break;
            case 3:
                // Padding handled by checkPaddingCycle
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                // Scroll friction temporarily disabled - needs better implementation
                // this.applyScrollFriction();
                // this.challengeManager.checkChallengeTrigger(3);
                break;
            case 4:
                // Padding handled by checkPaddingCycle
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                // Scroll friction temporarily disabled - needs better implementation
                // this.applyScrollFriction();
                this.challengeManager.checkChallengeTrigger(4);
                break;
            case 5:
                // Padding handled by checkPaddingCycle
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                // Scroll friction temporarily disabled - needs better implementation
                // this.applyScrollFriction();
                // this.challengeManager.checkChallengeTrigger(5);
                this.showReminder();
                break;
            case 6:
                // Padding handled by checkPaddingCycle
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                this.applyBlur(container);
                // Scroll friction temporarily disabled - needs better implementation
                // this.applyScrollFriction();
                // this.challengeManager.checkChallengeTrigger(6);
                break;
            case 7:
                // Padding handled by checkPaddingCycle
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                this.applyBlur(container);
                // Scroll friction temporarily disabled - needs better implementation
                // this.applyScrollFriction();
                this.challengeManager.checkChallengeTrigger(7);
                break;
            case 8:
                // Padding handled by checkPaddingCycle
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                this.applyBlur(container);
                // Scroll friction temporarily disabled - needs better implementation
                // this.applyScrollFriction();
                // this.challengeManager.checkChallengeTrigger(8);
                this.showReminder();
                break;
            case 9:
                // Full Lockdown - all interventions
                // Padding handled by checkPaddingCycle
                // this.applyDesaturation();
                // this.applyMicroZoomDrift(container);
                // this.applyBlur(container);
                // this.challengeManager.checkChallengeTrigger(9);
                break;
        }
    }

    applyViewportShrink() {
        this.checkShrinkCycle();

        // Remove all shrink classes first
        document.documentElement.classList.remove(
            "scrollnt-viewport-shrink-1",
            "scrollnt-viewport-shrink-2",
            "scrollnt-viewport-shrink-3",
        );

        // Apply the current shrink level (cycles through 1, 2, 3)
        const shrinkClass = `scrollnt-viewport-shrink-${this.currentShrinkLevel}`;
        document.documentElement.classList.add(shrinkClass);
    }

    checkShrinkCycle() {
        const duration = this.getSessionDuration();
        const md = this.maxDuration;

        // Only cycle if we're in an intervention phase (interventionLevel >= 1)
        if (this.interventionLevel >= 1) {
            // Calculate cycle duration based on intervention phase
            // Cycle every 1/12 of maxDuration (e.g., every 5 minutes for 60 min max)
            const cycleDuration = md / 12;

            // Calculate which cycle we're in (starting from when first intervention activates)
            const firstInterventionTime = md / 6; // First intervention at 1/6 of maxDuration
            if (duration >= firstInterventionTime) {
                const timeSinceFirstIntervention = duration - firstInterventionTime;
                const currentCycle = Math.floor(timeSinceFirstIntervention / cycleDuration);
                const lastCycle = this.lastShrinkCycleTime >= firstInterventionTime
                    ? Math.floor((this.lastShrinkCycleTime - firstInterventionTime) / cycleDuration)
                    : -1;

                // If we're in a new cycle, advance to next shrink level
                if (currentCycle > lastCycle) {
                    this.currentShrinkLevel = ((this.currentShrinkLevel) % 3) + 1; // Cycle 1->2->3->1
                    this.lastShrinkCycleTime = duration;
                    console.log(`[Scrollnt] Shrink cycled to level ${this.currentShrinkLevel} (at ${duration.toFixed(1)} minutes)`);
                }
            }
        } else {
            // Reset to level 1 when no intervention is active
            this.currentShrinkLevel = 1;
            this.lastShrinkCycleTime = 0;
        }
    }

    checkPaddingCycle() {
        const duration = this.getSessionDuration();
        const md = this.maxDuration;

        // Padding starts when first intervention activates (1/6 of maxDuration)
        const firstInterventionTime = md / 6;

        if (duration >= firstInterventionTime) {
            // Calculate cycle duration based on maxDuration
            // Cycle every 1/12 of maxDuration (e.g., every 5 minutes for 60 min max)
            const cycleDuration = md / 12;

            // Calculate which cycle we're in (starting from first intervention)
            const timeSinceFirstIntervention = duration - firstInterventionTime;
            const currentCycle = Math.floor(timeSinceFirstIntervention / cycleDuration);
            const lastCycle = this.lastPaddingCycleTime >= firstInterventionTime
                ? Math.floor((this.lastPaddingCycleTime - firstInterventionTime) / cycleDuration)
                : -1;

            // If we're in a new cycle, or haven't initialized yet, cycle the padding
            if (currentCycle > lastCycle || this.currentPaddingSide === null) {
                this.cyclePadding();
                this.lastPaddingCycleTime = duration;
            }
        } else if (duration < firstInterventionTime) {
            // Remove padding if we're below first intervention time
            this.removePadding();
            this.currentPaddingSide = null;
            this.lastPaddingCycleTime = 0;
        }
    }

    cyclePadding() {
        // Remove all padding classes
        document.documentElement.classList.remove(
            "scrollnt-viewport-padding-top",
            "scrollnt-viewport-padding-bottom",
        );

        // Toggle between top and bottom
        if (this.currentPaddingSide === "top") {
            this.currentPaddingSide = "bottom";
        } else {
            this.currentPaddingSide = "top";
        }

        const paddingClass = `scrollnt-viewport-padding-${this.currentPaddingSide}`;
        document.documentElement.classList.add(paddingClass);

        const duration = this.getSessionDuration();
        console.log(
            `[Scrollnt] Padding cycled to: ${this.currentPaddingSide} (at ${duration.toFixed(1)} minutes)`,
        );
    }

    applyViewportPadding() {
        // This method is called from applyIntervention, but actual padding logic
        // is handled in checkPaddingCycle which is called from checkInterventionNeeded
        // This method is kept for consistency with the intervention structure
    }

    applyDesaturation() {
        // Use desaturate-1 (static) for case 2, desaturate-2 (disco) for case 5
        if (this.interventionLevel === 5) {
            document.documentElement.classList.add("scrollnt-desaturate-2");
        } else {
            document.documentElement.classList.add("scrollnt-desaturate-1");
        }
    }

    applyMicroZoomDrift(element) {
        element.classList.add("scrollnt-zoom-drift");
    }

    applyBlur(element) {
        const videoContainers = document.querySelectorAll('[class*="DivContainer"]');
        videoContainers.forEach(container => {
            if (container.querySelector('video') && !container.classList.contains("scrollnt-blur-video")) {
                container.classList.add("scrollnt-blur-video");
            }
        });
    }

    removeBlur() {
        // Remove blur from all video container elements
        const videoContainers = document.querySelectorAll('[class*="DivContainer"]');
        videoContainers.forEach(container => {
            container.classList.remove("scrollnt-blur-video");
        });
    }

    showReminder() {
        if (document.querySelector('.scrollnt-reminder')) return;

        const sessionDuration = this.getSessionDuration();
        const reminderCount = chrome.storage.local.get(["reminderCount"]).then(data => data.reminderCount || 0) || 0;
        if (reminderCount <= 2) {
            this.reminderCount = reminderCount + 1;
            chrome.storage.local.set({ reminderCount: this.reminderCount });
        }
        this.reminderCardManager.show(this.videoCount, sessionDuration, this.reminderCount);
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

        const selectedChallenge = this.loadRandomChallenge(challenge);

        // Handle challenge button click
        const startBtn = challenge.querySelector(".scrollnt-challenge-btn");
        startBtn.addEventListener("click", () => {
            if (selectedChallenge === "game") {
                // Remove challenge modal and start game
                challenge.remove();
                this.startJumpingGame();
            } else {
                // For other challenges, just remove the modal
                challenge.remove();
            }
        });
    }

    loadRandomChallenge(challengeElement) {
        const challenges = [
            // TESTING: Other challenges commented out
            // { text: "Complete 3 rounds of CAPTCHA", type: "text" },
            { text: "Play the cat jumping game 🐱", type: "game" },
            // {
            //     text: "Memory Test: Recall the last 3 videos you watched",
            //     type: "text",
            // },
            // { text: "Solve: 15 × 7 = ?", type: "text" },
            // {
            //     text: "Watch yare yare, it's time to go to bed kekekeke",
        ];

        const randomChallenge =
            challenges[Math.floor(Math.random() * challenges.length)];
        const taskDiv = challengeElement.querySelector(
            "#scrollnt-challenge-task",
        );
        taskDiv.innerHTML = `<p><strong>${randomChallenge.text}</strong></p>`;

        return randomChallenge.type;
    }

    removePadding() {
        document.documentElement.classList.remove(
            "scrollnt-viewport-padding-top",
            "scrollnt-viewport-padding-bottom",
        );
    }

    removeDesaturation() {
        document.documentElement.classList.remove("scrollnt-desaturate-1", "scrollnt-desaturate-2");
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
            "scrollnt-desaturate-1",
            "scrollnt-desaturate-2",
        );
        this.removePadding();
        this.removeBlur();
        container.classList.remove(
            "scrollnt-zoom-drift",
        );
    }

    startMonitoring() {
        this.checkInterval = setInterval(() => {
            if (!this.sessionPaused) {
                this.checkInterventionNeeded();
            }
        }, 30000); // Check every 30 seconds to catch 1.5 and 2-minute intervals accurately
    }

    startJumpingGame() {
        if (this.catGame || this.gameCompleted) return;

        // Remove all interventions while game is active
        this.removeInterventions();

        // Mark that game is running
        this.gameInProgress = true;

        this.catGame = new CatJumpingGame(() => {
            this.gameCompleted = true;
            this.catGame = null;
            this.gameInProgress = false;
            // Reapply interventions after game completes
            this.applyIntervention();
        });
        this.catGame.start();
    }

    showAutoLock() {
        if (document.querySelector(".scrollnt-autolock")) return;

        const lockScreen = document.createElement("div");
        lockScreen.className = "scrollnt-autolock";
        lockScreen.innerHTML = `
            <div class="scrollnt-autolock-content">
                <h2>🔒 Auto-Lock Activated</h2>
                <p>You've been scrolling for 60 minutes.</p>
                <p>Time to take a break! 🌙</p>
                <div class="scrollnt-autolock-timer">
                    <p>This session has ended.</p>
                </div>
            </div>
        `;
        document.body.appendChild(lockScreen);

        // Disable scrolling
        document.body.style.overflow = "hidden";
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
