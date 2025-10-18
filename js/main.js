// Main initialization
// Combine all station data (GTA 3 + Vice City for now)
// Note: rendering is a single carousel; grouping/row separation can be added later
const radioStations = [
  ...gtaiiiStations,
  ...viceCityStations,
  ...gtasaStations,
];

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  // Randomize starting station unless lastStationId is set
  const numClones = 3;
  let randomIndex = Math.floor(Math.random() * radioStations.length);
  // Only randomize if no persisted selection
  if (!localStorage.getItem("lastStationId")) {
    window.currentIndex = randomIndex;
    window.visualIndex = randomIndex + numClones;
    try {
      localStorage.setItem("lastStationId", radioStations[randomIndex].id);
    } catch {}
  }
  initCarousel();
  initPlayer();
  // Register Service Worker (PWA + caching)
  if ("serviceWorker" in navigator) {
    const swPath =
      (location.pathname.endsWith("/")
        ? location.pathname
        : location.pathname.replace(/\/[^/]*$/, "/")) + "sw.js";
    try {
      navigator.serviceWorker.register(swPath);
    } catch {}
  }
  // Keyboard shortcut: Space toggles play/pause
  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("radioModal");
    if (
      e.target &&
      (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
    )
      return;
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      const audio = document.getElementById("audioPlayer");
      if (audio) {
        if (audio.paused) {
          try {
            audio.play();
          } catch {}
        } else {
          try {
            audio.pause();
          } catch {}
        }
      }
    }
  });
  // Game filter event
  const gameFilter = document.getElementById("gameFilter");
  if (gameFilter) {
    gameFilter.addEventListener("change", () => {
      renderRadioStations();
    });
  }
});
