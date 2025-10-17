// Radio player functionality
let currentStation = null;
let audioPlayer = null;
let syncInterval = null;

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
}

// Setup resync button
function setupResyncButton() {
  const resyncBtn = document.getElementById("resyncBtn");
  resyncBtn.addEventListener("click", () => {
    if (currentStation) {
      synchronizePlayback(currentStation);
      // Visual feedback
      resyncBtn.textContent = "✓ Synced!";
      setTimeout(() => {
        resyncBtn.textContent = "🕐 Re-sync to Clock";
      }, 2000);
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
function openRadio(station) {
  currentStation = station;
  const modal = document.getElementById("radioModal");

  // Update modal content
  document.getElementById("modalLogo").src = station.logo;
  document.getElementById("modalStationName").textContent = station.name;
  document.getElementById("modalDJ").textContent = `DJ: ${station.dj}`;

  // Set audio source
  audioPlayer.src = station.audioFile;

  // Render tracklist
  renderTracklist(station.tracks);

  // Calculate synchronized position and play
  synchronizePlayback(station);

  // Show modal
  modal.style.display = "block";

  // Update current track display periodically
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => updateCurrentTrack(station), 1000);
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
  currentStation = null;
  // Resume auto-rotate when modal closes
  isPaused = false;
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

  // Update the current track display immediately
  updateCurrentTrack(currentStation);
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

  // Highlight current track in list
  document.querySelectorAll(".tracklist li").forEach((li, index) => {
    li.classList.toggle("playing", index === currentTrackIndex);
  });
}
