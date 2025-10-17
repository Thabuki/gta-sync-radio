// Static sound effect element (placeholder)
let staticAudio = null;
let lastClickedCardIndex = -1;
let lastClickTime = 0;

function playStaticThenStation(station) {
  // Prefer MP3 (fast decode) but gracefully fall back to existing wav/ogg if mp3s aren't present
  const staticCandidates = [
    ["media/radio-static-1.mp3", "media/radio-static-1.wav"],
    ["media/radio-static-2.mp3", "media/radio-static-2.wav"],
    ["media/radio-static-3.mp3", "media/radio-static-3.ogg"],
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
    // Make available for volume control
    window.staticAudio = staticAudio;
    try {
      const saved = parseFloat(localStorage.getItem("globalVolume"));
      const vol = Number.isFinite(saved) ? Math.min(Math.max(saved, 0), 1) : 1;
      staticAudio.volume = Math.min(vol, 0.6);
    } catch {}
  }
  // Randomly select a candidate group each time
  const group = staticCandidates[Math.floor(Math.random() * staticCandidates.length)];
  let attemptIndex = 0;
  // Stop any previous static sound
  try {
    staticAudio.pause();
  } catch {}
  staticAudio.currentTime = 0;
  // Volume controlled by global slider (capped a bit to keep static comfortable)
  try {
    const saved = parseFloat(localStorage.getItem("globalVolume"));
    const vol = Number.isFinite(saved) ? Math.min(Math.max(saved, 0), 1) : 1;
    staticAudio.volume = Math.min(vol, 0.6);
  } catch {
    staticAudio.volume = 0.5;
  }
  const tryNextSource = () => {
    if (attemptIndex >= group.length) {
      // All fallbacks failed; play station directly
      if (typeof playStationBackground === "function") {
        playStationBackground(station);
      }
      return;
    }
    const choice = group[attemptIndex++];
    staticAudio.src = choice;
    try { staticAudio.load(); } catch {}
    staticAudio.play().catch(() => {
      // Try next fallback on play error
      tryNextSource();
    });
  };

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
  // If this source fails to load, onerror will rotate to next fallback
  staticAudio.onerror = () => {
    tryNextSource();
  };

  tryNextSource();
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

  const numClones = 3;

  // Start at the first real station (offset by numClones because of leading clones)
  visualIndex = numClones; // First real card (after leading clones)
  currentIndex = 0; // Actual station index

  // Persisted selection
  const lastId = localStorage.getItem("lastStationId");
  if (lastId) {
    const idx = radioStations.findIndex((s) => s.id === lastId);
    if (idx >= 0) {
      currentIndex = idx;
      visualIndex = idx + numClones; // +numClones for leading clones
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

// Render radio station cards with clones for infinite loop
function renderRadioStations() {
  const carousel = document.getElementById("radioCarousel");
  carousel.innerHTML = "";

  const numStations = radioStations.length;
  const numClones = 3; // Number of clones on each side for smoother infinite scroll

  // Add clones at the beginning (last N stations)
  for (let i = 0; i < numClones; i++) {
    const stationIndex = numStations - numClones + i;
    const clone = createStationCard(
      radioStations[stationIndex],
      -(numClones - i)
    );
    clone.classList.add("clone", "clone-before");
    carousel.appendChild(clone);
  }

  // Add all real stations
  radioStations.forEach((station, idx) => {
    carousel.appendChild(createStationCard(station, idx));
  });

  // Add clones at the end (first N stations)
  for (let i = 0; i < numClones; i++) {
    const clone = createStationCard(radioStations[i], numStations + i);
    clone.classList.add("clone", "clone-after");
    carousel.appendChild(clone);
  }
}

// Create a station card element
function createStationCard(station, index) {
  const card = document.createElement("div");
  card.className = "radio-card";
  card.dataset.index = index;

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
function focusStationByCard(cardEl, allowOpenModal = false) {
  // Always allow click to center and play, even if transitioning
  const cards = Array.from(document.querySelectorAll(".radio-card"));
  const cardIndexInDom = cards.indexOf(cardEl);
  if (cardIndexInDom === -1) return;

  const numClones = 3;

  // Ensure no stale "open after center" flags remain
  window._openModalAfterCenter = false;

  console.log("focusStationByCard called:", {
    cardIndexInDom,
    visualIndex,
    currentIndex,
    isCentered: cardIndexInDom === visualIndex,
  });

  // If the clicked card is already centered and selected, open modal
  if (cardIndexInDom === visualIndex) {
    // Get the actual station index (accounting for leading clones)
    let stationIdx = cardIndexInDom - numClones;
    // Wrap around for clones
    if (stationIdx < 0) stationIdx = radioStations.length + stationIdx;
    if (stationIdx >= radioStations.length)
      stationIdx = stationIdx - radioStations.length;

    // If this isn't the currently playing station, trigger static -> station handoff
    if (lastPlayedStationId !== radioStations[stationIdx].id) {
      playStaticThenStation(radioStations[stationIdx]);
      lastPlayedStationId = radioStations[stationIdx].id;
    }

    if (allowOpenModal && typeof openRadio === "function") {
      openRadio(radioStations[stationIdx]);
    }
    return;
  }

  // Center the card, then open modal after transition
  visualIndex = cardIndexInDom;

  // Calculate actual station index
  let stationIdx = cardIndexInDom - numClones;
  if (stationIdx < 0) stationIdx = radioStations.length + stationIdx;
  if (stationIdx >= radioStations.length)
    stationIdx = stationIdx - radioStations.length;

  currentIndex = stationIdx;

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
    console.log("Click event on carousel:", e.target);
    if (isTransitioning) {
      console.log("Click ignored: transitioning");
      return;
    }
    const card = e.target.closest(".radio-card");
    console.log("Clicked card:", card);
    if (!card) return;
    // Only open modal if the clicked card is already centered
    focusStationByCard(card, true);
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
  visualIndex++;
  isTransitioning = true;
  updateCarousel(true);

  // After transition, check if we're on the clone at the end
  checkAndResetPosition();
}

// Move to previous station
function moveToPrevious() {
  visualIndex--;
  isTransitioning = true;
  updateCarousel(true);

  // After transition, check if we're on the clone at the beginning
  checkAndResetPosition();
}

// Check if we need to reset position after reaching clones
// After transition, snap seamlessly if on a clone
function checkAndResetPosition(onAfterTransition) {
  setTimeout(() => {
    const numStations = radioStations.length;
    const numClones = 3;

    // If we've scrolled past the real stations into the trailing clones
    if (visualIndex > numStations + numClones - 1) {
      // Jump back to the corresponding real station
      const offset = visualIndex - (numStations + numClones);
      visualIndex = numClones + offset;
      currentIndex = offset;
      updateCarousel(false); // No transition for the seamless jump
    }
    // If we've scrolled before the real stations into the leading clones
    else if (visualIndex < numClones) {
      // Jump forward to the corresponding real station
      const offset = numClones - visualIndex;
      visualIndex = numStations + numClones - offset;
      currentIndex = numStations - offset;
      updateCarousel(false); // No transition for the seamless jump
    }

    // Update currentIndex to match the real station
    if (visualIndex >= numClones && visualIndex < numStations + numClones) {
      currentIndex = visualIndex - numClones;
      try {
        localStorage.setItem("lastStationId", radioStations[currentIndex].id);
      } catch {}
    }

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
      // Only trigger playback handoff if not already playing this station
      const audioEl = document.getElementById("audioPlayer");
      const alreadyThisStation = lastPlayedStationId === currentStationData.id;
      if (!alreadyThisStation) {
        playStaticThenStation(currentStationData);
        lastPlayedStationId = currentStationData.id;
      }
    }, 320);
  } else {
    isTransitioning = false;
    const audioEl = document.getElementById("audioPlayer");
    const alreadyThisStation = lastPlayedStationId === currentStationData.id;
    if (!alreadyThisStation) {
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
  let genreInfo = document.getElementById("currentGenre");
  if (!genreInfo) {
    genreInfo = document.createElement("p");
    genreInfo.id = "currentGenre";
    genreInfo.className = "genre-name";
    document.getElementById("stationInfo").appendChild(genreInfo);
  }
  genreInfo.textContent = currentStationData.genre || "";

  // Add volume control after genre if not already present
  let volumeControl = document.getElementById("volumeControl");
  if (!volumeControl) {
    volumeControl = document.createElement("div");
    volumeControl.id = "volumeControl";
    volumeControl.className = "volume-control";
    volumeControl.innerHTML = `
      <label for="volumeSlider">Volume</label>
      <input id="volumeSlider" type="range" min="0" max="1" step="0.01" value="1" />
    `;
    document.getElementById("stationInfo").appendChild(volumeControl);
  }

  // Apply theme immediately when centered
  const body = document.body;
  body.classList.remove("theme-gtaiii", "theme-gtavc", "theme-gtasa");
  if (currentStationData.game === "gtaiii") body.classList.add("theme-gtaiii");
  else if (currentStationData.game === "gtavc")
    body.classList.add("theme-gtavc");
  else if (currentStationData.game === "gtasa")
    body.classList.add("theme-gtasa");

  // Update game logo based on current game
  updateGameLogo(currentStationData.game);

  // Autoplay handled above via scheduled playStaticThenStation
}

// Update the game logo at the top
function updateGameLogo(game) {
  const gameLogo = document.getElementById("gameLogo");
  if (!gameLogo) return;

  const logoMap = {
    gtaiii: "img/gtaiii-logo.png",
    gtavc: "img/gtavc-logo.svg",
    gtasa: "img/gtasa-logo.svg",
  };

  const newSrc = logoMap[game] || "";
  if (
    newSrc &&
    gameLogo.src !==
      location.origin + location.pathname.replace(/\/[^/]*$/, "/") + newSrc
  ) {
    gameLogo.style.opacity = "0";
    setTimeout(() => {
      gameLogo.src = newSrc;
      gameLogo.alt = game.toUpperCase() + " Logo";
      gameLogo.style.opacity = "1";
    }, 150);
  }
}
