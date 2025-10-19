// Centralized player state
const PlayerState = {
  currentStation: null,
  audioPlayer: null,
  syncInterval: null,
  isSynced: false,
  userDesynced: false,
  toastTimer: null,
  viz: {
    ctx: null,
    canvas: null,
    analyser: null,
    dataArray: null,
    rafId: null,
    audioCtx: null,
  },
};

// Make available globally
window.PlayerState = PlayerState;
