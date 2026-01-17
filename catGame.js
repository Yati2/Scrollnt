// Cat Jumping Game Module
// Manages the mini-game logic for Scrollnt

class CatJumpingGame {
    constructor(onComplete) {
        this.onComplete = onComplete;
        this.gameActive = false;
        this.gameContainer = null;
    }

    start() {
        if (this.gameActive) return;

        this.gameActive = true;
        console.log("[Scrollnt] Starting jumping game");

        // Create game overlay
        this.gameContainer = document.createElement("div");
        this.gameContainer.id = "scrollnt-jumping-game";
        this.gameContainer.className = "scrollnt-game-overlay";

        this.gameContainer.innerHTML = `
            <div class="scrollnt-game-container">
                <div class="scrollnt-game-header">
                    <h2>🐱 Jump Out of the Scroll! 🐱</h2>
                    <p>Help the cat reach the right side by jumping over obstacles!</p>
                    <div class="scrollnt-game-stats">
                        <span>Progress: <span id="jump-count">0</span>%</span>
                    </div>
                </div>
                <canvas id="game-canvas" width="800" height="400"></canvas>
                <div class="scrollnt-game-instructions">
                    <p>Click or press SPACEBAR to jump</p>
                </div>
            </div>
        `;

        document.body.appendChild(this.gameContainer);

        // Initialize game
        this.initGame();
    }

    initGame() {
        const self = this; // Save reference to class instance
        const canvas = document.getElementById("game-canvas");
        const ctx = canvas.getContext("2d");
        const jumpCountEl = document.getElementById("jump-count");

        // Game state
        const game = {
            cat: {
                x: 20, // Start at left side
                y: 100,
                width: 90,
                height: 90,
                velocityX: 0.3,
                velocityY: 0,
                gravity: 0.8,
                jumpPower: -16,
                isJumping: false,
            },
            obstacles: [], // Stationary obstacles
            obstacleWidth: 50,
            obstacleHeight: 70,
            goalX: 0, // Will be set to canvas.width - 100
        };

        // Calculate ground position (100px above canvas base)
        game.groundY = canvas.height - 100 - game.cat.height;
        game.cat.y = game.groundY; // Start cat on ground
        game.goalX = canvas.width - 100; // Goal line position

        // Load background image
        const bgImage = new Image();
        const bgPath = chrome.runtime.getURL("icons/catgame_bg.jpeg");
        bgImage.src = bgPath;
        let bgLoaded = false;
        bgImage.onload = () => {
            bgLoaded = true;
            console.log("[Scrollnt] Background image loaded");
        };
        bgImage.onerror = () => {
            console.error("[Scrollnt] Failed to load background image");
        };

        // Load cat images
        const catImages = {
            walking: new Image(),
            jumping: new Image(),
            idle: new Image(),
            win: new Image(),
            loaded: false,
        };

        // Use Pinkie Cat assets
        const basePath = chrome.runtime.getURL(
            "cats/Pinkie Cat Animations/Clothing/",
        );

        // Track loading
        let imagesLoaded = 0;
        const checkAllLoaded = () => {
            imagesLoaded++;
            if (imagesLoaded === 4) {
                catImages.loaded = true;
                console.log("[Scrollnt] All cat images loaded");
            }
        };

        catImages.walking.onload = checkAllLoaded;
        catImages.walking.onerror = () => {
            console.error("[Scrollnt] Failed to load walking image");
            checkAllLoaded();
        };
        catImages.jumping.onload = checkAllLoaded;
        catImages.jumping.onerror = () => {
            console.error("[Scrollnt] Failed to load jumping image");
            checkAllLoaded();
        };
        catImages.idle.onload = checkAllLoaded;
        catImages.idle.onerror = () => {
            console.error("[Scrollnt] Failed to load idle image");
            checkAllLoaded();
        };
        catImages.win.onload = checkAllLoaded;
        catImages.win.onerror = () => {
            console.error("[Scrollnt] Failed to load win image");
            checkAllLoaded();
        };

        catImages.walking.src = basePath + "walking.png";
        catImages.jumping.src = basePath + "pink rosado saltando .gif";
        catImages.idle.src = basePath + "pink respirando - ropa.gif";
        catImages.win.src = basePath + "pink volantin.gif";

        // Sprite sheet animation for walking
        let walkingFrame = 0;
        let frameCounter = 0;
        const frameDelay = 20; // Change frame every 5 game loops
        const spriteWidth = 62;
        const spriteHeight = 62;
        const totalFrames = 8;

        let currentCatImage = catImages.walking;

        // Load stone obstacle image
        const stoneImage = new Image();
        const stonePath = chrome.runtime.getURL("icons/stone.png");
        stoneImage.src = stonePath;
        let stoneLoaded = false;
        stoneImage.onload = () => {
            stoneLoaded = true;
            console.log("[Scrollnt] Stone image loaded");
        };
        stoneImage.onerror = () => {
            console.error("[Scrollnt] Failed to load stone image");
        };

        // Create 4 stationary obstacles with random sizes (20px above canvas base)
        const obstaclePositions = [150, 300, 500, 650];
        game.obstacles = obstaclePositions.map((x) => {
            const sizeVariation = 40 + Math.random() * 50; // Random size between 40-90px
            return {
                x: x,
                y: game.groundY + game.cat.height - sizeVariation, // Align obstacle base with ground
                width: sizeVariation,
                height: sizeVariation,
            };
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
            if (!self.gameActive) return;

            // Safety check for canvas
            if (!canvas || !ctx) return;

            // Clear canvas
            try {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            } catch (e) {
                console.error("[Scrollnt] Canvas clear error:", e);
                return;
            }

            // Draw background
            if (bgLoaded && bgImage.complete) {
                ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
            } else {
                // Fallback to solid color if image not loaded
                ctx.fillStyle = "#87CEEB";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Update cat horizontal movement (always moves forward)
            game.cat.x += game.cat.velocityX * 5;

            // Update cat physics (vertical)
            game.cat.velocityY += game.cat.gravity;
            game.cat.y += game.cat.velocityY;

            // Ground collision
            if (game.cat.y >= game.groundY) {
                game.cat.y = game.groundY;
                game.cat.velocityY = 0;
                game.cat.isJumping = false;
                currentCatImage = catImages.walking;
            }

            // Check if cat reached the goal
            if (game.cat.x >= game.goalX) {
                this.gameWon();
                canvas.removeEventListener("click", handleClick);
                document.removeEventListener("keydown", handleKeyPress);
                return;
            }

            // Update progress
            const progressRaw = Math.min(
                100,
                Math.floor((game.cat.x / game.goalX) * 100),
            );
            jumpCountEl.textContent = progressRaw;

            // Draw cat
            if (
                catImages.loaded &&
                currentCatImage.complete &&
                currentCatImage.naturalWidth > 0
            ) {
                try {
                    // If using walking sprite sheet, draw specific frame
                    if (
                        currentCatImage === catImages.walking &&
                        totalFrames > 0
                    ) {
                        // Update animation frame
                        frameCounter++;
                        if (frameCounter >= frameDelay) {
                            frameCounter = 0;
                            walkingFrame = (walkingFrame + 1) % totalFrames;
                        }

                        // Calculate frame position (only first row, left to right)
                        const frameX = walkingFrame * spriteWidth;
                        const frameY = 0; // Always first row

                        ctx.drawImage(
                            currentCatImage,
                            frameX,
                            frameY,
                            spriteWidth,
                            spriteHeight, // Source rectangle
                            game.cat.x,
                            game.cat.y,
                            game.cat.width,
                            game.cat.height, // Destination rectangle
                        );
                    } else {
                        // For other animations (jumping, idle, win), draw normally
                        ctx.drawImage(
                            currentCatImage,
                            game.cat.x,
                            game.cat.y,
                            game.cat.width,
                            game.cat.height,
                        );
                    }
                } catch (e) {
                    // Fallback on draw error
                    ctx.fillStyle = "#FFB6C1";
                    ctx.fillRect(
                        game.cat.x,
                        game.cat.y,
                        game.cat.width,
                        game.cat.height,
                    );
                }
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

            // Draw stationary obstacles
            for (let i = 0; i < game.obstacles.length; i++) {
                const obstacle = game.obstacles[i];

                // Draw obstacle using stone image
                if (stoneLoaded && stoneImage.complete) {
                    try {
                        ctx.drawImage(
                            stoneImage,
                            obstacle.x,
                            obstacle.y,
                            obstacle.width,
                            obstacle.height,
                        );
                    } catch (e) {
                        // Fallback to drawn stone
                        ctx.fillStyle = "#696969";
                        ctx.fillRect(
                            obstacle.x,
                            obstacle.y,
                            obstacle.width,
                            obstacle.height,
                        );
                    }
                } else {
                    // Fallback if image not loaded
                    ctx.fillStyle = "#696969";
                    ctx.fillRect(
                        obstacle.x,
                        obstacle.y,
                        obstacle.width,
                        obstacle.height,
                    );
                }

                // Check collision - only fail if cat lands ON the obstacle (not jumping over it)
                const catBottom = game.cat.y + game.cat.height;
                const catCenterX = game.cat.x + game.cat.width / 2;
                const obstacleTop = obstacle.y;

                // Cat overlaps horizontally with obstacle
                const horizontalOverlap =
                    catCenterX > obstacle.x &&
                    catCenterX < obstacle.x + obstacle.width;

                // Cat is falling down and lands on obstacle
                const landingOnObstacle =
                    horizontalOverlap &&
                    game.cat.velocityY >= 0 && // Falling down
                    catBottom >= obstacleTop &&
                    catBottom <= obstacleTop + 20; // Within landing range

                if (landingOnObstacle) {
                    // HIT! Restart game
                    game.cat.x = 20;
                    game.cat.y = game.groundY;
                    game.cat.velocityY = 0;
                    game.cat.isJumping = false;
                    jumpCountEl.textContent = "0%";
                    console.log("[Scrollnt] Hit obstacle - restarting!");
                    currentCatImage = catImages.walking;
                    walkingFrame = 0;
                    frameCounter = 0;
                    break;
                }
            }

            // Calculate progress percentage (0-100%)
            const progress = Math.min(
                100,
                Math.floor(((game.cat.x - 50) / (game.goalX - 50)) * 100),
            );
            jumpCountEl.textContent = `${progress}%`;

            // Check win condition - cat reached the right side!
            if (game.cat.x >= game.goalX) {
                self.gameWon();
                canvas.removeEventListener("click", handleClick);
                document.removeEventListener("keydown", handleKeyPress);
                return;
            }

            requestAnimationFrame(gameLoop);
        };

        // Start game loop after a small delay to ensure canvas is ready
        setTimeout(() => {
            if (self.gameActive) {
                gameLoop();
            }
        }, 100);
    }

    gameWon() {
        console.log("[Scrollnt] Game won!");
        this.gameActive = false;

        if (this.gameContainer) {
            this.gameContainer.innerHTML = `
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
                    this.gameContainer.remove();
                    if (this.onComplete) {
                        this.onComplete();
                    }
                });
        }
    }
}

// Expose CatJumpingGame to global scope so content.js can access it
window.CatJumpingGame = CatJumpingGame;
