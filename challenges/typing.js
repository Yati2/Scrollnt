// Typing Challenge
// User must type a word backwards

function createTypingChallenge(taskDiv, challengeElement, onComplete) {
    const words = [
        'productivity',
        'challenge',
        'keyboard',
        'computer',
        'internet',
        'software',
        'hardware',
        'algorithm',
        'function',
        'variable',
        'programming',
        'developer',
        'application',
        'interface',
        'database',
        'security',
        'password',
        'username',
        'email',
        'website'
    ];

    const word = words[Math.floor(Math.random() * words.length)];
    const targetWord = word.split('').reverse().join('');
    let userInput = '';

    const container = document.createElement("div");
    container.className = "typing-challenge-container";

    const h3 = document.createElement("h3");
    h3.textContent = "Typing Challenge";

    const p = document.createElement("p");
    p.textContent = "Type \"";
    const strong = document.createElement("strong");
    strong.textContent = word;
    p.appendChild(strong);
    p.appendChild(document.createTextNode("\" backwards:"));

    const display = document.createElement("div");
    display.className = "typing-display";
    const userInputDisplay = document.createElement("span");
    userInputDisplay.className = "typing-user-input";
    userInputDisplay.textContent = "";
    display.appendChild(userInputDisplay);

    const input = document.createElement("input");
    input.type = "text";
    input.id = "typing-input";
    input.placeholder = "Type here...";
    input.className = "typing-input";
    input.autocomplete = "off";
    input.autocorrect = "off";
    input.autocapitalize = "off";
    input.spellcheck = false;

    const feedback = document.createElement("div");
    feedback.id = "typing-feedback";
    feedback.className = "typing-feedback";

    container.appendChild(h3);
    container.appendChild(p);
    container.appendChild(display);
    container.appendChild(input);
    container.appendChild(feedback);
    taskDiv.appendChild(container);

    const updateDisplay = () => {
        userInput = input.value.toLowerCase();

        // Show what the user is typing
        userInputDisplay.textContent = userInput || '';

        if (userInput === targetWord) {
            feedback.textContent = '✅ Correct! Well done!';
            feedback.style.color = '#4ECDC4';
            input.disabled = true;

            setTimeout(() => {
                onComplete();
            }, 1500);
        } else if (targetWord.startsWith(userInput)) {
            // Show progress - correct so far
            userInputDisplay.style.color = '#4ECDC4';
            feedback.textContent = `Good! ${userInput.length}/${targetWord.length} characters correct`;
            feedback.style.color = '#4ECDC4';
        } else if (userInput.length > 0) {
            // Wrong character
            userInputDisplay.style.color = '#FF6B6B';
            feedback.textContent = '❌ Wrong! Start over.';
            feedback.style.color = '#FF6B6B';
            input.value = '';
            userInput = '';
            userInputDisplay.textContent = '';
        } else {
            // Empty input
            userInputDisplay.style.color = 'white';
            feedback.textContent = '';
        }
    };

    input.addEventListener('input', updateDisplay);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && userInput === targetWord) {
            updateDisplay();
        }
    });

    // Focus on input
    input.focus();
}

