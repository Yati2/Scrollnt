// Handles all challenge types and shared challenge logic

class ChallengeManager {
    constructor(tracker) {
        this.tracker = tracker;
        this.completedLevels = new Set(); // Track which levels have been completed
        this.savedInterventionClasses = [];
        this.loadingPromise = this.loadCompletedLevels();
    }

    async loadCompletedLevels() {
        try {
            const data = await chrome.storage.local.get(['completedChallengeLevels']);
            if (data.completedChallengeLevels && Array.isArray(data.completedChallengeLevels)) {
                this.completedLevels = new Set(data.completedChallengeLevels);
                console.log('[Scrollnt] Loaded completed challenge levels:', Array.from(this.completedLevels));
            }
        } catch (error) {
            console.warn('[Scrollnt] Error loading completed challenge levels:', error);
        }
    }

    async saveCompletedLevels() {
        try {
            const levelsArray = Array.from(this.completedLevels);
            await chrome.storage.local.set({ completedChallengeLevels: levelsArray });
            console.log('[Scrollnt] Saved completed challenge levels:', levelsArray);
        } catch (error) {
            console.warn('[Scrollnt] Error saving completed challenge levels:', error);
        }
    }

    async checkChallengeTrigger(level) {
        await this.loadingPromise;

        // Only show challenge once per level (4, 7, 9)
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
        this.currentChallengeLevel = level;
        this.removeInterventionsTemporarily();
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        const challenge = document.createElement("div");
        challenge.className = "scrollnt-challenge";
        const taskDiv = document.createElement("div");
        taskDiv.id = "scrollnt-challenge-task";
        challenge.appendChild(taskDiv);
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
        const challengeTypes = ['memory', 'math', 'typing', 'mole', 'sarcasticAI', 'youtubeWatch'];
        
        // const randomType = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
        const randomType = 'youtubeWatch'; // For testing only
        const taskDiv = challengeElement.querySelector("#scrollnt-challenge-task");
        const onComplete = async () => await this.completeChallenge(challengeElement);

        // Mole and SarcasticAI challenges need their own wrapper, others use the gradient wrapper
        if (randomType === 'mole') {
            taskDiv.className = "captcha-challenge-wrapper";
            createMoleChallenge(taskDiv, challengeElement, onComplete);
        } else if (randomType === 'sarcasticAI') {
            taskDiv.className = "captcha-challenge-wrapper";
            createSarcasticAIChallenge(taskDiv, challengeElement, onComplete);
        } else if (randomType === 'youtubeWatch') {
            createYouTubeWatchChallenge(taskDiv, challengeElement, onComplete);
        } else {
            // Create gradient wrapper for other challenges
            taskDiv.remove();
            const content = document.createElement("div");
            content.className = "scrollnt-challenge-content";
            const h2 = document.createElement("h2");
            h2.textContent = "Time for a Challenge! 🎯";
            const p1 = document.createElement("p");
            p1.textContent = `You've been scrolling for ${this.tracker.getSessionDuration()} minutes`;
            const p2 = document.createElement("p");
            p2.textContent = "Complete a quick challenge to continue:";
            content.appendChild(h2);
            content.appendChild(p1);
            content.appendChild(p2);
            content.appendChild(taskDiv);
            challengeElement.appendChild(content);

            if (randomType === 'memory') {
                createMemoryGame(taskDiv, challengeElement, onComplete);
            } else if (randomType === 'math') {
                createMathChallenge(taskDiv, challengeElement, onComplete);
            } else if (randomType === 'typing') {
                createTypingChallenge(taskDiv, challengeElement, onComplete);
            }
        }
    }

    async completeChallenge(challengeElement) {
        challengeElement.remove();

        // Mark this level as completed
        if (this.currentChallengeLevel !== undefined) {
            this.completedLevels.add(this.currentChallengeLevel);
            await this.saveCompletedLevels();
        }

        // Restore scrolling
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';

        // Restore intervention classes that were temporarily removed
        this.restoreInterventions();
    }
}

