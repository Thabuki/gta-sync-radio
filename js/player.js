// Radio player functionality
// State is managed in PlayerState global object (player-state.js)
// Modules: visualizer.js, sync.js, toast.js, tracklist.js, modal.js, media-session.js

// Initialize player
function initPlayer() {
  // Error modal logic
  const audioErrorModal =
    document.getElementById(
      "audioErrorModal"
    );
  const audioErrorMsg =
    document.getElementById(
      "audioErrorMsg"
    );
  const audioRetryBtn =
    document.getElementById(
      "audioRetryBtn"
    );

  function showErrorModal(msg) {
    if (audioErrorModal) {
      audioErrorMsg.textContent =
        msg ||
        "Failed to load or play audio.";
      audioErrorModal.hidden = false;
    }
  }
  function hideErrorModal() {
    if (audioErrorModal)
      audioErrorModal.hidden = true;
  }
  // Attach error listener after audio element is resolved below
  if (audioRetryBtn) {
    audioRetryBtn.onclick =
      function () {
        hideErrorModal();
        if (
          PlayerState.audioPlayer &&
          PlayerState.currentStation
        ) {
          PlayerState.audioPlayer.load();
          PlayerState.audioPlayer
            .play()
            .catch(() => {
              showErrorModal(
                "Audio still failed to play. Try again or pick another station."
              );
            });
        }
      };
  }
  PlayerState.audioPlayer =
    document.getElementById(
      "audioPlayer"
    );
  // Attach audio error listener now that audioPlayer is resolved
  if (PlayerState.audioPlayer) {
    PlayerState.audioPlayer.addEventListener(
      "error",
      function () {
        showErrorModal(
          "Failed to load or play audio. Please check your connection or try again."
        );
      }
    );
  }

  setupModal();
  setupResyncButton();
  setupVolumeControl();
  setupVisualizer();

  // Handle audio looping
  PlayerState.audioPlayer.addEventListener(
    "ended",
    () => {
      if (PlayerState.currentStation) {
        PlayerState.audioPlayer.currentTime = 0;
        PlayerState.audioPlayer.play();
      }
    }
  );

  // Detect manual seeking/scrubbing - breaks sync
  PlayerState.audioPlayer.addEventListener(
    "seeking",
    () => {
      if (
        PlayerState.currentStation &&
        PlayerState.isSynced
      ) {
        PlayerState.isSynced = false;
        PlayerState.userDesynced = true;
        updateResyncButtonState();
      }
    }
  );

  // Detect manual pause - breaks sync
  PlayerState.audioPlayer.addEventListener(
    "pause",
    () => {
      if (
        PlayerState.currentStation &&
        PlayerState.isSynced &&
        !PlayerState.audioPlayer.ended
      ) {
        PlayerState.isSynced = false;
        PlayerState.userDesynced = true;
        updateResyncButtonState();
      }
    }
  );

  // iOS Safari: prevent audio pause when page is backgrounded/minimized
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        // Page is backgrounded; try to keep audio playing
        if (
          PlayerState.audioPlayer &&
          !PlayerState.audioPlayer
            .paused &&
          PlayerState.currentStation
        ) {
          // Force resume if Safari paused it
          PlayerState.audioPlayer
            .play()
            .catch(() => {
              // Silently ignore if browser blocks autoplay
            });
        }
      } else {
        // Page is visible again; ensure playback continues
        if (
          PlayerState.audioPlayer &&
          PlayerState.currentStation &&
          PlayerState.audioPlayer.paused
        ) {
          PlayerState.audioPlayer
            .play()
            .catch(() => {});
        }
      }
    }
  );
}

// Global volume control affecting both music and static
function setupVolumeControl() {
  const slider =
    document.getElementById(
      "volumeSlider"
    );
  if (!slider) return;

  // Check if already initialized to avoid duplicate listeners
  if (
    slider.dataset.initialized ===
    "true"
  )
    return;
  slider.dataset.initialized = "true";

  // Load saved volume
  const saved = parseFloat(
    localStorage.getItem("globalVolume")
  );
  // Default to 0.25 (25%) if no saved value
  const vol = Number.isFinite(saved)
    ? Math.min(Math.max(saved, 0), 1)
    : 0.25;
  slider.value = String(vol);
  if (PlayerState.audioPlayer)
    PlayerState.audioPlayer.volume =
      vol;
  if (window.staticAudio)
    window.staticAudio.volume =
      Math.min(vol, 0.6);

  slider.addEventListener(
    "input",
    (e) => {
      const value = parseFloat(
        slider.value
      );
      if (PlayerState.audioPlayer)
        PlayerState.audioPlayer.volume =
          value;
      if (window.staticAudio)
        window.staticAudio.volume =
          Math.min(value, 0.6);
      try {
        localStorage.setItem(
          "globalVolume",
          String(value)
        );
      } catch {}
    }
  );
}

// Expose setupVolumeControl globally so carousel can call it after creating slider
window.setupVolumeControl =
  setupVolumeControl;

// Setup resync button
function setupResyncButton() {
  const resyncBtn =
    document.getElementById(
      "resyncBtn"
    );
  resyncBtn.addEventListener(
    "click",
    () => {
      if (
        PlayerState.currentStation &&
        !resyncBtn.disabled
      ) {
        synchronizePlayback(
          PlayerState.currentStation
        );
        // Visual feedback
        resyncBtn.classList.add(
          "synced"
        );
        resyncBtn.disabled = true;
        resyncBtn.textContent =
          "✓ Synced!";
        PlayerState.isSynced = true;
        PlayerState.userDesynced = false;
      }
    }
  );
}

// Background playback orchestration
function playStationBackground(
  station
) {
  // If user intentionally desynced, avoid any implicit re-sync on reopen for the same currently loaded station/source
  try {
    if (
      PlayerState.userDesynced &&
      PlayerState.audioPlayer
    ) {
      const absSrc = new URL(
        station.audioFile,
        location.href
      ).href;
      const sameSource =
        PlayerState.audioPlayer.src &&
        PlayerState.audioPlayer.src ===
          absSrc;
      const sameCurrent =
        PlayerState.currentStation &&
        PlayerState.currentStation
          .id === station.id;
      if (sameSource || sameCurrent) {
        if (
          PlayerState.audioPlayer
            .paused &&
          !PlayerState.audioPlayer.ended
        ) {
          PlayerState.audioPlayer.play();
        }
        // Do not change src or seek; preserve manual position
        return;
      }
    }
  } catch {}

  // If already playing this station and audio is not paused, skip reload/seek
  if (
    PlayerState.currentStation &&
    PlayerState.currentStation.id ===
      station.id
  ) {
    // Already playing this station
    // Respect manual de-sync: if user has intentionally de-synced (isSynced === false), do not re-sync on reopen
    if (
      !PlayerState.isSynced ||
      PlayerState.userDesynced
    ) {
      if (
        PlayerState.audioPlayer
          .paused &&
        !PlayerState.audioPlayer.ended
      ) {
        PlayerState.audioPlayer.play();
      }
      return; // keep currentTime as-is
    }

    const dur =
      PlayerState.audioPlayer.duration;
    if (isFinite(dur) && dur > 0) {
      const now = Date.now() / 1000;
      const expectedPos = now % dur;
      const drift = Math.abs(
        PlayerState.audioPlayer
          .currentTime - expectedPos
      );
      // If already in sync (within 0.1s), just resume
      if (drift < 0.1) {
        if (
          PlayerState.audioPlayer
            .paused &&
          !PlayerState.audioPlayer.ended
        ) {
          PlayerState.audioPlayer.play();
        }
        return;
      }
    }
    // Otherwise, seek to correct position (only when we consider ourselves synced)
    synchronizePlayback(station);
    return;
  }

  PlayerState.currentStation = station;
  // Reset manual desync when switching stations
  PlayerState.userDesynced = false;
  // Theme is now applied by carousel when centered; keep localStorage updated
  try {
    localStorage.setItem(
      "lastStationId",
      station.id
    );
    localStorage.setItem(
      "lastTheme",
      station.game || "gtaiii"
    );
  } catch {}

  // Apply saved volume before loading audio
  const saved = parseFloat(
    localStorage.getItem("globalVolume")
  );
  const vol = Number.isFinite(saved)
    ? Math.min(Math.max(saved, 0), 1)
    : 0.25;
  PlayerState.audioPlayer.volume = vol;

  // Lazy-load: only set src when about to play
  PlayerState.audioPlayer.preload =
    "metadata";
  // Stop any previous playback and clear src before switching to a new station
  try {
    PlayerState.audioPlayer.pause();
  } catch {}
  PlayerState.audioPlayer.removeAttribute(
    "src"
  );
  PlayerState.audioPlayer.load();
  PlayerState.audioPlayer.src =
    station.audioFile;
  PlayerState.audioPlayer.load();
  // Sync and play
  synchronizePlayback(station);

  if (PlayerState.syncInterval)
    clearInterval(
      PlayerState.syncInterval
    );
  PlayerState.syncInterval =
    setInterval(() => {
      updateResyncButtonState();
      // Auto-correct drift: if we're out of sync but playing, gently nudge playback
      // Only perform drift correction when we are in synced mode (avoid overriding user manual seeking)
      if (
        PlayerState.currentStation &&
        !PlayerState.audioPlayer
          .paused &&
        PlayerState.isSynced &&
        !PlayerState.userDesynced
      ) {
        const drift = checkSyncDrift();
        // If drift is between 0.5 and 2 seconds, do a micro-correction
        if (
          drift !== null &&
          Math.abs(drift) > 0.5 &&
          Math.abs(drift) < 2
        ) {
          const dur =
            PlayerState.audioPlayer
              .duration;
          const now = Date.now() / 1000;
          const expectedPos = now % dur;
          PlayerState.audioPlayer.currentTime =
            expectedPos;
          PlayerState.isSynced = true;
          updateResyncButtonState();
        }
      }
    }, 1000);

  // Only show now playing toast when audio is actually playing
  // Ensure we don't keep an old handler pointing to the previous station
  if (PlayerState._toastOnPlayHandler) {
    try {
      PlayerState.audioPlayer.removeEventListener(
        "play",
        PlayerState._toastOnPlayHandler
      );
    } catch {}
    PlayerState._toastOnPlayHandler =
      null;
  }
  PlayerState._toastOnPlayHandler =
    function toastOnPlay() {
      const st =
        PlayerState.currentStation ||
        station;
      showNowPlayingToast(st);
      try {
        PlayerState.audioPlayer.removeEventListener(
          "play",
          PlayerState._toastOnPlayHandler
        );
      } catch {}
      PlayerState._toastOnPlayHandler =
        null;
    };
  PlayerState.audioPlayer.addEventListener(
    "play",
    PlayerState._toastOnPlayHandler,
    { once: true }
  );

  // Update Media Session API for iOS lock screen controls and background playback
  updateMediaSession(station);
}

// Expose globally for carousel to use
window.playStationBackground =
  playStationBackground;
window.initPlayer = initPlayer;
