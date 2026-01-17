// API calls for Sarcastic AI Captcha Challenge

const API_BASE_URL = 'http://localhost:5001/captcha/chat';

/**
 * Send a message to the captcha chat API
 * @param {string} message - The user's message
 * @param {string|null} sessionId - The session ID for subsequent messages (null for first message)
 * @returns {Promise<Object>} Response object with response, confidence, passed, session_id, message_count
 */
async function sendSarcasticAIChatMessage(message, sessionId = null) {
    const payload = {
        message: message
    };

    // Include session_id for subsequent messages
    if (sessionId) {
        payload.session_id = sessionId;
    }

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[SarcasticAI] Error sending chat message:', error);
        throw error;
    }
}

