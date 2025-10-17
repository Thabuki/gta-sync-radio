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
  // Game filter event
  const gameFilter = document.getElementById("gameFilter");
  if (gameFilter) {
    gameFilter.addEventListener("change", () => {
      renderRadioStations();
    });
  }
});
