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
  const { audioPlayer } = PlayerState;
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
      PlayerState.currentStation &&
      PlayerState.currentStation
        .game === "gtasa";
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
          const ap =
            PlayerState.audioPlayer;
          const st =
            PlayerState.currentStation;
          if (ap && st) {
            ap.currentTime =
              trackStartTime;
            // Mark as out of sync since user manually seeked
            PlayerState.isSynced = false;
            PlayerState.userDesynced = true;
            updateResyncButtonState();
            // Show now playing toast for the clicked track, even if it's the same as before
            if (
              typeof showNowPlayingToastForTrack ===
              "function"
            ) {
              showNowPlayingToastForTrack(
                st,
                track
              );
            }
          }
        }
      );
    }
    tracklistContent.appendChild(li);
  });

  // Track change toast handling: use a single listener that references live PlayerState
  let lastToastTrackIndex = -1;

  function handleTrackChangeToast() {
    const st =
      PlayerState.currentStation;
    const ap = PlayerState.audioPlayer;
    if (!st || !ap) return;
    const currentTrack =
      getCurrentTrack(st);
    if (!currentTrack) return;
    const idx = st.tracks.findIndex(
      (t) => t === currentTrack
    );
    if (idx !== lastToastTrackIndex) {
      if (
        typeof showNowPlayingToastForTrack ===
        "function"
      ) {
        showNowPlayingToastForTrack(
          st,
          currentTrack
        );
      }
      lastToastTrackIndex = idx;
    }
  }

  // Remove previous timeupdate handler if any to avoid duplicates
  if (
    PlayerState._tracklistTimeupdateHandler &&
    PlayerState.audioPlayer
  ) {
    try {
      PlayerState.audioPlayer.removeEventListener(
        "timeupdate",
        PlayerState._tracklistTimeupdateHandler
      );
    } catch {}
  }
  PlayerState._tracklistTimeupdateHandler =
    handleTrackChangeToast;
  if (PlayerState.audioPlayer) {
    PlayerState.audioPlayer.addEventListener(
      "timeupdate",
      PlayerState._tracklistTimeupdateHandler
    );
  }

  // Reset index when station changes
  window.addEventListener(
    "stationchange",
    () => {
      lastToastTrackIndex = -1;
    }
  );
}

window.getCurrentTrack =
  getCurrentTrack;
window.renderTracklist =
  renderTracklist;
