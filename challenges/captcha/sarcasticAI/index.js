// Sarcastic AI Captcha Challenge
// User must convince the AI they are human through conversation

function createSarcasticAIChallenge(taskDiv, challengeElement, onComplete) {
    let sessionId = null;
    let messageCount = 0;
    let challengePassed = false;

    const container = document.createElement("div");
    container.className = "captcha-challenge-container";

    const header = document.createElement("div");
    header.className = "captcha-header";
    const headerText = document.createElement("div");
    headerText.className = "captcha-header-text";
    headerText.innerHTML = 'Prove you are <strong>human</strong><br>Chat with the AI to convince it.';
    header.appendChild(headerText);

    const status = document.createElement("div");
    status.className = "captcha-status";
    status.id = "sarcastic-ai-status";
    status.textContent = "Start the conversation...";

    // Chat container
    const chatContainer = document.createElement("div");
    chatContainer.className = "sarcastic-ai-chat-container";
    chatContainer.id = "sarcastic-ai-chat";

    // Input container
    const inputContainer = document.createElement("div");
    inputContainer.className = "sarcastic-ai-input-container";

    const messageInput = document.createElement("input");
    messageInput.type = "text";
    messageInput.className = "sarcastic-ai-input";
    messageInput.id = "sarcastic-ai-input";
    messageInput.placeholder = "Type your message...";
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    const sendButton = document.createElement("button");
    sendButton.className = "sarcastic-ai-send-btn";
    sendButton.id = "sarcastic-ai-send";
    sendButton.textContent = "Send";
    sendButton.addEventListener('click', handleSendMessage);

    inputContainer.appendChild(messageInput);
    inputContainer.appendChild(sendButton);

    const verifyButton = document.createElement("button");
    verifyButton.className = "captcha-verify-btn";
    verifyButton.id = "sarcastic-ai-verify-btn";
    verifyButton.textContent = "Verify";
    verifyButton.disabled = true; // Disabled until passed: true
    verifyButton.addEventListener('click', () => {
        // Button is only enabled when challengePassed is true, so this should always succeed
        if (challengePassed) {
            onComplete();
        }
    });

    const controls = document.createElement("div");
    controls.className = "captcha-controls";

    controls.appendChild(verifyButton);

    container.appendChild(header);
    container.appendChild(status);
    container.appendChild(chatContainer);
    container.appendChild(inputContainer);
    container.appendChild(controls);
    taskDiv.appendChild(container);

    // Add welcome message from bot
    addBotMessage("Hello! I'm here to determine if you're human. Let's chat!");

    /**
     * Add a message bubble to the chat
     * @param {string} text - Message text
     * @param {boolean} isUser - True if user message, false if bot message
     */
    function addMessage(text, isUser) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `sarcastic-ai-message ${isUser ? 'sarcastic-ai-message-user' : 'sarcastic-ai-message-bot'}`;

        const messageText = document.createElement("div");
        messageText.className = "sarcastic-ai-message-text";
        messageText.textContent = text;

        messageDiv.appendChild(messageText);
        chatContainer.appendChild(messageDiv);

        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    /**
     * Add a bot message
     * @param {string} text - Bot message text
     */
    function addBotMessage(text) {
        addMessage(text, false);
    }

    /**
     * Add a user message
     * @param {string} text - User message text
     */
    function addUserMessage(text) {
        addMessage(text, true);
    }

    /**
     * Handle sending a message
     */
    async function handleSendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Disable input while processing
        messageInput.disabled = true;
        sendButton.disabled = true;

        // Add user message to chat
        addUserMessage(message);
        messageInput.value = '';

        // Show typing indicator
        const typingIndicator = document.createElement("div");
        typingIndicator.className = "sarcastic-ai-message sarcastic-ai-message-bot sarcastic-ai-typing";
        typingIndicator.innerHTML = '<div class="sarcastic-ai-message-text">AI is typing...</div>';
        chatContainer.appendChild(typingIndicator);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        try {
            // Call API (api.js is loaded via manifest)
            const response = await sendSarcasticAIChatMessage(message, sessionId);

            // Remove typing indicator
            typingIndicator.remove();

            // Update session ID if provided
            if (response.session_id) {
                sessionId = response.session_id;
            }

            // Update message count
            messageCount = response.message_count || messageCount + 1;

            // Add bot response
            addBotMessage(response.response);

            // Update status
            if (response.confidence !== undefined) {
                status.textContent = `Confidence: ${response.confidence.toFixed(1)}% | Messages: ${messageCount}`;
            }

            // Check if challenge passed - only enable verify button when passed is true
            if (response.passed === true) {
                challengePassed = true;
                verifyButton.disabled = false;
                status.textContent = "✓ Verification passed! Click Verify to continue.";
                status.style.color = "#34a853";
            } else {
                // Ensure button stays disabled if not passed
                verifyButton.disabled = true;
                challengePassed = false;
            }

        } catch (error) {
            // Remove typing indicator
            typingIndicator.remove();

            // Show error message
            addBotMessage("Sorry, I encountered an error. Please try again.");
            console.error('[SarcasticAI] Error:', error);
        } finally {
            // Re-enable input
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
        }
    }

    // Focus input on load
    setTimeout(() => {
        messageInput.focus();
    }, 100);
}

