// Radio player functionality
let currentStation = null;
let audioPlayer = null;
let syncInterval = null;
let isSynced = false;

// Initialize player
function initPlayer() {
  // Error modal logic
  const audioErrorModal = document.getElementById("audioErrorModal");
  const audioErrorMsg = document.getElementById("audioErrorMsg");
  const audioRetryBtn = document.getElementById("audioRetryBtn");

  function showErrorModal(msg) {
    if (audioErrorModal) {
      audioErrorMsg.textContent = msg || "Failed to load or play audio.";
      audioErrorModal.hidden = false;
    }
    // Spinner logic removed
  }
  function hideErrorModal() {
    if (audioErrorModal) audioErrorModal.hidden = true;
  }
  // Attach error listener after audio element is resolved below
  if (audioRetryBtn) {
    audioRetryBtn.onclick = function () {
      hideErrorModal();
      if (audioPlayer && currentStation) {
        audioPlayer.load();
        audioPlayer.play().catch(() => {
          showErrorModal(
            "Audio still failed to play. Try again or pick another station."
          );
        });
      }
    };
  }
  audioPlayer = document.getElementById("audioPlayer");
  // Attach audio error listener now that audioPlayer is resolved
  if (audioPlayer) {
    audioPlayer.addEventListener("error", function () {
      showErrorModal(
        "Failed to load or play audio. Please check your connection or try again."
      );
    });
  }

  setupModal();
  setupResyncButton();
  setupVolumeControl();

  // Handle audio looping
  audioPlayer.addEventListener("ended", () => {
    if (currentStation) {
      audioPlayer.currentTime = 0;
      audioPlayer.play();
    }
  });

  // Detect manual seeking/scrubbing - breaks sync
  audioPlayer.addEventListener("seeking", () => {
    if (currentStation && isSynced) {
      isSynced = false;
      updateResyncButtonState();
    }
  });

  // Detect manual pause - breaks sync
  audioPlayer.addEventListener("pause", () => {
    if (currentStation && isSynced && !audioPlayer.ended) {
      isSynced = false;
      updateResyncButtonState();
    }
  });
}

// Global volume control affecting both music and static
function setupVolumeControl() {
  const slider = document.getElementById("volumeSlider");
  if (!slider) return;
  // Load saved volume
  const saved = parseFloat(localStorage.getItem("globalVolume"));
  const vol = Number.isFinite(saved) ? Math.min(Math.max(saved, 0), 1) : 1;
  slider.value = String(vol);
  if (audioPlayer) audioPlayer.volume = vol;
  if (window.staticAudio) window.staticAudio.volume = Math.min(vol, 0.6);

  slider.addEventListener("input", (e) => {
    const value = parseFloat(slider.value);
    if (audioPlayer) audioPlayer.volume = value;
    if (window.staticAudio) window.staticAudio.volume = Math.min(value, 0.6);
    try {
      localStorage.setItem("globalVolume", String(value));
    } catch {}
  });
}

// Setup resync button
function setupResyncButton() {
  const resyncBtn = document.getElementById("resyncBtn");
  resyncBtn.addEventListener("click", () => {
    if (currentStation && !resyncBtn.disabled) {
      synchronizePlayback(currentStation);
      // Visual feedback
      resyncBtn.classList.add("synced");
      resyncBtn.disabled = true;
      resyncBtn.textContent = "✓ Synced!";
      isSynced = true;
    }
  });
}

// Setup modal functionality
function setupModal() {
  const modal = document.getElementById("radioModal");
  const closeBtn = document.querySelector(".close");

  closeBtn.onclick = () => {
    modal.style.display = "none";
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  // Close modal with ESC, keep audio playing
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
      if (modal && modal.style.display === "block") {
        modal.style.display = "none";
      }
    }
  });
}

// Open radio station modal
function playStationBackground(station) {
  currentStation = station;
  // Theme is now applied by carousel when centered; keep localStorage updated
  try {
    localStorage.setItem("lastStationId", station.id);
    localStorage.setItem("lastTheme", station.game || "gtaiii");
  } catch {}

  // Lazy-load: only set src when about to play
  audioPlayer.preload = "metadata";
  audioPlayer.src = station.audioFile;
  audioPlayer.load();
  // Spinner logic removed
  // Sync and play
  synchronizePlayback(station);

  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    updateResyncButtonState();
  }, 1000);

  // Show now playing toast
  showNowPlayingToast(station);
}

// Note: audio source is managed per-station; we avoid extra listeners here

let toastTimer = null;
function showNowPlayingToast(station) {
  let toast = document.getElementById("nowPlayingToast");
  if (!toast) {
    // Create toast dynamically if not present in DOM
    toast = document.createElement("div");
    toast.id = "nowPlayingToast";
    toast.className = "now-playing-toast";
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
    toast.innerHTML = `
      <img id="toastLogo" alt="Station Logo" />
      <div class="toast-text">
        <strong id="toastTitle">Now Playing</strong>
        <span id="toastStation"></span>
        <span id="toastTrack"></span>
      </div>
    `;
    document.body.appendChild(toast);
  }
  const logo = document.getElementById("toastLogo");
  const title = document.getElementById("toastTitle");
  const stationSpan = document.getElementById("toastStation");
  // Remove trackSpan logic
  logo.src = station.logo;
  title.textContent = "Now Playing";
  stationSpan.textContent = station.name;
  toast.hidden = false;
  // Animate in
  toast.classList.add("show");
  // Auto-hide after 2.5s
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// getCurrentTrackInfo was removed (no per-track timing UI)

function openRadio(station) {
  const modal = document.getElementById("radioModal");
  // Update modal content
  document.getElementById("modalLogo").src = station.logo;
  document.getElementById("modalStationName").textContent = station.name;
  document.getElementById("modalDJ").textContent = `DJ: ${station.dj}`;
  document.getElementById("modalGenre").textContent = station.genre || "";

  // Render tracklist
  renderTracklist(station.tracks);

  // Start background playback (theme already handled by carousel)
  playStationBackground(station);

  // Show modal
  modal.style.display = "block";
}

// Stop radio playback
function stopRadio() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }

  // Reset sync state
  isSynced = false;
  const resyncBtn = document.getElementById("resyncBtn");
  if (resyncBtn) {
    resyncBtn.classList.remove("synced");
    resyncBtn.disabled = false;
    resyncBtn.textContent = "🕐 Re-sync";
  }

  currentStation = null;
}

// Render the tracklist
function renderTracklist(tracks) {
  const tracklistContent = document.getElementById("tracklistContent");
  tracklistContent.innerHTML = "";

  tracks.forEach((track, index) => {
    const li = document.createElement("li");
    li.id = `track-${index}`;
    // Add special styling for commercials
    if (track.isCommercial) {
      li.classList.add("commercial-track");
    }
    li.textContent = `${track.artist} - ${track.title}`;
    // Remove clickable logic
    tracklistContent.appendChild(li);
  });
}

// jumpToTrack was removed (tracklist is static and non-interactive)

// Check if player is still in sync (within 2 seconds tolerance)
function checkSyncStatus(station) {
  if (!audioPlayer || !station) return false;

  const dur = audioPlayer.duration;
  if (!isFinite(dur) || dur <= 0) return false;

  const now = new Date();
  const secondsSinceMidnight =
    now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();

  const expectedPosition = secondsSinceMidnight % dur;
  const currentPosition = audioPlayer.currentTime % dur;

  // Allow 2 second tolerance for sync, including wrap-around near boundaries
  const syncTolerance = 2;
  const timeDiff = Math.abs(expectedPosition - currentPosition);
  const wrapDiff = Math.abs(timeDiff - dur);

  return timeDiff <= syncTolerance || wrapDiff <= syncTolerance;
}

// Update resync button appearance based on sync status
function updateResyncButtonState() {
  const resyncBtn = document.getElementById("resyncBtn");
  if (!resyncBtn || !currentStation) return;

  const isInSync = checkSyncStatus(currentStation);

  // Only update if status changed
  if (isInSync && !isSynced) {
    // Just became synced
    isSynced = true;
    resyncBtn.classList.add("synced");
    resyncBtn.disabled = true;
    resyncBtn.textContent = "✓ Synced!";
  } else if (!isInSync && isSynced) {
    // Lost sync
    isSynced = false;
    resyncBtn.classList.remove("synced");
    resyncBtn.disabled = false;
    resyncBtn.textContent = "🕐 Re-sync";
  }
  // If button state matches isSynced flag, also update UI to be consistent
  else if (isSynced && !resyncBtn.disabled) {
    resyncBtn.classList.add("synced");
    resyncBtn.disabled = true;
    resyncBtn.textContent = "✓ Synced!";
  } else if (!isSynced && resyncBtn.disabled) {
    resyncBtn.classList.remove("synced");
    resyncBtn.disabled = false;
    resyncBtn.textContent = "🕐 Re-sync";
  }
}

// Synchronize playback based on UTC time (global sync across all timezones)
function synchronizePlayback(station) {
  const seekToExpected = () => {
    const dur = audioPlayer.duration;
    if (!isFinite(dur) || dur <= 0) return; // wait for metadata

    // Get current time in seconds since midnight UTC
    const now = new Date();
    const secondsSinceMidnight =
      now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();

    // Calculate position in the loop (modulo audio file duration)
    const positionInLoop = secondsSinceMidnight % dur;

    // Set the audio player to this position
    audioPlayer.currentTime = positionInLoop;

    // Wait for seek to complete before marking as synced
    const handleSeeked = () => {
      isSynced = true;
      updateResyncButtonState();
      audioPlayer.removeEventListener("seeked", handleSeeked);
    };
    audioPlayer.addEventListener("seeked", handleSeeked);

    audioPlayer.play().catch(() => {
      console.log("Auto-play prevented. User interaction required.");
    });

    // No per-track UI updates
  };

  if (!isFinite(audioPlayer.duration) || audioPlayer.duration <= 0) {
    const onMeta = () => {
      audioPlayer.removeEventListener("loadedmetadata", onMeta);
      seekToExpected();
    };
    audioPlayer.addEventListener("loadedmetadata", onMeta);
    // Ensure the browser fetches metadata
    if (audioPlayer.readyState === 0) {
      try {
        audioPlayer.load();
      } catch {}
    }
  } else {
    seekToExpected();
  }
}
