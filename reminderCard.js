class ReminderCard {
  async show(videoCount, sessionDuration, reminderCount) {
    if (document.querySelector(".scrollnt-reminder")) return;

    const scoldGPT = new ScoldGPT();
    const scolding = await scoldGPT.fetchScolding(videoCount, sessionDuration, reminderCount) ||
      "You've been watching for a while! Consider taking a break to refresh your mind.";

    const reminder = document.createElement("div");
    reminder.className = "scrollnt-reminder";
    reminder.innerHTML = `
      <div class="scrollnt-reminder-content">
      <h3>You've watched ${videoCount} videos for ${Math.round(sessionDuration,2)} minutes</h3>
      <p>${scolding}</p>
      <p>Consider taking a break? 🌟</p>
      <button class="scrollnt-dismiss" disabled style="background: #ccc; color: #888; cursor: not-allowed;">Dismiss</button>
      </div>
    `;
    document.body.appendChild(reminder);

    const dismissBtn = reminder.querySelector(".scrollnt-dismiss");
    // Enable after 5 seconds
    setTimeout(() => {
      dismissBtn.disabled = false;
      dismissBtn.style.background = '';
      dismissBtn.style.color = '';
      dismissBtn.style.cursor = '';
    }, 5000);

    dismissBtn.addEventListener("click", () => {
      if (!dismissBtn.disabled) reminder.remove();
    });

    // Auto-remove after 20 seconds
    setTimeout(() => {
      reminder.remove();
    }, 20000);
  }
}

