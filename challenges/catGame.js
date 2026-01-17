// Cat Jumping Game Module
// Manages the mini-game logic for Scrollnt

class CatJumpingGame {
    constructor(challengeElement, onComplete) {
        this.challengeElement = challengeElement;
        this.onComplete = onComplete;
        this.gameActive = false;
        this.gameContainer = null;
    }

    start() {
        if (this.gameActive) return;

        this.gameActive = true;
        console.log("[Scrollnt] Starting jumping game");

        // Use the existing challenge element instead of creating new overlay
        const taskDiv = this.challengeElement.querySelector(
            "#scrollnt-challenge-task",
        );

        taskDiv.innerHTML = `
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

        console.log("[Scrollnt] Game content inserted into challenge wrapper");

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
                x: 20,
                y: 100,
                width: 90,
                height: 90,
                velocityX: 0.2,
                velocityY: 0,
                gravity: 0.8,
                jumpPower: -16,
                isJumping: false,
            },
            obstacles: [],
            obstacleWidth: 50,
            obstacleHeight: 70,
            goalX: 0,
        };

        // Calculate ground position (same as obstacles - 20px above canvas base)
        game.groundY = canvas.height - 400;
        game.cat.y = game.groundY;
        game.goalX = canvas.width - 100;

        console.log(
            "[Scrollnt] Game initialized - cat.x:",
            game.cat.x,
            "goalX:",
            game.goalX,
        );

        // Load background image
        const bgImage = new Image();
        const bgPath = chrome.runtime.getURL("assets/catgame/catgame_bg.jpeg");
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
            "assets/cats/Pinkie Cat Animations/Clothing/",
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
        const stonePath = chrome.runtime.getURL("assets/catgame/stone.png");
        stoneImage.src = stonePath;
        let stoneLoaded = false;
        stoneImage.onload = () => {
            stoneLoaded = true;
            console.log("[Scrollnt] Stone image loaded");
        };
        stoneImage.onerror = () => {
            console.error("[Scrollnt] Failed to load stone image");
        };

        // Create 4 stationary obstacles with random sizes on the ground
        const obstaclePositions = [150, 300, 500, 650];
        game.obstacles = obstaclePositions.map((x) => {
            const sizeVariation = 40 + Math.random() * 50; // Random size between 40-90px
            return {
                x: x,
                y: canvas.height - 20 - sizeVariation, // Same ground level as cat (canvas bottom)
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

        // Game loop (delayed 1 second so popup is visible)
        let gameLoopStarted = false;
        setTimeout(() => {
            gameLoopStarted = true;
            gameLoop();
        }, 1000);

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

            // Update cat horizontal movement (balanced speed for gameplay)
            game.cat.x += game.cat.velocityX * 4;

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
                console.log(
                    "[Scrollnt] WIN! cat.x:",
                    game.cat.x,
                    "goalX:",
                    game.goalX,
                );
                this.gameWon();
                canvas.removeEventListener("click", handleClick);
                document.removeEventListener("keydown", handleKeyPress);
                return;
            }

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

                // Check collision - cat hits obstacle if:
                // 1. Walking through it (not jumping high enough)
                // 2. Landing on top of it
                const catBottom = game.cat.y + game.cat.height;
                const catRight = game.cat.x + game.cat.width;
                const obstacleTop = obstacle.y;
                const obstacleLeft = obstacle.x;
                const obstacleRight = obstacle.x + obstacle.width;

                // Cat overlaps horizontally with obstacle
                const horizontalOverlap =
                    catRight > obstacleLeft && game.cat.x < obstacleRight;

                // Cat overlaps vertically with obstacle (any collision)
                const verticalOverlap =
                    catBottom > obstacleTop &&
                    game.cat.y < obstacleTop + obstacle.height;

                // Hit if cat touches obstacle in any way
                if (horizontalOverlap && verticalOverlap) {
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

        const taskDiv = this.challengeElement.querySelector(
            "#scrollnt-challenge-task",
        );
        const winGifPath = chrome.runtime.getURL(
            "assets/cats/Pinkie Cat Animations/Clothing/pink volantin.gif",
        );

        if (taskDiv) {
            taskDiv.innerHTML = `
                <div class="scrollnt-game-container">
                    <div class="scrollnt-game-victory">
                        <h2>🎉 You Did It! 🎉</h2>
                        <img src="${winGifPath}" alt="Celebrating cat" style="width: 200px; height: 200px; margin: 20px auto; display: block;">
                        <p>The cat made it to safety!</p>
                        <p>You can continue scrolling now.</p>
                        <button id="close-game-btn" class="scrollnt-game-button">Continue</button>
                    </div>
                </div>
            `;

            document
                .getElementById("close-game-btn")
                .addEventListener("click", () => {
                    this.challengeElement.remove();
                    if (this.onComplete) {
                        this.onComplete();
                    }
                });
        }
    }
}

// Expose CatJumpingGame to global scope so content.js can access it
window.CatJumpingGame = CatJumpingGame;
