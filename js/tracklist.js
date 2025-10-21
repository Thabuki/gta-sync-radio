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
            // Update highlight immediately
            updateTrackHighlight(index);
          }
        }
      );
    }

    tracklistContent.appendChild(li);
  });

  // Track change toast handling: use a single listener that references live PlayerState
  let lastToastTrackIndex = -1;
  let lastHighlightIndex = -1;

  function updateTrackHighlight(index) {
    const list =
      document.getElementById(
        "tracklistContent"
      );
    if (!list) return;
    const items =
      list.querySelectorAll("li");
    // If index === -1, explicit clear (used on station change)
    if (index === -1) {
      items.forEach((el) => {
        el.classList.remove("playing");
        el.removeAttribute(
          "aria-current"
        );
      });
      return;
    }
    // If index is invalid, keep existing highlight
    if (
      index == null ||
      index < 0 ||
      index >= items.length
    ) {
      return;
    }
    items.forEach((el, i) => {
      if (i === index) {
        el.classList.add("playing");
        el.setAttribute(
          "aria-current",
          "true"
        );
      } else {
        el.classList.remove("playing");
        el.removeAttribute(
          "aria-current"
        );
      }
    });
  }

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

    // Highlight: if current is a music track (clickable), use its index. If it's a talk show and we don't yet have a highlight, use the previous music track.
    let targetHighlightIdx = -2; // sentinel for "no change"
    const isCurrentClickable =
      currentTrack.start !==
        undefined &&
      currentTrack.start !== null;
    if (isCurrentClickable) {
      targetHighlightIdx = idx;
    } else if (
      lastHighlightIndex === -1
    ) {
      // On first run during a talk segment, highlight the last music track before this talk show
      for (
        let j = idx - 1;
        j >= 0;
        j--
      ) {
        const t = st.tracks[j];
        if (
          t &&
          t.start !== undefined &&
          t.start !== null
        ) {
          targetHighlightIdx = j;
          break;
        }
      }
      // If none found before, try the next music track after this segment
      if (targetHighlightIdx === -2) {
        for (
          let k = idx + 1;
          k < st.tracks.length;
          k++
        ) {
          const t2 = st.tracks[k];
          if (
            t2 &&
            t2.start !== undefined &&
            t2.start !== null
          ) {
            targetHighlightIdx = k;
            break;
          }
        }
      }
      // If still none found (e.g., talk-only stations), highlight the current talk row
      if (targetHighlightIdx === -2) {
        targetHighlightIdx = idx;
      }
    }

    if (
      targetHighlightIdx >= 0 &&
      targetHighlightIdx !==
        lastHighlightIndex
    ) {
      updateTrackHighlight(
        targetHighlightIdx
      );
      lastHighlightIndex =
        targetHighlightIdx;
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
    // Also initialize when metadata is ready and when playback starts
    try {
      PlayerState.audioPlayer.addEventListener(
        "loadedmetadata",
        handleTrackChangeToast,
        { once: true }
      );
    } catch {}
    try {
      PlayerState.audioPlayer.addEventListener(
        "play",
        handleTrackChangeToast,
        { once: true }
      );
    } catch {}
  }

  // Reset index when station changes
  if (
    PlayerState._tracklistStationChangeHandler
  ) {
    try {
      window.removeEventListener(
        "stationchange",
        PlayerState._tracklistStationChangeHandler
      );
    } catch {}
  }
  PlayerState._tracklistStationChangeHandler =
    () => {
      lastToastTrackIndex = -1;
      lastHighlightIndex = -1;
      // Clear all highlights on station change
      updateTrackHighlight(-1);
    };
  window.addEventListener(
    "stationchange",
    PlayerState._tracklistStationChangeHandler
  );

  // Initialize highlight once after render
  handleTrackChangeToast();
}

window.getCurrentTrack =
  getCurrentTrack;
window.renderTracklist =
  renderTracklist;
