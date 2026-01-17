// Scrollnt - Challenge System
// Handles all challenge types including memory game

class ChallengeManager {
    constructor(tracker) {
        this.tracker = tracker;
        this.completedLevels = new Set(); // Track which levels have been completed
        this.savedInterventionClasses = [];
    }

    checkChallengeTrigger(level) {
        // Only show challenge once per level (2, 5, 8)
        if (this.completedLevels.has(level)) {
            return;
        }

        // Show challenge if this level hasn't been completed yet
        if (!this.completedLevels.has(level)) {
            this.showChallenge(level);
        }
    }

    showChallenge(level) {
        if (document.querySelector(".scrollnt-challenge")) return;

        // Store the level for this challenge
        this.currentChallengeLevel = level;

        // Temporarily remove intervention classes from html to show clean challenge
        this.removeInterventionsTemporarily();

        // Block scrolling
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        const challenge = document.createElement("div");
        challenge.className = "scrollnt-challenge";
        challenge.innerHTML = `
      <div class="scrollnt-challenge-content">
        <h2>Time for a Challenge! 🎯</h2>
        <p>You've been scrolling for ${this.tracker.getSessionDuration()} minutes</p>
        <p>Complete a quick challenge to continue:</p>
        <div id="scrollnt-challenge-task"></div>
      </div>
    `;
        document.body.appendChild(challenge);

        this.loadRandomChallenge(challenge);
    }

    removeInterventionsTemporarily() {
        const html = document.documentElement;
        const interventionClasses = [
            'scrollnt-viewport-shrink-1',
            'scrollnt-viewport-shrink-2',
            'scrollnt-viewport-shrink-3',
            'scrollnt-desaturate',
            'scrollnt-zoom-drift'
        ];

        // Save which classes were present
        this.savedInterventionClasses = interventionClasses.filter(className =>
            html.classList.contains(className)
        );

        // Remove all intervention classes from html
        html.classList.remove(...interventionClasses);

        // Also remove blur from video containers
        const videoContainers = document.querySelectorAll('[class*="DivContainer"]');
        this.savedBlurContainers = [];
        videoContainers.forEach(container => {
            if (container.classList.contains("scrollnt-blur-video")) {
                this.savedBlurContainers.push(container);
                container.classList.remove("scrollnt-blur-video");
            }
        });
    }

    restoreInterventions() {
        const html = document.documentElement;

        // Restore the classes that were present before
        if (this.savedInterventionClasses.length > 0) {
            html.classList.add(...this.savedInterventionClasses);
        }

        // Restore blur on video containers if they had it
        if (this.savedBlurContainers) {
            this.savedBlurContainers.forEach(container => {
                container.classList.add("scrollnt-blur-video");
            });
        }

        // Clear the saved classes
        this.savedInterventionClasses = [];
        this.savedBlurContainers = [];
    }

    loadRandomChallenge(challengeElement) {

        const challengeTypes = ['memory', 'math', 'typing', 'gratitude', 'physical'];
        const randomType = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
        const taskDiv = challengeElement.querySelector("#scrollnt-challenge-task");

        if (randomType === 'memory') {
            this.createMemoryGame(taskDiv, challengeElement);
        } else {
            // Other challenge types (keeping existing simple challenges)
            const challenges = {
                'math': `Solve: ${Math.floor(Math.random() * 20 + 10)} × ${Math.floor(Math.random() * 10 + 5)} = ?`,
                'typing': 'Type "productivity" backwards',
                'gratitude': "Name 3 things you're grateful for today",
                'physical': "Do 10 jumping jacks"
            };

            taskDiv.innerHTML = `<p><strong>${challenges[randomType]}</strong></p>`;
            const button = document.createElement("button");
            button.className = "scrollnt-challenge-btn";
            button.textContent = "I Completed This";
            button.addEventListener("click", () => {
                this.completeChallenge(challengeElement);
            });
            challengeElement.querySelector(".scrollnt-challenge-content").appendChild(button);
        }

    }

    createMemoryGame(taskDiv, challengeElement) {
        // Randomize game parameters
        const sequenceLength = Math.floor(Math.random() * 3) + 4; // 4-6 items
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
        const numColors = Math.floor(Math.random() * 3) + 3; // 3-5 colors
        const gameColors = colors.slice(0, numColors);

        // Generate random sequence
        const sequence = [];
        for (let i = 0; i < sequenceLength; i++) {
            sequence.push(Math.floor(Math.random() * numColors));
        }

        let userSequence = [];
        let gameState = 'waiting'; // 'waiting', 'showing', 'playing', 'won', 'lost'

        taskDiv.innerHTML = `
            <div class="memory-game-container">
                <h3>Memory Game</h3>
                <p>Watch the sequence, then repeat it!</p>
                <div class="memory-game-grid" id="memory-grid"></div>
                <div class="memory-game-status" id="memory-status">Watch carefully...</div>
                <div class="memory-game-info">
                    <p>Sequence length: <strong>${sequenceLength}</strong></p>
                </div>
            </div>
        `;

        const grid = taskDiv.querySelector('#memory-grid');
        const status = taskDiv.querySelector('#memory-status');

        // Adjust grid layout based on number of colors
        if (numColors === 4) {
            grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
            grid.style.maxWidth = '160px';
        } else if (numColors === 5) {
            grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        } else {
            grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        }

        // Create color buttons
        gameColors.forEach((color, index) => {
            const button = document.createElement('button');
            button.className = 'memory-game-button';
            button.style.backgroundColor = color;
            button.dataset.index = index;
            button.disabled = true;
            button.addEventListener('click', () => handleButtonClick(index));
            grid.appendChild(button);
        });

        // Show sequence
        const showSequence = () => {
            gameState = 'showing';
            status.textContent = 'Watch the sequence...';
            const buttons = grid.querySelectorAll('.memory-game-button');
            buttons.forEach(btn => btn.disabled = true);

            let stepIndex = 0;
            const showStep = () => {
                if (stepIndex < sequence.length) {
                    const colorIndex = sequence[stepIndex];
                    const button = buttons[colorIndex];

                    // Highlight button
                    button.style.transform = 'scale(1.2)';
                    button.style.opacity = '0.7';
                    button.style.boxShadow = '0 0 20px rgba(255,255,255,0.8)';

                    setTimeout(() => {
                        button.style.transform = 'scale(1)';
                        button.style.opacity = '1';
                        button.style.boxShadow = '';
                        stepIndex++;
                        setTimeout(showStep, 300);
                    }, 600);
                } else {
                    // Sequence shown, now user can play
                    gameState = 'playing';
                    status.textContent = 'Now repeat the sequence!';
                    buttons.forEach(btn => btn.disabled = false);
                }
            };

            setTimeout(showStep, 500);
        };

        const handleButtonClick = (clickedIndex) => {
            if (gameState !== 'playing') return;

            const button = grid.querySelectorAll('.memory-game-button')[clickedIndex];

            // Visual feedback
            button.style.transform = 'scale(0.9)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 100);

            userSequence.push(clickedIndex);

            // Check if correct
            if (userSequence[userSequence.length - 1] !== sequence[userSequence.length - 1]) {
                // Wrong!
                gameState = 'lost';
                status.textContent = '❌ Wrong sequence! Try again.';
                status.style.color = '#FF6B6B';

                setTimeout(() => {
                    userSequence = [];
                    showSequence();
                }, 2000);
            } else if (userSequence.length === sequence.length) {
                // Correct sequence completed!
                gameState = 'won';
                status.textContent = '✅ Correct! Well done!';
                status.style.color = '#4ECDC4';

                setTimeout(() => {
                    this.completeChallenge(challengeElement);
                }, 1500);
            } else {
                // Correct so far, continue
                status.textContent = `Good! ${userSequence.length}/${sequence.length} correct`;
            }
        };

        // Start the game
        setTimeout(showSequence, 1000);
    }

    completeChallenge(challengeElement) {
        challengeElement.remove();

        // Mark this level as completed
        if (this.currentChallengeLevel !== undefined) {
            this.completedLevels.add(this.currentChallengeLevel);
        }

        // Restore scrolling
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';

        // Restore intervention classes that were temporarily removed
        this.restoreInterventions();
    }
}

