// Scrollnt - Content Script for TikTok
// Tracks user behavior and applies progressive discouragement

class ScrollntTracker {
    observedArticles = new Set();
    viewedArticles = new Set();
    constructor() {
        this.sessionStart = Date.now();
        this.videoCount = 0;
        this.swipeSpeed = 0;
        this.lastSwipeTime = 0;
        this.interventionLevel = 0;
        this.checkInterval = null;
        this.currentPaddingSide = null;
        this.lastPaddingCycleTime = 0; // Track when padding was last cycled (in minutes)
        this.gameCompleted = false;
        this.catGame = null;
        this.challengeShownStages = new Set(); // Track which stages have shown challenges
        this.gameInProgress = false; // Track if game is currently active
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
            ]);
            if (data.sessionStart) {
                this.sessionStart = data.sessionStart;
                this.videoCount = data.videoCount || 0;
                console.log("[Scrollnt] Loaded session data:", {
                    sessionStart: new Date(
                        this.sessionStart,
                    ).toLocaleTimeString(),
                    videoCount: this.videoCount,
                });
            } else {
                await chrome.storage.local.set({
                    sessionStart: this.sessionStart,
                    videoCount: 0,
                });
            }
        } catch (error) {
            console.warn("[Scrollnt] Error loading session data:", error);
            // Continue with default values
        }
    }

    async saveSessionData() {
        try {
            await chrome.storage.local.set({
                sessionStart: this.sessionStart,
                videoCount: this.videoCount,
                lastUpdate: Date.now(),
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
        return Math.floor((Date.now() - this.sessionStart) / 1000 / 60); // minutes
    }

    checkInterventionNeeded() {
        const duration = this.getSessionDuration();

        // TESTING: Trigger challenge at 1 minute instead of 30
        // Stage progression based on duration
        // Stage 1: 10 mins (1 min)
        // Stage 2: 20 mins (2 mins)
        // Stage 3: 25 mins (2.5 mins)
        // Stage 4: 30 mins (3 mins) - Challenge
        // Stage 5: 35 mins (3.5 mins)
        // Stage 6: 40 mins (4 mins)
        // Stage 7: 45 mins (4.5 mins) - Challenge
        // Stage 8: 50 mins (5 mins)
        // Stage 9: 60 mins (6 mins) - Auto-lock

        if (duration >= 60) {
            this.interventionLevel = 9; // Auto-lock
        } else if (duration >= 50) {
            this.interventionLevel = 8; // Reminder 3
        } else if (duration >= 45) {
            this.interventionLevel = 7; // Challenge 2
        } else if (duration >= 40) {
            this.interventionLevel = 6; // Blur videos
        } else if (duration >= 35) {
            this.interventionLevel = 5; // Friction + Reminder 2
        } else if (duration >= 0.5) {
            // TESTING: Changed from 30 to 1
            this.interventionLevel = 4; // UI Issue + Challenge 1
        } else if (duration >= 25) {
            this.interventionLevel = 3; // Micro zoom drift
        } else if (duration >= 20) {
            this.interventionLevel = 2; // Desaturation + Reminder 1
        } else if (duration >= 10) {
            this.interventionLevel = 1; // Viewport shrink + padding
        } else {
            this.interventionLevel = 0;
        }

        this.applyIntervention();
        this.checkPaddingCycle();
    }

    applyIntervention() {
        // Don't apply interventions while game is active
        if (this.gameInProgress) return;

        const container =
            document.querySelector(
                '[data-e2e="recommend-list-item-container"]',
            ) || document.body;

        switch (this.interventionLevel) {
            case 0:
                this.removeInterventions();
                break;
            case 1: // Stage 1: 10 mins - Viewport shrink + padding
                this.applyViewportShrink();
                break;
            case 2: // Stage 2: 20 mins - Desaturation + Reminder 1
                this.applyViewportShrink();
                this.applyDesaturation();
                this.showReminder();
                break;
            case 3: // Stage 3: 25 mins - Micro zoom drift
                this.applyViewportShrink();
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                break;
            case 4: // Stage 4: 30 mins - UI Issue + Challenge
                this.applyViewportShrink();
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                if (!this.challengeShownStages.has(4)) {
                    this.showChallenge(4);
                    this.challengeShownStages.add(4);
                }
                break;
            case 5: // Stage 5: 35 mins - Friction + Reminder 2
                this.applyViewportShrink();
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                this.showReminder();
                break;
            case 6: // Stage 6: 40 mins - Blur videos
                this.applyViewportShrink();
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                this.applyBlur(container);
                break;
            case 7: // Stage 7: 45 mins - Challenge 2
                this.applyViewportShrink();
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                this.applyBlur(container);
                if (!this.challengeShownStages.has(7)) {
                    this.showChallenge(7);
                    this.challengeShownStages.add(7);
                }
                break;
            case 8: // Stage 8: 50 mins - Reminder 3
                this.applyViewportShrink();
                this.applyDesaturation();
                this.applyMicroZoomDrift(container);
                this.applyBlur(container);
                this.showReminder();
                break;
            case 9: // Stage 9: 60 mins - Auto-lock
                this.showAutoLock();
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
            "scrollnt-viewport-shrink-3",
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
            const currentCycle = Math.floor(
                (duration - cycleStart) / cycleDuration,
            );
            const lastCycle =
                this.lastPaddingCycleTime >= cycleStart
                    ? Math.floor(
                          (this.lastPaddingCycleTime - cycleStart) /
                              cycleDuration,
                      )
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
            "scrollnt-desaturate",
        );
        this.removePadding();
        container.classList.remove("scrollnt-zoom-drift", "scrollnt-blur");
    }

    startMonitoring() {
        this.checkInterval = setInterval(() => {
            this.checkInterventionNeeded();
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
