class AutolockCard {
  async show(videoCount, sessionDuration, reminderCount) {
    if (document.querySelector(".scrollnt-autolock")) return;

    const scoldGPT = new ScoldGPT();
    const scolding = await scoldGPT.fetchScolding(videoCount, sessionDuration, reminderCount) ||
      "Time to log out and take a break! Bye for now.";

    const reminder = document.createElement("div");
    reminder.className = "scrollnt-autolock";
    reminder.innerHTML = `
      <div class="scrollnt-autolock-content">
      <h3>You've watched ${videoCount} videos for ${Math.floor(sessionDuration)} minutes</h3>
      <p>${scolding}</p>
      <p>No more videos for you, bye 🌟</p>
      </div>
    `;
    document.body.appendChild(reminder);
  }
}

