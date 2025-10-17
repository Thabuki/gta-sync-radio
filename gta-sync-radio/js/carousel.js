// Carousel functionality
let currentIndex = 0;
let carouselElement = null;
let autoRotateInterval = null;
let isPaused = false;

// Initialize carousel
function initCarousel() {
  carouselElement = document.getElementById("radioCarousel");
  renderRadioStations();
  setupCarouselControls();
  updateCarousel();
  startAutoRotate();
}

// Render radio station cards
function renderRadioStations() {
  const carousel = document.getElementById("radioCarousel");

  // Clone stations at the beginning (for left wrapping)
  const clonesBefore = radioStations.slice(-3).map((station, index) => {
    const card = createStationCard(station, -(3 - index));
    return card;
  });

  // Original stations
  const originalCards = radioStations.map((station, index) => {
    return createStationCard(station, index);
  });

  // Clone stations at the end (for right wrapping)
  const clonesAfter = radioStations.slice(0, 3).map((station, index) => {
    const card = createStationCard(station, radioStations.length + index);
    return card;
  });

  // Append all cards
  [...clonesBefore, ...originalCards, ...clonesAfter].forEach((card) => {
    carousel.appendChild(card);
  });
}

// Create a station card element
function createStationCard(station, index) {
  const card = document.createElement("div");
  card.className = "radio-card";
  card.dataset.index = index;
  card.onclick = () => {
    // Find the actual index in the radioStations array
    const actualIndex =
      ((index % radioStations.length) + radioStations.length) %
      radioStations.length;
    selectStation(actualIndex);
  };

  card.innerHTML = `
    <img src="${station.logo}" alt="${station.name}" class="radio-logo">
    <h2>${station.name}</h2>
    <p class="dj-name">DJ: ${station.dj}</p>
  `;

  return card;
}

// Setup carousel controls
function setupCarouselControls() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const carouselContainer = document.querySelector(".carousel-container");

  prevBtn.addEventListener("click", () => {
    currentIndex =
      (currentIndex - 1 + radioStations.length) % radioStations.length;
    updateCarousel();
    resetAutoRotate();
  });

  nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % radioStations.length;
    updateCarousel();
    resetAutoRotate();
  });

  // Pause auto-rotate on hover
  carouselContainer.addEventListener("mouseenter", () => {
    isPaused = true;
  });

  carouselContainer.addEventListener("mouseleave", () => {
    isPaused = false;
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      prevBtn.click();
    } else if (e.key === "ArrowRight") {
      nextBtn.click();
    } else if (e.key === "Enter" || e.key === " ") {
      openRadio(radioStations[currentIndex]);
    }
  });
}

// Start automatic rotation
function startAutoRotate() {
  autoRotateInterval = setInterval(() => {
    if (!isPaused) {
      currentIndex = (currentIndex + 1) % radioStations.length;
      updateCarousel();
    }
  }, 3000); // Rotate every 3 seconds
}

// Reset auto-rotate timer (when user manually navigates)
function resetAutoRotate() {
  if (autoRotateInterval) {
    clearInterval(autoRotateInterval);
  }
  startAutoRotate();
}

// Select a station
function selectStation(index) {
  currentIndex = index;
  updateCarousel();
  resetAutoRotate();
  // Open modal after a short delay to allow carousel animation
  setTimeout(() => {
    openRadio(radioStations[currentIndex]);
  }, 300);
}

// Update carousel position and styling
function updateCarousel() {
  const cards = document.querySelectorAll(".radio-card");
  const cardWidth = 220; // card width + gap
  const offset = window.innerWidth <= 768 ? 170 : cardWidth;

  // Calculate the center position
  // Add offset for the cloned cards at the beginning (3 cards)
  const cloneOffset = 3;
  const centerOffset = carouselElement.offsetWidth / 2 - cardWidth / 2;
  const translateX = centerOffset - (currentIndex + cloneOffset) * offset;

  carouselElement.style.transform = `translateX(${translateX}px)`;

  // Update active state
  cards.forEach((card, cardIndex) => {
    const dataIndex = parseInt(card.dataset.index);
    const actualIndex =
      ((dataIndex % radioStations.length) + radioStations.length) %
      radioStations.length;
    card.classList.toggle(
      "active",
      actualIndex === currentIndex && cardIndex === currentIndex + cloneOffset
    );
  });

  // Update station info
  const currentStationData = radioStations[currentIndex];
  document.getElementById("currentStationName").textContent =
    currentStationData.name;
  document.getElementById(
    "currentDJ"
  ).textContent = `DJ: ${currentStationData.dj}`;
}
