// Mole Captcha Challenge
// User must catch 4 moles that appear randomly in 9 boxes

function createMoleChallenge(taskDiv, challengeElement, onComplete) {
    const totalMolesNeeded = 4;
    let molesCaught = 0;
    let currentMoleIndex = -1;
    let gameActive = true;
    const clickedBoxes = new Set();

    const container = document.createElement("div");
    container.className = "mole-challenge-container";

    const header = document.createElement("div");
    header.className = "mole-captcha-header";
    const headerText = document.createElement("div");
    headerText.className = "mole-captcha-header-text";
    headerText.innerHTML = 'Select all images with <strong>moles</strong><br>Click verify once there are none left.';
    header.appendChild(headerText);

    const status = document.createElement("div");
    status.className = "mole-challenge-status";
    status.id = "mole-status";
    status.textContent = `${molesCaught} of ${totalMolesNeeded} selected`;

    const grid = document.createElement("div");
    grid.className = "mole-challenge-grid";
    grid.id = "mole-grid";

    // Create 9 boxes (3x3 grid)
    const grassUrl = chrome.runtime.getURL("assets/mole/grass.jpeg");
    const boxes = [];
    for (let i = 0; i < 9; i++) {
        const box = document.createElement("div");
        box.className = "mole-box";
        box.dataset.index = i;
        box.style.backgroundImage = `url(${grassUrl})`;
        box.style.backgroundSize = 'cover';
        box.style.backgroundPosition = 'center';
        box.addEventListener('click', () => handleBoxClick(i));
        grid.appendChild(box);
        boxes.push(box);
    }

    const verifyButton = document.createElement("button");
    verifyButton.className = "scrollnt-challenge-btn";
    verifyButton.id = "mole-verify-btn";
    verifyButton.textContent = "Verify";
    verifyButton.disabled = true;
    verifyButton.addEventListener('click', () => {
        if (molesCaught >= totalMolesNeeded) {
            gameActive = false;
            verifyButton.disabled = true;

            setTimeout(() => {
                onComplete();
            }, 500);
        }
    });

    const controls = document.createElement("div");
    controls.className = "mole-captcha-controls";

    const icons = document.createElement("div");
    icons.className = "mole-captcha-icons";
    icons.innerHTML = '<span class="mole-icon">↻</span><span class="mole-icon">🔊</span><span class="mole-icon">ℹ</span>';

    controls.appendChild(icons);
    controls.appendChild(verifyButton);

    container.appendChild(header);
    container.appendChild(status);
    container.appendChild(grid);
    container.appendChild(controls);
    taskDiv.appendChild(container);

    // Function to show mole in a random box
    const showMole = () => {
        if (!gameActive) return;

        // Hide current mole if one is showing (and it hasn't been clicked)
        if (currentMoleIndex !== -1 && !clickedBoxes.has(currentMoleIndex)) {
            const currentBox = boxes[currentMoleIndex];
            currentBox.classList.remove('mole-visible');
            currentBox.innerHTML = '';
        }

        // Get available boxes (not clicked)
        const availableBoxes = boxes.map((_, idx) => idx).filter(idx => !clickedBoxes.has(idx));
        if (availableBoxes.length === 0) return;

        // Pick a random box from available boxes (different from current if possible)
        let newIndex;
        do {
            newIndex = availableBoxes[Math.floor(Math.random() * availableBoxes.length)];
        } while (newIndex === currentMoleIndex && availableBoxes.length > 1);

        currentMoleIndex = newIndex;
        const box = boxes[newIndex];

        // Create mole image
        const moleImg = document.createElement("img");
        moleImg.src = chrome.runtime.getURL("assets/mole/mole_sprite.png");
        moleImg.className = "mole-sprite";
        moleImg.alt = "Mole";

        box.appendChild(moleImg);
        box.classList.add('mole-visible');

        const disappearTime = Math.random() * 400 + 400;

        setTimeout(() => {
            if (gameActive && currentMoleIndex === newIndex && !clickedBoxes.has(newIndex)) {
                box.classList.remove('mole-visible');
                box.innerHTML = '';
                currentMoleIndex = -1;
            }
        }, disappearTime);
    };

    // Function to handle box click
    const handleBoxClick = (index) => {
        if (!gameActive) return;

        // Don't allow clicking on already clicked boxes
        if (clickedBoxes.has(index)) return;

        if (currentMoleIndex === index && boxes[index].classList.contains('mole-visible')) {
            // Mole caught!
            molesCaught++;
            clickedBoxes.add(index);

            const box = boxes[index];
            box.classList.add('mole-hit');
            box.classList.add('mole-caught');

            setTimeout(() => {
                box.classList.remove('mole-hit');
            }, 300);

            currentMoleIndex = -1;

            // Update status
            status.textContent = `${molesCaught} of ${totalMolesNeeded} selected`;

            // Enable verify button if enough moles caught
            if (molesCaught >= totalMolesNeeded) {
                verifyButton.disabled = false;
            }
        } else {
            // Missed - visual feedback
            const box = boxes[index];
            box.classList.add('mole-miss');
            setTimeout(() => {
                box.classList.remove('mole-miss');
            }, 200);
        }
    };

    // Start the game - show first mole after a short delay
    setTimeout(() => {
        showMole();

        const scheduleNextMole = () => {
            if (!gameActive) return;
            const nextDelay = Math.random() * 500 + 500;
            setTimeout(() => {
                if (gameActive) {
                    showMole();
                    scheduleNextMole();
                }
            }, nextDelay);
        };

        scheduleNextMole();
    }, 300);
}

