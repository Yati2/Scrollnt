// Math Challenge
// Creates a simple multiplication math problem

function createMathChallenge(taskDiv, challengeElement, onComplete) {
    const num1 = Math.floor(Math.random() * 20 + 10);
    const num2 = Math.floor(Math.random() * 10 + 5);
    const correctAnswer = num1 * num2;

    const container = document.createElement("div");
    container.className = "math-challenge-container";

    const h3 = document.createElement("h3");
    h3.textContent = "Math Challenge";

    const p1 = document.createElement("p");
    p1.textContent = "Solve this multiplication problem:";

    const problemP = document.createElement("p");
    problemP.className = "math-problem";
    const strong = document.createElement("strong");
    strong.textContent = `${num1} × ${num2} = ?`;
    problemP.appendChild(strong);

    const answerInput = document.createElement("input");
    answerInput.type = "text";
    answerInput.id = "math-answer";
    answerInput.placeholder = "Enter your answer";
    answerInput.className = "math-input";
    answerInput.inputMode = "numeric";

    const submitButton = document.createElement("button");
    submitButton.className = "scrollnt-challenge-btn";
    submitButton.id = "math-submit";
    submitButton.textContent = "Submit Answer";

    const feedback = document.createElement("div");
    feedback.id = "math-feedback";
    feedback.className = "math-feedback";

    container.appendChild(h3);
    container.appendChild(p1);
    container.appendChild(problemP);
    container.appendChild(answerInput);
    container.appendChild(submitButton);
    container.appendChild(feedback);
    taskDiv.appendChild(container);

    const checkAnswer = () => {
        const userAnswer = parseInt(answerInput.value);

        if (isNaN(userAnswer)) {
            feedback.textContent = 'Please enter a number';
            feedback.style.color = '#FF6B6B';
            return;
        }

        if (userAnswer === correctAnswer) {
            feedback.textContent = '✅ Correct! Well done!';
            feedback.style.color = '#4ECDC4';
            submitButton.disabled = true;
            answerInput.disabled = true;

            setTimeout(() => {
                onComplete();
            }, 1500);
        } else {
            feedback.textContent = '❌ Incorrect. Try again!';
            feedback.style.color = '#FF6B6B';
            answerInput.value = '';
            answerInput.focus();
        }
    };

    submitButton.addEventListener('click', checkAnswer);
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });

    // Focus on input
    answerInput.focus();
}

