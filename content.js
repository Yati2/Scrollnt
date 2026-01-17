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
        this.gameActive = false;
        this.gameCompleted = false;
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

        // Check for 30-minute jumping game intervention
        if (duration >= 30 && !this.gameCompleted && !this.gameActive) {
            this.startJumpingGame();
            return;
        }

        // Progressive intervention levels based on your specs
        if (duration >= 3) {
            this.interventionLevel = 3; // Challenge level
        } else if (duration >= 2) {
            this.interventionLevel = 2; // Micro zoom drift + desaturation
        } else if (duration >= 1) {
            this.interventionLevel = 1; // Viewport shrink + desaturation
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
                this.showChallenge();
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
        if (this.gameActive || this.gameCompleted) return;

        this.gameActive = true;
        console.log("[Scrollnt] Starting jumping game at 30 minutes");

        // Create game overlay
        const gameContainer = document.createElement("div");
        gameContainer.id = "scrollnt-jumping-game";
        gameContainer.className = "scrollnt-game-overlay";

        gameContainer.innerHTML = `
            <div class="scrollnt-game-container">
                <div class="scrollnt-game-header">
                    <h2>🐱 Jump Out of the Scroll! 🐱</h2>
                    <p>Help the cat jump over 3 platforms to unlock scrolling</p>
                    <div class="scrollnt-game-stats">
                        <span>Jumps: <span id="jump-count">0</span>/3</span>
                    </div>
                </div>
                <canvas id="game-canvas" width="800" height="400"></canvas>
                <div class="scrollnt-game-instructions">
                    <p>Click or press SPACEBAR to jump</p>
                </div>
            </div>
        `;

        document.body.appendChild(gameContainer);

        // Initialize game
        this.initGame();
    }

    initGame() {
        const canvas = document.getElementById("game-canvas");
        const ctx = canvas.getContext("2d");
        const jumpCountEl = document.getElementById("jump-count");

        // Game state
        const game = {
            cat: {
                x: 100,
                y: 300,
                width: 60,
                height: 60,
                velocityY: 0,
                gravity: 0.6,
                jumpPower: -12,
                isJumping: false,
            },
            platforms: [],
            successfulJumps: 0,
            gameSpeed: 3,
            spawnTimer: 0,
            spawnInterval: 100,
            groundY: 340,
        };

        // Load cat images
        const catImages = {
            jumping: new Image(),
            idle: new Image(),
            win: new Image(),
        };

        // Use Pinkie Cat assets
        const basePath = chrome.runtime.getURL(
            "cats/Pinkie Cat Animations/Clothing/",
        );
        catImages.jumping.src = basePath + "pink rosado saltando .gif";
        catImages.idle.src = basePath + "pink respirando - ropa.gif";
        catImages.win.src = basePath + "pink volantin.gif";

        let currentCatImage = catImages.idle;

        // Create initial platform
        game.platforms.push({
            x: canvas.width,
            y: game.groundY,
            width: 100,
            height: 20,
            passed: false,
        });

        // Input handling
        const jump = () => {
            if (!game.cat.isJumping) {
                game.cat.velocityY = game.cat.jumpPower;
                game.cat.isJumping = true;
                currentCatImage = catImages.jumping;
            }
        };

        const handleClick = (e) => {
            jump();
        };

        const handleKeyPress = (e) => {
            if (e.code === "Space") {
                e.preventDefault();
                jump();
            }
        };

        canvas.addEventListener("click", handleClick);
        document.addEventListener("keydown", handleKeyPress);

        // Game loop
        const gameLoop = () => {
            if (!this.gameActive) return;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw background
            ctx.fillStyle = "#87CEEB";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw ground
            ctx.fillStyle = "#8B7355";
            ctx.fillRect(
                0,
                game.groundY + game.cat.height,
                canvas.width,
                canvas.height - game.groundY - game.cat.height,
            );

            // Draw safe zone indicator
            ctx.fillStyle = "rgba(144, 238, 144, 0.3)";
            ctx.fillRect(0, 0, 150, canvas.height);
            ctx.fillStyle = "#2d5016";
            ctx.font = "16px Arial";
            ctx.fillText("Safe Zone 🌿", 20, 30);

            // Update cat physics
            game.cat.velocityY += game.cat.gravity;
            game.cat.y += game.cat.velocityY;

            // Ground collision
            if (game.cat.y >= game.groundY) {
                game.cat.y = game.groundY;
                game.cat.velocityY = 0;
                game.cat.isJumping = false;
                currentCatImage = catImages.idle;
            }

            // Draw cat
            if (catImages.idle.complete) {
                ctx.drawImage(
                    currentCatImage,
                    game.cat.x,
                    game.cat.y,
                    game.cat.width,
                    game.cat.height,
                );
            } else {
                // Fallback if images not loaded
                ctx.fillStyle = "#FFB6C1";
                ctx.fillRect(
                    game.cat.x,
                    game.cat.y,
                    game.cat.width,
                    game.cat.height,
                );
            }

            // Spawn platforms
            game.spawnTimer++;
            if (
                game.spawnTimer > game.spawnInterval &&
                game.platforms.length < 3
            ) {
                game.platforms.push({
                    x: canvas.width,
                    y: game.groundY,
                    width: 100,
                    height: 20,
                    passed: false,
                });
                game.spawnTimer = 0;
            }

            // Update and draw platforms
            for (let i = game.platforms.length - 1; i >= 0; i--) {
                const platform = game.platforms[i];
                platform.x -= game.gameSpeed;

                // Draw platform
                ctx.fillStyle = "#654321";
                ctx.fillRect(
                    platform.x,
                    platform.y,
                    platform.width,
                    platform.height,
                );
                ctx.fillStyle = "#90EE90";
                ctx.fillRect(platform.x, platform.y - 5, platform.width, 5);

                // Check if cat jumped over platform
                if (
                    !platform.passed &&
                    platform.x + platform.width < game.cat.x
                ) {
                    platform.passed = true;
                    game.successfulJumps++;
                    jumpCountEl.textContent = game.successfulJumps;

                    console.log(
                        "[Scrollnt] Successful jump:",
                        game.successfulJumps,
                    );

                    // Check win condition
                    if (game.successfulJumps >= 3) {
                        this.gameWon();
                        canvas.removeEventListener("click", handleClick);
                        document.removeEventListener("keydown", handleKeyPress);
                        return;
                    }
                }

                // Check collision (game over)
                if (
                    platform.x < game.cat.x + game.cat.width &&
                    platform.x + platform.width > game.cat.x &&
                    platform.y < game.cat.y + game.cat.height &&
                    platform.y + platform.height > game.cat.y
                ) {
                    // Collision detected - reset
                    game.successfulJumps = 0;
                    jumpCountEl.textContent = game.successfulJumps;
                    game.platforms = [];
                    game.cat.y = game.groundY;
                    game.cat.velocityY = 0;
                    game.spawnTimer = 0;
                    console.log("[Scrollnt] Hit platform - resetting");
                }

                // Remove off-screen platforms
                if (platform.x + platform.width < 0) {
                    game.platforms.splice(i, 1);
                }
            }

            requestAnimationFrame(gameLoop);
        };

        gameLoop();
    }

    gameWon() {
        console.log("[Scrollnt] Game won!");
        this.gameActive = false;
        this.gameCompleted = true;

        const gameContainer = document.getElementById("scrollnt-jumping-game");
        if (gameContainer) {
            gameContainer.innerHTML = `
                <div class="scrollnt-game-container">
                    <div class="scrollnt-game-victory">
                        <h2>🎉 You Did It! 🎉</h2>
                        <p>The cat made it to safety!</p>
                        <p>You can continue scrolling now.</p>
                        <button id="close-game-btn" class="scrollnt-game-button">Continue</button>
                    </div>
                </div>
            `;

            document
                .getElementById("close-game-btn")
                .addEventListener("click", () => {
                    gameContainer.remove();
                });
        }
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
