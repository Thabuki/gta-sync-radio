// Main initialization
// Combine all station data (currently just GTA 3, but ready for Vice City and San Andreas)
const radioStations = [...gta3Stations];

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initCarousel();
  initPlayer();
});
