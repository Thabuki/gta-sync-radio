// Media Session API for iOS lock screen controls and background playback
function updateMediaSession(station) {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata =
      new MediaMetadata({
        title: station.name,
        artist: `DJ: ${station.dj}`,
        album:
          station.genre || "GTA Radio",
        artwork: [
          {
            src: station.logo,
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: station.logo,
            sizes: "256x256",
            type: "image/png",
          },
          {
            src: station.logo,
            sizes: "128x128",
            type: "image/png",
          },
        ],
      });

    // Set up playback controls for lock screen
    navigator.mediaSession.setActionHandler(
      "play",
      () => {
        const { audioPlayer } =
          PlayerState;
        if (audioPlayer)
          audioPlayer.play();
      }
    );

    navigator.mediaSession.setActionHandler(
      "pause",
      () => {
        const { audioPlayer } =
          PlayerState;
        if (audioPlayer)
          audioPlayer.pause();
      }
    );

    // Disable seek handlers since we're synced to epoch time
    navigator.mediaSession.setActionHandler(
      "seekbackward",
      null
    );
    navigator.mediaSession.setActionHandler(
      "seekforward",
      null
    );
    navigator.mediaSession.setActionHandler(
      "previoustrack",
      null
    );
    navigator.mediaSession.setActionHandler(
      "nexttrack",
      null
    );
  }
}

window.updateMediaSession =
  updateMediaSession;
