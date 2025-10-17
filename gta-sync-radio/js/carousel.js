// Static sound effect element (placeholder)
let staticAudio = null;

function playStaticThenStation(station) {
  const staticFiles = [
    "media/radio-static-1.wav",
    "media/radio-static-2.wav",
    "media/radio-static-3.ogg",
  ];

  // Stop currently playing station audio immediately
  const audioPlayer = document.getElementById("audioPlayer");
  if (audioPlayer) {
    try {
      audioPlayer.pause();
    } catch {}
  }

  if (!staticAudio) {
    staticAudio = new Audio();
    staticAudio.preload = "auto";
  }
  // Randomly select a static sound each time
  const choice = staticFiles[Math.floor(Math.random() * staticFiles.length)];
  // Stop any previous static sound
  try {
    staticAudio.pause();
  } catch {}
  staticAudio.currentTime = 0;
  staticAudio.volume = 0.5;
  if (!staticAudio.src || !staticAudio.src.endsWith(choice)) {
    staticAudio.src = choice;
    try {
      staticAudio.load();
    } catch {}
  }
  staticAudio.onended = () => {
    if (typeof playStationBackground === "function") {
      playStationBackground(station);
    } else {
      // Fallback: still avoid opening modal automatically
      const audioEl = document.getElementById("audioPlayer");
      if (audioEl) {
        audioEl.src = station.audioFile;
        audioEl.preload = "auto";
        try {
          audioEl.play();
        } catch {}
      }
    }
  };
  staticAudio.play().catch(() => {
    if (typeof playStationBackground === "function") {
      playStationBackground(station);
    }
  });
}
// Carousel functionality (infinite with clones and seamless snap)
let currentIndex = 0;
let visualIndex = 0; // includes clones
let carouselElement = null;
let isTransitioning = false;
let playAfterTransitionTimer = null;
let lastPlayedStationId = null;
const reduceMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Initialize carousel
function initCarousel() {
  carouselElement = document.getElementById("radioCarousel");
  renderRadioStations();
  setupCarouselControls();

  // Start at the first station (no clones mode)
  visualIndex = 0;
  // Persisted selection
  const lastId = localStorage.getItem("lastStationId");
  if (lastId) {
    const idx = radioStations.findIndex((s) => s.id === lastId);
    if (idx >= 0) {
      currentIndex = idx;
      visualIndex = idx;
      // Apply theme based on persisted game
      const body = document.body;
      body.classList.remove("theme-gtaiii", "theme-gtavc", "theme-gtasa");
      const game = radioStations[idx].game;
      if (game === "gtaiii") body.classList.add("theme-gtaiii");
      else if (game === "gtavc") body.classList.add("theme-gtavc");
      else if (game === "gtasa") body.classList.add("theme-gtasa");
      updateCarousel(false);
    } else {
      currentIndex = 0;
      updateCarousel(false);
    }
  } else {
    currentIndex = 0;
    updateCarousel(false);
  }
}

// Render radio station cards
function renderRadioStations() {
  const carousel = document.getElementById("radioCarousel");
  carousel.innerHTML = "";

  // Group stations by game
  const games = [
    { key: "gta3", label: "GTA III" },
    { key: "gtavc", label: "Vice City" },
    { key: "gtasa", label: "San Andreas" },
  ];
  let groupedStations = games.map((g) => ({
    key: g.key,
    label: g.label,
    stations: radioStations.filter((s) => s.game === g.key),
  }));

  // Render each group with label and divider
  // Flatten all stations into a single row, no labels/dividers
  radioStations.forEach((station, idx) => {
    carousel.appendChild(createStationCard(station, idx));
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
    <img src="${station.logo}" alt="${station.name}" class="radio-logo" loading="lazy" decoding="async" fetchpriority="low"
      onerror="this.onerror=null;this.src='img/placeholder.svg'">
    <h2>${station.name}</h2>
    <p class="dj-name">DJ: ${station.dj}</p>
  `;

  return card;
}

// Center the clicked card (clone or real) and select it
function focusStationByCard(cardEl) {
  // Always allow click to center and play, even if transitioning
  const cards = Array.from(document.querySelectorAll(".radio-card"));
  const cardIndexInDom = cards.indexOf(cardEl);
  if (cardIndexInDom === -1) return;

  // If the clicked card is already centered and selected, open immediately
  if (cardIndexInDom === visualIndex && cardIndexInDom === currentIndex) {
    openRadio(radioStations[currentIndex]);
    return;
  }

  currentIndex = cardIndexInDom;
  visualIndex = cardIndexInDom;
  try {
    localStorage.setItem("lastStationId", radioStations[currentIndex].id);
  } catch {}
  isTransitioning = true;
  updateCarousel(true);
}

// Setup carousel controls
function setupCarouselControls() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const carouselContainer = document.querySelector(".carousel-container");
  const listEl = carouselElement;

  prevBtn.addEventListener("click", () => {
    moveToPrevious();
  });

  nextBtn.addEventListener("click", () => {
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
  listEl.addEventListener("click", (e) => {
    if (isTransitioning) return;
    const card = e.target.closest(".radio-card");
    if (!card) return;
    focusStationByCard(card);
  });

  // Touch swipe navigation
  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;
  const threshold = 30; // pixels

  listEl.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      touchActive = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  listEl.addEventListener(
    "touchmove",
    (e) => {
      if (!touchActive) return;
      // Allow vertical scrolling; only act on mostly horizontal moves
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dx) < Math.abs(dy)) return; // vertical gesture
      e.preventDefault();
    },
    { passive: false }
  );

  listEl.addEventListener("touchend", (e) => {
    if (!touchActive) return;
    touchActive = false;
    const dx =
      ((e.changedTouches && e.changedTouches[0].clientX) || touchStartX) -
      touchStartX;
    if (Math.abs(dx) < threshold) return;
    if (isTransitioning) return;
    if (dx < 0) {
      moveToNext();
    } else {
      moveToPrevious();
    }
  });
}

// Move to next station
function moveToNext() {
  currentIndex = (currentIndex + 1) % radioStations.length;
  visualIndex = currentIndex;
  try {
    localStorage.setItem("lastStationId", radioStations[currentIndex].id);
  } catch {}
  isTransitioning = true;
  updateCarousel(true);
}

// Move to previous station
function moveToPrevious() {
  currentIndex =
    (currentIndex - 1 + radioStations.length) % radioStations.length;
  visualIndex = currentIndex;
  try {
    localStorage.setItem("lastStationId", radioStations[currentIndex].id);
  } catch {}
  isTransitioning = true;
  updateCarousel(true);
}

// Check if we need to reset position after reaching clones
// After transition, snap seamlessly if on a clone
function checkAndResetPosition(onAfterTransition) {
  // No clone logic needed; just clear transition state after animation
  setTimeout(() => {
    isTransitioning = false;
    if (typeof onAfterTransition === "function") onAfterTransition();
  }, 350);
}

// Start automatic rotation
// Auto-rotate removed in clamped mode

// Select a station
function selectStation(index) {
  currentIndex =
    ((index % radioStations.length) + radioStations.length) %
    radioStations.length;
  visualIndex = currentIndex; // no clones
  updateCarousel(true);
  setTimeout(() => {
    if (typeof playStationBackground === "function") {
      playStationBackground(radioStations[currentIndex]);
    }
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

  // Calculate the center position using the actual centered card
  let centerOffset = 0;
  if (cards[visualIndex]) {
    const rect = cards[visualIndex].getBoundingClientRect();
    const carouselRect = carouselElement.getBoundingClientRect();
    centerOffset = carouselRect.width / 2 - rect.width / 2;
  } else {
    centerOffset = carouselElement.offsetWidth / 2 - cardWidth / 2;
  }
  const translateX = centerOffset - visualIndex * offset;

  // Enable or disable transition
  if (withTransition) {
    carouselElement.style.transition = "transform 0.3s ease";
  } else {
    carouselElement.style.transition = "none";
  }

  carouselElement.style.transform = `translateX(${translateX}px)`;

  // Schedule playback when transition completes (or immediately if no transition)
  const currentStationData = radioStations[currentIndex];
  if (withTransition) {
    if (playAfterTransitionTimer) clearTimeout(playAfterTransitionTimer);
    playAfterTransitionTimer = setTimeout(() => {
      isTransitioning = false;
      if (
        !lastPlayedStationId ||
        lastPlayedStationId !== currentStationData.id
      ) {
        playStaticThenStation(currentStationData);
        lastPlayedStationId = currentStationData.id;
      }
    }, 320);
  } else {
    isTransitioning = false;
    if (!lastPlayedStationId || lastPlayedStationId !== currentStationData.id) {
      playStaticThenStation(currentStationData);
      lastPlayedStationId = currentStationData.id;
    }
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
  document.getElementById("currentStationName").textContent =
    currentStationData.name;
  document.getElementById(
    "currentDJ"
  ).textContent = `DJ: ${currentStationData.dj}`;

  // Apply theme immediately when centered
  const body = document.body;
  body.classList.remove("theme-gtaiii", "theme-gtavc", "theme-gtasa");
  if (currentStationData.game === "gtaiii") body.classList.add("theme-gtaiii");
  else if (currentStationData.game === "gtavc")
    body.classList.add("theme-gtavc");
  else if (currentStationData.game === "gtasa")
    body.classList.add("theme-gtasa");

  // Autoplay handled above via scheduled playStaticThenStation
}
