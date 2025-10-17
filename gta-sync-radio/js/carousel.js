// Carousel functionality (infinite with clones and seamless snap)
let currentIndex = 0;
let visualIndex = 0; // includes clones
let carouselElement = null;
let isTransitioning = false;

// Initialize carousel
function initCarousel() {
  carouselElement = document.getElementById("radioCarousel");
  renderRadioStations();
  setupCarouselControls();

  // Start at the first real station (after clones)
  visualIndex = 3; // number of clones before
  currentIndex = 0;
  updateCarousel(false);
}

// Render radio station cards
function renderRadioStations() {
  const carousel = document.getElementById("radioCarousel");

  const clonesBefore = radioStations.slice(-3).map((station, index) => {
    return createStationCard(station, -(3 - index));
  });

  const originals = radioStations.map((station, index) => {
    return createStationCard(station, index);
  });

  const clonesAfter = radioStations.slice(0, 3).map((station, index) => {
    return createStationCard(station, radioStations.length + index);
  });

  [...clonesBefore, ...originals, ...clonesAfter].forEach((card) => {
    carousel.appendChild(card);
  });
}

// Create a station card element
function createStationCard(station, index) {
  const card = document.createElement("div");
  card.className = "radio-card";
  card.dataset.index = index;
  card.onclick = () => {
    focusStationByCard(card);
  };

  const isPlaceholder =
    typeof station.logo === "string" &&
    /placeholder\.(svg|png)$/i.test(station.logo);

  card.innerHTML = `
    <img src="${station.logo}" alt="${station.name}" class="radio-logo" data-placeholder="${isPlaceholder}" onerror="this.dataset.placeholder='true'; this.src='img/placeholder.svg'">
    <h2>${station.name}</h2>
    <p class="dj-name">DJ: ${station.dj}</p>
  `;

  return card;
}

// Center the clicked card (clone or real) and select it
function focusStationByCard(cardEl) {
  if (isTransitioning) return;
  const cards = Array.from(document.querySelectorAll('.radio-card'));
  const cardIndexInDom = cards.indexOf(cardEl);
  if (cardIndexInDom === -1) return;

  const dataIndex = parseInt(cardEl.dataset.index);
  const actualIndex = ((dataIndex % radioStations.length) + radioStations.length) % radioStations.length;

  // If the clicked card is already centered and selected, open immediately
  if (cardIndexInDom === visualIndex && actualIndex === currentIndex) {
    openRadio(radioStations[currentIndex]);
    return;
  }

  currentIndex = actualIndex;
  visualIndex = cardIndexInDom; // center the exact clicked element
  isTransitioning = true;
  updateCarousel(true);
  checkAndResetPosition(() => {
    openRadio(radioStations[currentIndex]);
  });
}

// Setup carousel controls
function setupCarouselControls() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const carouselContainer = document.querySelector(".carousel-container");
  const listEl = carouselElement;

  prevBtn.addEventListener("click", () => {
    if (isTransitioning) return;
    moveToPrevious();
  });

  nextBtn.addEventListener("click", () => {
    if (isTransitioning) return;
    moveToNext();
  });

  // Mouse wheel navigation
  carouselContainer.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (isTransitioning) return;

    // Scroll down/right = next station
    // Scroll up/left = previous station
    if (e.deltaY > 0 || e.deltaX > 0) {
      moveToNext();
    } else {
      moveToPrevious();
    }
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

  // Delegated click handling to ensure card clicks are captured reliably
  listEl.addEventListener('click', (e) => {
    if (isTransitioning) return;
    const card = e.target.closest('.radio-card');
    if (!card) return;
    focusStationByCard(card);
  });
}

// Move to next station
function moveToNext() {
  visualIndex += 1;
  currentIndex = (currentIndex + 1) % radioStations.length;
  isTransitioning = true;
  updateCarousel(true);
  checkAndResetPosition();
}

// Move to previous station
function moveToPrevious() {
  visualIndex -= 1;
  currentIndex =
    (currentIndex - 1 + radioStations.length) % radioStations.length;
  isTransitioning = true;
  updateCarousel(true);
  checkAndResetPosition();
}

// Check if we need to reset position after reaching clones
// After transition, snap seamlessly if on a clone
function checkAndResetPosition(onAfterTransition) {
  const total = radioStations.length;
  const cloneOffset = 3;

  const onTransitionEnd = (e) => {
    if (e.propertyName !== "transform") return;
    carouselElement.removeEventListener("transitionend", onTransitionEnd);

    if (visualIndex >= total + cloneOffset) {
      visualIndex = cloneOffset;
      updateCarousel(false);
    } else if (visualIndex < cloneOffset) {
      visualIndex = total + cloneOffset - 1;
      updateCarousel(false);
    }
    isTransitioning = false;
    if (typeof onAfterTransition === 'function') onAfterTransition();
  };

  carouselElement.addEventListener("transitionend", onTransitionEnd);

  // Fallback watchdog: clear transition state if transitionend doesn't fire
  setTimeout(() => {
    if (!isTransitioning) return;
    carouselElement.removeEventListener("transitionend", onTransitionEnd);
    // Snap if needed
    if (visualIndex >= total + cloneOffset) {
      visualIndex = cloneOffset;
      updateCarousel(false);
    } else if (visualIndex < cloneOffset) {
      visualIndex = total + cloneOffset - 1;
      updateCarousel(false);
    }
    isTransitioning = false;
    if (typeof onAfterTransition === 'function') onAfterTransition();
  }, 500);
}

// Start automatic rotation
// Auto-rotate removed in clamped mode

// Select a station
function selectStation(index) {
  currentIndex =
    ((index % radioStations.length) + radioStations.length) %
    radioStations.length;
  visualIndex = currentIndex + 3; // align with clone offset
  updateCarousel(true);
  setTimeout(() => {
    openRadio(radioStations[currentIndex]);
  }, 300);
}

// Update carousel position and styling
function updateCarousel(withTransition = true) {
  const cards = document.querySelectorAll(".radio-card");
  // Compute offset based on actual rendered card + gap for precise centering
  const firstCard = cards[0];
  const carouselStyles = getComputedStyle(carouselElement);
  // Some browsers may return 'normal' for gap; ensure a numeric fallback
  const gapStr = carouselStyles.gap || carouselStyles.columnGap || "20";
  let gap = parseFloat(gapStr);
  if (Number.isNaN(gap)) gap = 20;

  // Use the actual card element width; fallback to 200px flex-basis if unavailable
  let cardWidth = 200;
  if (firstCard) {
    const rect = firstCard.getBoundingClientRect();
    if (rect && rect.width) {
      cardWidth = rect.width;
    }
  }
  const offset = cardWidth + gap;

  // Calculate the center position using visualIndex (includes clones)
  const centerOffset = carouselElement.offsetWidth / 2 - cardWidth / 2;
  const translateX = centerOffset - visualIndex * offset;

  // Enable or disable transition
  if (withTransition) {
    carouselElement.style.transition = "transform 0.3s ease";
  } else {
    carouselElement.style.transition = "none";
  }

  carouselElement.style.transform = `translateX(${translateX}px)`;

  // When not transitioning (snap), clear flag; transition flag cleared in checkAndResetPosition
  if (!withTransition) {
    isTransitioning = false;
  }

  // Update active state based only on station index.
  // This keeps both the clone and the real card active during the snap, avoiding visual flicker.
  cards.forEach((card) => {
    const dataIndex = parseInt(card.dataset.index);
    const actualIndex =
      ((dataIndex % radioStations.length) + radioStations.length) %
      radioStations.length;
    card.classList.toggle("active", actualIndex === currentIndex);
  });

  // Update station info
  const currentStationData = radioStations[currentIndex];
  document.getElementById("currentStationName").textContent =
    currentStationData.name;
  document.getElementById(
    "currentDJ"
  ).textContent = `DJ: ${currentStationData.dj}`;

  // No disabling of arrows in infinite mode
}
