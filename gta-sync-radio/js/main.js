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
