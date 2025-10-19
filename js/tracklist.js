// Tracklist rendering and current track tracking
function getCurrentTrack(station) {
  const { audioPlayer } = PlayerState;
  if (
    !station ||
    !station.tracks ||
    !audioPlayer
  )
    return null;

  const currentTime =
    audioPlayer.currentTime;

  // Find the track where currentTime falls between this track's start and the next track's start
  for (
    let i = 0;
    i < station.tracks.length;
    i++
  ) {
    const track = station.tracks[i];
    const trackStart =
      track.start !== undefined
        ? track.start
        : 0;

    // Get next track's start time (or use audio duration as end if this is the last track)
    let nextTrackStart;
    if (i < station.tracks.length - 1) {
      const nextTrack =
        station.tracks[i + 1];
      nextTrackStart =
        nextTrack.start !== undefined
          ? nextTrack.start
          : audioPlayer.duration;
    } else {
      nextTrackStart =
        audioPlayer.duration;
    }

    if (
      currentTime >= trackStart &&
      currentTime < nextTrackStart
    ) {
      return track;
    }
  }

  // If we're past all tracks or no match, return the last one
  return (
    station.tracks[
      station.tracks.length - 1
    ] || null
  );
}

function renderTracklist(tracks) {
  const {
    audioPlayer,
    currentStation,
  } = PlayerState;
  const tracklistContent =
    document.getElementById(
      "tracklistContent"
    );
  tracklistContent.innerHTML = "";

  tracks.forEach((track, index) => {
    const li =
      document.createElement("li");
    li.id = `track-${index}`;
    // Determine if this item should be interactive
    const hasStart =
      track.start !== undefined &&
      track.start !== null;
    if (!hasStart) {
      li.classList.add("non-clickable");
    }

    // Add special styling for commercials
    if (track.isCommercial) {
      li.classList.add(
        "commercial-track"
      );
    }

    // Display track text
    const text =
      document.createElement("span");
    text.textContent = `${track.artist} - ${track.title}`;
    li.appendChild(text);

    // If this is a San Andreas station, show an UNDER CONSTRUCTION overlay on clickable tracks
    // TODO[cleanup]: Remove this overlay once San Andreas track start times are finalized
    // and the skip-to-music feature is fully enabled for GTASA.
    const isSA =
      currentStation &&
      currentStation.game === "gtasa";
    if (isSA && hasStart) {
      li.classList.add(
        "sa-under-construction"
      );
      const uc =
        document.createElement("span");
      uc.className = "uc-overlay";
      uc.textContent =
        "UNDER CONSTRUCTION";
      uc.setAttribute(
        "aria-hidden",
        "true"
      );
      li.appendChild(uc);
      li.title =
        "Skip to music is under construction for San Andreas";
    }

    // Add a subtle Talk Show badge for non-clickable items
    if (!hasStart) {
      const badge =
        document.createElement("span");
      badge.className =
        "track-badge talk-badge";
      badge.textContent = "Talk Show";
      li.appendChild(badge);
    }

    // Only wire clicks when a start time exists
    if (hasStart) {
      const trackStartTime =
        track.start;
      li.addEventListener(
        "click",
        () => {
          if (
            audioPlayer &&
            currentStation
          ) {
            audioPlayer.currentTime =
              trackStartTime;
            // Mark as out of sync since user manually seeked
            PlayerState.isSynced = false;
            PlayerState.userDesynced = true;
            updateResyncButtonState();
            // Show now playing toast for the clicked track, even if it's the same as before
            showNowPlayingToastForTrack(
              currentStation,
              track
            );
          }
        }
      );
    }
    // Track last shown track index for toast
    let lastToastTrackIndex = -1;
    // Show toast when a new track starts
    function handleTrackChangeToast() {
      if (
        !currentStation ||
        !audioPlayer
      )
        return;
      const currentTrack =
        getCurrentTrack(currentStation);
      if (!currentTrack) return;
      const idx =
        currentStation.tracks.findIndex(
          (t) => t === currentTrack
        );
      if (idx !== lastToastTrackIndex) {
        showNowPlayingToastForTrack(
          currentStation,
          currentTrack
        );
        lastToastTrackIndex = idx;
      }
    }
    // Listen for timeupdate to detect track changes
    if (audioPlayer) {
      audioPlayer.addEventListener(
        "timeupdate",
        handleTrackChangeToast
      );
    }
    // Reset on station change
    window.addEventListener(
      "stationchange",
      () => {
        lastToastTrackIndex = -1;
      }
    );
    // Show now playing toast for a specific track (used for click and timeupdate)
    function showNowPlayingToastForTrack(
      station,
      track
    ) {
      let toast =
        document.getElementById(
          "nowPlayingToast"
        );
      if (!toast) {
        // Create toast dynamically if not present in DOM
        toast =
          document.createElement("div");
        toast.id = "nowPlayingToast";
        toast.className =
          "now-playing-toast";
        toast.setAttribute(
          "aria-live",
          "polite"
        );
        toast.setAttribute(
          "aria-atomic",
          "true"
        );
        toast.innerHTML = `
      <img id="toastLogo" alt="Station Logo" />
      <div class="toast-text">
        <strong id="toastTitle">Now Playing</strong>
        <span id="toastStation"></span>
        <span id="toastTrack"></span>
      </div>
    `;
        document.body.appendChild(
          toast
        );
      }
      const logo =
        document.getElementById(
          "toastLogo"
        );
      const title =
        document.getElementById(
          "toastTitle"
        );
      const stationSpan =
        document.getElementById(
          "toastStation"
        );
      const trackSpan =
        document.getElementById(
          "toastTrack"
        );

      logo.src = station.logo;
      title.textContent = "Now Playing";
      stationSpan.textContent =
        station.name;

      if (track && trackSpan) {
        trackSpan.textContent = `${track.artist} - ${track.title}`;
      } else if (trackSpan) {
        trackSpan.textContent = "";
      }

      toast.hidden = false;
      toast.classList.add("show");
      if (PlayerState.toastTimer)
        clearTimeout(
          PlayerState.toastTimer
        );
      PlayerState.toastTimer =
        setTimeout(() => {
          toast.classList.remove(
            "show"
          );
        }, 2500);
    }

    tracklistContent.appendChild(li);
  });
}

window.getCurrentTrack =
  getCurrentTrack;
window.renderTracklist =
  renderTracklist;
