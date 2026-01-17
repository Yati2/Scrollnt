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
        this.autolockManager = new AutolockCard();
        this.loadUserSettings();
    }

    async loadUserSettings() {
        // Prompt for max session duration if not set
        const data = await chrome.storage.local.get(["maxDuration"]);
        if (!data.maxDuration || data.maxDuration < 1) {
            do {
                let input = prompt("Set your max TikTok session duration in minutes (default 60):", "60");
                let val = parseInt(input);
                this.maxDuration = val;
                await chrome.storage.local.set({ maxDuration: val });
            } while (this.maxDuration < 1);
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
        try {
            if (chrome?.storage?.onChanged) {
                chrome.storage.onChanged.addListener((changes, area) => {
                    try {
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
                    } catch (error) {
                        console.warn('[Scrollnt] Error in storage change listener:', error);
                    }
                });
            }
        } catch (error) {
            console.warn('[Scrollnt] Error setting up storage change listener:', error);
        }
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
            articles.forEach((article) => {
                if (!this.observedArticles.has(article)) {
                    this.observedArticles.add(article);
                    this.setupIntersectionObserver(article);

                    // Check if article is already visible (in case page loaded with articles in view)
                    const rect = article.getBoundingClientRect();
                    const isVisible =
                        rect.top < window.innerHeight && rect.bottom > 0;
                    const visibleRatio = isVisible
                        ? Math.min(
                            1,
                            (Math.min(rect.bottom, window.innerHeight) -
                                Math.max(rect.top, 0)) /
                            rect.height,
                        )
                        : 0;

                    if (
                        visibleRatio >= 0.5 &&
                        !this.viewedArticles.has(article)
                    ) {
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
                        entries.forEach((entry) => {
                            if (
                                entry.isIntersecting &&
                                !this.viewedArticles.has(entry.target)
                            ) {
                                this.viewedArticles.add(entry.target);
                                // Increment count instead of using Set size to preserve stored count
                                this.videoCount++;
                                this.saveSessionData();
                                this.checkInterventionNeeded();
                                // Optional: log for debugging
                                console.log(
                                    "[Scrollnt] Article viewed. Total viewed:",
                                    this.videoCount,
                                );
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
        const previousLevel = this.interventionLevel;

        if (duration >= md) {
            this.interventionLevel = 9; // Full Lockdown
        } else if (duration >= (5 / 6) * md) {
            this.interventionLevel = 8; // Viewport shrink + padding + desaturation + zoom drift + Hue Rotation + Reminder 3
        } else if (duration >= (9 / 12) * md) {
            this.interventionLevel = 7; // Viewport shrink + padding + desaturation + zoom drift + Hue Rotation + Challenge 2
        } else if (duration >= (4 / 6) * md) {
            this.interventionLevel = 6; // Viewport shrink + padding + desaturation + zoom drift + Hue Rotation
        } else if (duration >= (7 / 12) * md) {
            this.interventionLevel = 5; // Viewport shrink + padding + desaturation + zoom drift + friction + Reminder 2
        } else if (duration >= (3 / 6) * md) {
            this.interventionLevel = 4; // Viewport shrink + padding + desaturation + zoom drift + Challenge 1
        } else if (duration >= (5 / 12) * md) {
            this.interventionLevel = 3; // Viewport shrink + padding + desaturation + zoom drift
        } else if (duration >= (2 / 6) * md) {
            this.interventionLevel = 2; // Viewport shrink + padding + desaturation + Reminder 1
        } else if (duration >= 0.5) {
            // TESTING: Trigger at 30 seconds instead of (1/6) * md
            this.interventionLevel = 1; // Viewport shrink + padding
        } else {
            this.interventionLevel = 0;
        }

        // Log when intervention level changes
        if (previousLevel !== this.interventionLevel) {
            console.log(`[Scrollnt] ⚠️ Intervention level changed: ${previousLevel} → ${this.interventionLevel} (Duration: ${duration.toFixed(2)} min / Max: ${md} min)`);
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
            console.log('[Scrollnt] Case 0: No interventions - Removing all effects');
            this.removeInterventions();
            return;
        }

        // Apply viewport shrink in all intervention phases (cycles through 1, 2, 3)
        this.applyViewportShrink();

        // Apply other interventions based on level
        switch (this.interventionLevel) {
            case 1:
                // Case 1: padding cycle + viewport shrink (handled above)
                console.log('[Scrollnt] Case 1: Padding cycle + Viewport shrink');
                break;

            case 2:
                // Case 2: tilt + padding cycle + viewport shrink + (reminder commented for now)
                console.log('[Scrollnt] Case 2: Tilt + Padding + Shrink');
                this.applyTiltVideo();
                // this.showReminder(); // Commented as requested
                break;

            case 3:
                // Case 3: tilt + padding cycle + viewport shrink + micro zoom drift
                console.log('[Scrollnt] Case 3: Tilt + Padding + Shrink + Micro Zoom Drift');
                this.applyTiltVideo();
                this.applyMicroZoomDrift();
                break;

            case 4:
                // Case 4: challenge + tilt + padding cycle + viewport shrink + micro zoom drift
                console.log('[Scrollnt] Case 4: Challenge + Tilt + Padding + Shrink + Drift');
                this.applyTiltVideo();
                this.applyMicroZoomDrift();
                this.challengeManager.checkChallengeTrigger(4);
                break;

            case 5:
                // Case 5: desaturation (animated) + micro zoom drift + viewport shrink + padding cycle + tilt + reminder
                console.log('[Scrollnt] Case 5: Desaturation + Drift + Shrink + Padding + Tilt + Reminder');
                this.applyTiltVideo();
                this.applyMicroZoomDrift();
                this.applyDesaturation("animated");
                this.showReminder();
                break;

            case 6:
                // Case 6: desaturation (animated) + micro zoom drift + viewport shrink + padding cycle + tilt + hue rotation
                console.log('[Scrollnt] Case 6: Desaturation + Drift + Shrink + Padding + Tilt + Hue Rotation');
                this.applyTiltVideo();
                this.applyMicroZoomDrift();
                this.applyDesaturation("animated");
                this.applyHueRotation();
                break;

            case 7:
                // Case 7: desaturation (animated) + micro zoom drift + viewport shrink + padding cycle + tilt + hue rotation + challenge
                console.log('[Scrollnt] Case 7: Desaturation + Drift + Shrink + Padding + Tilt + Hue Rotation + Challenge');
                this.applyTiltVideo();
                this.applyMicroZoomDrift();
                this.applyDesaturation("animated");
                this.applyHueRotation();
                this.challengeManager.checkChallengeTrigger(7);
                break;

            case 8:
                // Case 8: desaturation (animated) + micro zoom drift + viewport shrink + padding cycle + tilt + hue rotation + reminder 3
                console.log('[Scrollnt] Case 8: Desaturation + Drift + Shrink + Padding + Tilt + Hue Rotation + Reminder');
                this.applyTiltVideo();
                this.applyMicroZoomDrift();
                this.applyDesaturation("animated");
                this.applyHueRotation();
                this.showReminder();
                break;

            case 9:
                // Case 9: auto lock
                console.log('[Scrollnt] Case 9: Auto Lock');
                this.showAutoLock();
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
                const timeSinceFirstIntervention =
                    duration - firstInterventionTime;
                const currentCycle = Math.floor(
                    timeSinceFirstIntervention / cycleDuration,
                );
                const lastCycle =
                    this.lastShrinkCycleTime >= firstInterventionTime
                        ? Math.floor(
                            (this.lastShrinkCycleTime -
                                firstInterventionTime) /
                            cycleDuration,
                        )
                        : -1;

                // If we're in a new cycle, advance to next shrink level
                if (currentCycle > lastCycle) {
                    this.currentShrinkLevel = (this.currentShrinkLevel % 3) + 1; // Cycle 1->2->3->1
                    this.lastShrinkCycleTime = duration;
                    console.log(
                        `[Scrollnt] Shrink cycled to level ${this.currentShrinkLevel} (at ${duration.toFixed(1)} minutes)`,
                    );
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
            const currentCycle = Math.floor(
                timeSinceFirstIntervention / cycleDuration,
            );
            const lastCycle =
                this.lastPaddingCycleTime >= firstInterventionTime
                    ? Math.floor(
                        (this.lastPaddingCycleTime - firstInterventionTime) /
                        cycleDuration,
                    )
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

    applyTiltVideo() {
        // Apply tilt effect to video containers (Cases 2-8) with randomized rotation
        const videoContainers = document.querySelectorAll('[class*="DivContainer"]');
        videoContainers.forEach(container => {
            if (container.querySelector('video') && !container.classList.contains('scrollnt-tilt-video')) {
                container.classList.add('scrollnt-tilt-video');
                // Randomize tilt between -3 and +3 degrees
                const randomTilt = (Math.random() * 6 - 3).toFixed(2);
                container.style.setProperty('--scrollnt-tilt-angle', `${randomTilt}deg`);
                console.log(`[Scrollnt] Applied random tilt: ${randomTilt}deg to video container`);
            }
        });
    }

    applyDesaturation(type = "animated") {
        // type can be "static" (case 2) or "animated" (cases 5-8)
        const videoContainers = document.querySelectorAll('[class*="DivContainer"]');
        const desaturateClass = type === "animated"
            ? "scrollnt-desaturate-video-animated"
            : "scrollnt-desaturate-video-static";

        videoContainers.forEach(container => {
            if (container.querySelector('video')) {
                // Remove both desaturate classes first
                container.classList.remove("scrollnt-desaturate-video-static", "scrollnt-desaturate-video-animated");
                // Add the appropriate class
                container.classList.add(desaturateClass);
            }
        });
    }

    applyMicroZoomDrift() {
        // Apply zoom drift to html element (Cases 3-8)
        // The CSS will handle combining this with the shrink level
        document.documentElement.classList.add("scrollnt-zoom-drift");
    }

    applyHueRotation() {
        // Apply psychedelic hue rotation effect to video elements (Cases 6-8)
        const videoContainers = document.querySelectorAll('[class*="DivContainer"]');
        videoContainers.forEach((container) => {
            const video = container.querySelector("video");
            if (video) {
                if (!container.classList.contains("scrollnt-hue-rotation-video")) {
                    container.classList.add("scrollnt-hue-rotation-video");
                }
                if (!video.classList.contains("scrollnt-hue-rotation-video")) {
                    video.classList.add("scrollnt-hue-rotation-video");
                    console.log('[Scrollnt] Applied psychedelic hue rotation to video element');
                }
            }
        });
    }

    removeHueRotation() {
        // Remove hue rotation from all video container and video elements
        const videoContainers = document.querySelectorAll('[class*="DivContainer"]');
        videoContainers.forEach((container) => {
            container.classList.remove("scrollnt-hue-rotation-video");
            const video = container.querySelector("video");
            if (video) {
                video.classList.remove("scrollnt-hue-rotation-video");
            }
        });
    }

    removeTilt() {
        // Remove tilt from all video container elements
        const videoContainers = document.querySelectorAll('[class*="DivContainer"]');
        videoContainers.forEach((container) => {
            container.classList.remove("scrollnt-tilt-video");
        });
    }

    removeMicroZoomDrift() {
        // Remove zoom drift from html element
        document.documentElement.classList.remove("scrollnt-zoom-drift");
    }

    showReminder() {
        if (document.querySelector('.scrollnt-reminder')) return;

        const sessionDuration = this.getSessionDuration();
        const reminderCount = chrome.storage.local.get(["reminderCount"]).then(data => data.reminderCount || 0) || 0;
        if (reminderCount <= 3) {
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

    showAutoLock() {
        if (document.querySelector('.scrollnt-autolock')) return;

        const sessionDuration = this.getSessionDuration();
        const reminderCount = chrome.storage.local.get(["reminderCount"]).then(data => data.reminderCount || 0) || 0;
        this.autolockManager.show(this.videoCount, sessionDuration, reminderCount);

        document.body.style.overflow = "hidden";
    }

    removePadding() {
        document.documentElement.classList.remove(
            "scrollnt-viewport-padding-top",
            "scrollnt-viewport-padding-bottom",
        );
    }

    removeDesaturation() {
        const videoContainers = document.querySelectorAll('[class*="DivContainer"]');
        videoContainers.forEach(container => {
            container.classList.remove(
                "scrollnt-desaturate-video-static",
                "scrollnt-desaturate-video-animated"
            );
        });
    }

    removeInterventions() {
        // Remove all viewport-level interventions
        document.documentElement.classList.remove(
            "scrollnt-viewport-shrink-1",
            "scrollnt-viewport-shrink-2",
            "scrollnt-viewport-shrink-3"
        );

        this.removePadding();
        this.removeMicroZoomDrift();

        // Remove all video container interventions
        this.removeTilt();
        this.removeDesaturation();
        this.removeHueRotation();
    }

    startMonitoring() {
        this.checkInterval = setInterval(() => {
            if (!this.sessionPaused) {
                this.checkInterventionNeeded();
            }
        }, 10000);
    }

    startJumpingGame(challengeElement) {
        if (this.catGame || this.gameCompleted) return;

        // Remove all interventions while game is active
        this.removeInterventions();

        // Mark that game is running
        this.gameInProgress = true;

        this.catGame = new CatJumpingGame(challengeElement, async () => {
            this.gameCompleted = true;
            this.catGame = null;
            this.gameInProgress = false;

            // Mark challenge as completed via ChallengeManager
            if (this.challengeManager.currentChallengeLevel !== undefined) {
                this.challengeManager.completedLevels.add(
                    this.challengeManager.currentChallengeLevel,
                );
                await this.challengeManager.saveCompletedLevels();
            }

            // Reapply interventions after game completes
            this.applyIntervention();
        });
        this.catGame.start();
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
