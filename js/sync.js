// Global sync module for UTC-based synchronization
function checkSyncDrift() {
  const {
    audioPlayer,
    currentStation,
  } = PlayerState;
  if (!audioPlayer || !currentStation)
    return null;

  const dur = audioPlayer.duration;
  if (!isFinite(dur) || dur <= 0)
    return null;

  const now = Date.now() / 1000;
  const expectedPosition = now % dur;
  const currentPosition =
    audioPlayer.currentTime % dur;

  // Calculate the shortest drift (accounting for wrap-around)
  let drift =
    expectedPosition - currentPosition;
  if (Math.abs(drift) > dur / 2) {
    // We're near the wrap-around point, adjust
    drift =
      drift > 0
        ? drift - dur
        : drift + dur;
  }

  return drift;
}

// Check if player is still in sync (within 2 seconds tolerance)
function checkSyncStatus(station) {
  const { audioPlayer } = PlayerState;
  if (!audioPlayer || !station)
    return false;

  const dur = audioPlayer.duration;
  if (!isFinite(dur) || dur <= 0)
    return false;

  const drift = checkSyncDrift();
  if (drift === null) return false;

  // Allow 2 second tolerance for sync
  const syncTolerance = 2;
  return (
    Math.abs(drift) <= syncTolerance
  );
}

// Update resync button appearance based on sync status
function updateResyncButtonState() {
  const { currentStation } =
    PlayerState;
  const resyncBtn =
    document.getElementById(
      "resyncBtn"
    );
  if (!resyncBtn || !currentStation)
    return;

  const isInSync = checkSyncStatus(
    currentStation
  );

  // Only update if status changed
  if (
    isInSync &&
    !PlayerState.isSynced
  ) {
    // Just became synced
    PlayerState.isSynced = true;
    resyncBtn.classList.add("synced");
    resyncBtn.disabled = true;
    resyncBtn.textContent = "✓ Synced!";
  } else if (
    !isInSync &&
    PlayerState.isSynced
  ) {
    // Lost sync
    PlayerState.isSynced = false;
    resyncBtn.classList.remove(
      "synced"
    );
    resyncBtn.disabled = false;
    resyncBtn.textContent =
      "🕐 Re-sync";
  }
  // If button state matches isSynced flag, also update UI to be consistent
  else if (
    PlayerState.isSynced &&
    !resyncBtn.disabled
  ) {
    resyncBtn.classList.add("synced");
    resyncBtn.disabled = true;
    resyncBtn.textContent = "✓ Synced!";
  } else if (
    !PlayerState.isSynced &&
    resyncBtn.disabled
  ) {
    resyncBtn.classList.remove(
      "synced"
    );
    resyncBtn.disabled = false;
    resyncBtn.textContent =
      "🕐 Re-sync";
  }
}

// Synchronize playback based on UTC time (global sync across all timezones)
function synchronizePlayback(station) {
  const { audioPlayer, userDesynced } =
    PlayerState;

  // Respect manual mode: if user intentionally desynced, do not perform any sync
  if (userDesynced) {
    return;
  }

  const seekToExpected = () => {
    const dur = audioPlayer.duration;
    if (!isFinite(dur) || dur <= 0)
      return; // wait for metadata

    // Calculate position RIGHT BEFORE seeking to minimize drift
    // We'll recalculate after seek completes to account for seek time
    const getExpectedPosition = () => {
      const now = Date.now() / 1000; // Unix timestamp in seconds
      return now % dur;
    };

    const initialPosition =
      getExpectedPosition();
    audioPlayer.currentTime =
      initialPosition;

    // Wait for seek to complete, then adjust for elapsed time
    const handleSeeked = () => {
      audioPlayer.removeEventListener(
        "seeked",
        handleSeeked
      );

      // Recalculate position to account for seek delay
      const finalPosition =
        getExpectedPosition();
      const drift =
        finalPosition - initialPosition;

      // If drift is significant (> 0.1s), adjust before playing
      if (
        Math.abs(drift) > 0.1 &&
        drift < dur / 2
      ) {
        audioPlayer.currentTime =
          finalPosition;
      }

      PlayerState.isSynced = true;
      updateResyncButtonState();
    };
    audioPlayer.addEventListener(
      "seeked",
      handleSeeked,
      { once: true }
    );

    // Start playback - this will wait for seek to complete
    audioPlayer.play().catch(() => {
      // Auto-play prevented. User interaction required.
    });
  };

  if (
    !isFinite(audioPlayer.duration) ||
    audioPlayer.duration <= 0
  ) {
    const onMeta = () => {
      audioPlayer.removeEventListener(
        "loadedmetadata",
        onMeta
      );
      seekToExpected();
    };
    audioPlayer.addEventListener(
      "loadedmetadata",
      onMeta,
      { once: true }
    );
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

window.checkSyncDrift = checkSyncDrift;
window.checkSyncStatus =
  checkSyncStatus;
window.updateResyncButtonState =
  updateResyncButtonState;
window.synchronizePlayback =
  synchronizePlayback;
