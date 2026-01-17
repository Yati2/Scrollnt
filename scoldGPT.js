class ScoldGPT {
    async fetchScolding(videoCount, sessionDuration, reminderCount) {
        const duration = Math.floor(sessionDuration / 60000); // convert ms to minutes
        const response = await fetch('http://127.0.0.1:5001/get-scolding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                video_count: videoCount,
                session_duration: duration,
                reminder_count: reminderCount
            })
        });
        const data = await response.json();
        return data.scolding;
    }
}
