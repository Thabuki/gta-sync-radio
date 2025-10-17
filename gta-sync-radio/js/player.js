// Radio player functionality
let currentStation = null;
let audioPlayer = null;
let syncInterval = null;
let isSynced = false;
let syncCheckInterval = null;

// Initialize player
function initPlayer() {
  audioPlayer = document.getElementById("audioPlayer");
  setupModal();
  setupResyncButton();

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
    stopRadio();
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
      stopRadio();
    }
  };
}

// Open radio station modal
function playStationBackground(station) {
  currentStation = station;
  // Theme is now applied by carousel when centered; keep localStorage updated
  try {
    localStorage.setItem("lastStationId", station.id);
    localStorage.setItem("lastTheme", station.game || "gtaiii");
  } catch {}

  // Prepare audio
  audioPlayer.src = station.audioFile;
  audioPlayer.preload = "auto";
  // Sync and play
  synchronizePlayback(station);

  // Keep track info updating even if modal is closed
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    updateCurrentTrack(station);
    updateResyncButtonState();
  }, 1000);

  // Show now playing toast
  showNowPlayingToast(station);
}

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
  let trackSpan = document.getElementById("toastTrack");
  if (!trackSpan) {
    trackSpan = document.createElement("span");
    trackSpan.id = "toastTrack";
    toast.querySelector(".toast-text").appendChild(trackSpan);
  }
  logo.src = station.logo;
  title.textContent = "Now Playing";
  stationSpan.textContent = station.name;
  // Compute current track quickly for initial toast info
  const trackInfo = getCurrentTrackInfo(station);
  if (trackInfo) {
    trackSpan.textContent = `${trackInfo.artist} - ${trackInfo.title}`;
  } else {
    trackSpan.textContent = "";
  }
  toast.hidden = false;
  // Animate in
  toast.classList.add("show");
  // Auto-hide after 2.5s
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function getCurrentTrackInfo(station) {
  try {
    if (!audioPlayer || !station) return null;
    const currentTime = audioPlayer.currentTime;
    let accumulated = 0;
    for (let i = 0; i < station.tracks.length; i++) {
      const t = station.tracks[i];
      if (currentTime < accumulated + t.duration) {
        return { artist: t.artist, title: t.title, index: i };
      }
      accumulated += t.duration;
    }
    // If exceeded, wrap around
    const last = station.tracks[station.tracks.length - 1];
    return {
      artist: last.artist,
      title: last.title,
      index: station.tracks.length - 1,
    };
  } catch {
    return null;
  }
}

function openRadio(station) {
  const modal = document.getElementById("radioModal");
  // Update modal content
  document.getElementById("modalLogo").src = station.logo;
  document.getElementById("modalStationName").textContent = station.name;
  document.getElementById("modalDJ").textContent = `DJ: ${station.dj}`;

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
    resyncBtn.textContent = "🕐 Re-sync to Clock";
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

    // Make track clickable to jump to it
    li.style.cursor = "pointer";
    li.onclick = () => jumpToTrack(index);

    tracklistContent.appendChild(li);
  });
}

// Jump to a specific track in the playlist
function jumpToTrack(trackIndex) {
  if (!currentStation || !audioPlayer) return;

  // Calculate the timestamp where this track starts
  let trackStartTime = 0;
  for (let i = 0; i < trackIndex; i++) {
    trackStartTime += currentStation.tracks[i].duration;
  }

  // Set audio player to that position
  audioPlayer.currentTime = trackStartTime;

  // Manual track jump breaks sync
  isSynced = false;
  updateResyncButtonState();

  // Update the current track display immediately
  updateCurrentTrack(currentStation);
}

// Check if player is still in sync (within 2 seconds tolerance)
function checkSyncStatus(station) {
  if (!audioPlayer || !station) return false;

  const totalDuration = station.tracks.reduce(
    (sum, track) => sum + track.duration,
    0
  );

  const now = new Date();
  const secondsSinceMidnight =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const expectedPosition = secondsSinceMidnight % totalDuration;
  const currentPosition = audioPlayer.currentTime % totalDuration;

  // Allow 2 second tolerance for sync
  const syncTolerance = 2;
  const timeDiff = Math.abs(expectedPosition - currentPosition);

  return timeDiff <= syncTolerance;
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
    resyncBtn.textContent = "🕐 Re-sync to Clock";
  }
  // If button state matches isSynced flag, also update UI to be consistent
  else if (isSynced && !resyncBtn.disabled) {
    resyncBtn.classList.add("synced");
    resyncBtn.disabled = true;
    resyncBtn.textContent = "✓ Synced!";
  } else if (!isSynced && resyncBtn.disabled) {
    resyncBtn.classList.remove("synced");
    resyncBtn.disabled = false;
    resyncBtn.textContent = "🕐 Re-sync to Clock";
  }
}

// Synchronize playback based on computer clock
function synchronizePlayback(station) {
  // Calculate total duration of all tracks
  const totalDuration = station.tracks.reduce(
    (sum, track) => sum + track.duration,
    0
  );

  // Get current time in seconds since midnight
  const now = new Date();
  const secondsSinceMidnight =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  // Calculate position in the loop (modulo total duration)
  const positionInLoop = secondsSinceMidnight % totalDuration;

  // Set the audio player to this position
  audioPlayer.currentTime = positionInLoop;

  // Wait for seek to complete before marking as synced
  const handleSeeked = () => {
    isSynced = true;
    updateResyncButtonState();
    audioPlayer.removeEventListener("seeked", handleSeeked);
  };
  audioPlayer.addEventListener("seeked", handleSeeked);

  audioPlayer.play().catch((err) => {
    console.log("Auto-play prevented. User interaction required.");
  });

  // Update the current track display
  updateCurrentTrack(station);
}

// Update current track display
function updateCurrentTrack(station) {
  if (!audioPlayer || !currentStation) return;

  const currentTime = audioPlayer.currentTime;
  let accumulatedTime = 0;
  let currentTrackIndex = 0;

  // Find which track is currently playing
  for (let i = 0; i < station.tracks.length; i++) {
    if (currentTime < accumulatedTime + station.tracks[i].duration) {
      currentTrackIndex = i;
      break;
    }
    accumulatedTime += station.tracks[i].duration;
  }

  const currentTrack = station.tracks[currentTrackIndex];
  const trackTime = Math.floor(currentTime - accumulatedTime);
  const trackRemaining = currentTrack.duration - trackTime;

  // Update display
  document.getElementById(
    "currentTrack"
  ).textContent = `Now Playing: ${currentTrack.artist} - ${currentTrack.title}`;

  // Also reflect on the toast if present
  const toastTrack = document.getElementById("toastTrack");
  if (toastTrack) {
    toastTrack.textContent = `${currentTrack.artist} - ${currentTrack.title}`;
  }

  // Highlight current track in list
  document.querySelectorAll(".tracklist li").forEach((li, index) => {
    li.classList.toggle("playing", index === currentTrackIndex);
  });
}
