// Memory Game Challenge
// Creates and manages the memory sequence game

function createMemoryGame(taskDiv, challengeElement, onComplete) {
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

    const container = document.createElement("div");
    container.className = "memory-game-container";

    const h3 = document.createElement("h3");
    h3.textContent = "Memory Game";

    const p = document.createElement("p");
    p.textContent = "Watch the sequence, then repeat it!";

    const grid = document.createElement("div");
    grid.className = "memory-game-grid";
    grid.id = "memory-grid";

    const status = document.createElement("div");
    status.className = "memory-game-status";
    status.id = "memory-status";
    status.textContent = "Watch carefully...";

    const info = document.createElement("div");
    info.className = "memory-game-info";

    const infoP = document.createElement("p");
    infoP.textContent = "Sequence length: ";
    const strong = document.createElement("strong");
    strong.textContent = String(sequenceLength);
    infoP.appendChild(strong);
    info.appendChild(infoP);

    container.appendChild(h3);
    container.appendChild(p);
    container.appendChild(grid);
    container.appendChild(status);
    container.appendChild(info);
    taskDiv.appendChild(container);

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
                onComplete();
            }, 1500);
        } else {
            // Correct so far, continue
            status.textContent = `Good! ${userSequence.length}/${sequence.length} correct`;
        }
    };

    // Start the game
    setTimeout(showSequence, 1000);
}

