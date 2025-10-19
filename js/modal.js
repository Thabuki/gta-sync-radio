// Modal dialog management
function setupModal() {
  const modal = document.getElementById(
    "radioModal"
  );
  const closeBtn =
    document.querySelector(".close");

  closeBtn.onclick = () => {
    modal.style.display = "none";
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  // Close modal with ESC, keep audio playing
  document.addEventListener(
    "keydown",
    (e) => {
      if (
        e.key === "Escape" ||
        e.key === "Esc"
      ) {
        if (
          modal &&
          modal.style.display ===
            "block"
        ) {
          modal.style.display = "none";
        }
      }
    }
  );
}

// Open radio station modal
function openRadio(station) {
  const modal = document.getElementById(
    "radioModal"
  );
  // Update modal content
  document.getElementById(
    "modalLogo"
  ).src = station.logo;
  document.getElementById(
    "modalStationName"
  ).textContent = station.name;
  document.getElementById(
    "modalDJ"
  ).textContent = `DJ: ${station.dj}`;
  document.getElementById(
    "modalGenre"
  ).textContent = station.genre || "";

  // Render tracklist
  renderTracklist(station.tracks);

  // Start background playback (theme already handled by carousel)
  playStationBackground(station);

  // Show modal
  modal.style.display = "block";
}

// Stop radio playback
function stopRadio() {
  const { audioPlayer, syncInterval } =
    PlayerState;
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }
  if (syncInterval) {
    clearInterval(syncInterval);
    PlayerState.syncInterval = null;
  }

  // Reset sync state
  PlayerState.isSynced = false;
  const resyncBtn =
    document.getElementById(
      "resyncBtn"
    );
  if (resyncBtn) {
    resyncBtn.classList.remove(
      "synced"
    );
    resyncBtn.disabled = false;
    resyncBtn.textContent =
      "🕐 Re-sync";
  }

  PlayerState.currentStation = null;
}

window.setupModal = setupModal;
window.openRadio = openRadio;
window.stopRadio = stopRadio;
