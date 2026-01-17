// YouTube Watch Challenge
// User must watch an embedded YouTube video for at least 30 seconds

function createYouTubeWatchChallenge(taskDiv, challengeElement, onComplete) {
    // YouTube video ID and attributes from user
    const videoId = "FoO7Pmx0bE4";
    const watchTimeRequired = 20; // seconds
    let watchTime = 0;
    let timer = null;
    let playerReady = false;

    // Create challenge container
    const container = document.createElement("div");
    
    // Center the iframe and content
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.width = "100%";
    container.style.maxWidth = "650px";
    container.style.margin = "0 auto";

    const h3 = document.createElement("h3");
    h3.textContent = "YouTube Watch Challenge";

    const p = document.createElement("p");
    p.textContent = `Watch the video below for at least ${watchTimeRequired} seconds to complete the challenge!`;

    const status = document.createElement("div");
    status.className = "youtube-challenge-status";
    status.textContent = `Time watched: 0/${watchTimeRequired} seconds`;

    // Embed YouTube iframe WITHOUT enablejsapi or API script
    const iframe = document.createElement("iframe");
    iframe.width = "560";
    iframe.height = "315";
    iframe.src = `https://www.youtube.com/embed/${videoId}?start=1&autoplay=1`;
    iframe.title = "YouTube video player";
    iframe.frameBorder = "0";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    iframe.id = "youtube-challenge-iframe";

    iframe.style.display = "block";
    iframe.style.margin = "24px auto";

    container.appendChild(h3);
    container.appendChild(p);
    container.appendChild(iframe);
    container.appendChild(status);
    taskDiv.appendChild(container);

    // Start timer immediately and auto-complete after required time
    let timerStarted = false;
    function startTimer() {
        if (!timerStarted) {
            timerStarted = true;
            timer = setInterval(() => {
                watchTime++;
                status.textContent = `Time watched: ${watchTime}/${watchTimeRequired} seconds`;
                if (watchTime >= watchTimeRequired) {
                    clearInterval(timer);
                    status.textContent = "Challenge complete!";
                    status.style.color = "#4ECDC4";
                    showDismissButton();
                }
            }, 1000);
        }
    }

    function showDismissButton() {
        const dismissBtn = document.createElement("button");
        dismissBtn.textContent = "Dismiss";
        dismissBtn.style.marginTop = "16px";
        dismissBtn.style.padding = "8px 20px";
        dismissBtn.style.fontSize = "1rem";
        dismissBtn.style.background = "#4ECDC4";
        dismissBtn.style.color = "#fff";
        dismissBtn.style.border = "none";
        dismissBtn.style.borderRadius = "6px";
        dismissBtn.style.cursor = "pointer";
        dismissBtn.onclick = () => {
            onComplete();
        };
        status.parentNode.appendChild(dismissBtn);
    }

    // Start timer automatically
    startTimer();
}
