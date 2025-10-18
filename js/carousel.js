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
    staticAudio.preload = "none";
    // Make available for volume control
    window.staticAudio = staticAudio;
    try {
      const saved = parseFloat(localStorage.getItem("globalVolume"));
      const vol = Number.isFinite(saved) ? Math.min(Math.max(saved, 0), 1) : 1;
      staticAudio.volume = Math.min(vol, 0.6);
    } catch {}
  }
  // Randomly select a candidate group each time
  const group =
    staticCandidates[Math.floor(Math.random() * staticCandidates.length)];
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
    try {
      staticAudio.load();
    } catch {}
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
window.currentIndex =
  typeof window.currentIndex === "number" ? window.currentIndex : 0;
window.visualIndex =
  typeof window.visualIndex === "number" ? window.visualIndex : 0; // includes clones
let carouselElement = null;
let isTransitioning = false;
let playAfterTransitionTimer = null;
let lastPlayedStationId = null;
let autoplayDebounceTimer = null;
const AUTOPLAY_DEBOUNCE_MS = 200; // short debounce to avoid rapid retriggers
const reduceMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Background fade control (avoid interruptions during rapid changes)
let bgFadeTimer = null; // legacy timer usage, we'll switch to debounce
let bgFadeDebounceTimer = null;

// Initialize carousel
function initCarousel() {
  // After using window.currentIndex/visualIndex, clear them to avoid interference
  window.currentIndex = undefined;
  window.visualIndex = undefined;
  // Always set carouselElement before controls
  carouselElement = document.getElementById("radioCarousel");
  renderRadioStations();
  setupCarouselControls();

  const numClones = 3;

  // Start at the first real station (offset by numClones because of leading clones)
  // Prefer window.currentIndex/visualIndex (random start), then persisted selection, then default
  let idx = null;
  if (
    typeof window.currentIndex === "number" &&
    typeof window.visualIndex === "number"
  ) {
    window.currentIndex = window.currentIndex;
    window.visualIndex = window.visualIndex;
    idx = window.currentIndex;
  } else {
    const lastId = localStorage.getItem("lastStationId");
    if (lastId) {
      idx = radioStations.findIndex((s) => s.id === lastId);
      if (idx >= 0) {
        window.currentIndex = idx;
        window.visualIndex = idx + numClones;
      } else {
        window.currentIndex = 0;
        window.visualIndex = numClones;
      }
    } else {
      window.currentIndex = 0;
      window.visualIndex = numClones;
    }
  }
  // Apply theme based on selected station
  if (idx === null) idx = currentIndex;
  const body = document.body;
  body.classList.remove("theme-gtaiii", "theme-gtavc", "theme-gtasa");
  const game = radioStations[idx].game;
  if (game === "gtaiii") body.classList.add("theme-gtaiii");
  else if (game === "gtavc") body.classList.add("theme-gtavc");
  else if (game === "gtasa") body.classList.add("theme-gtasa");
  updateCarousel(false);
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
    <img src="${station.logo}" alt="${station.name}" class="radio-logo" loading="lazy" decoding="async" fetchpriority="low" data-placeholder="${/placeholder\.(svg|png)$/i.test(station.logo)}"
      onerror="this.onerror=null;this.dataset.placeholder='true';this.src='img/placeholder.svg'">
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



  // Always center the card and open modal after transition
  window.visualIndex = cardIndexInDom;
  let stationIdx = cardIndexInDom - numClones;
  if (stationIdx < 0) stationIdx = radioStations.length + stationIdx;
  if (stationIdx >= radioStations.length)
    stationIdx = stationIdx - radioStations.length;
  window.currentIndex = stationIdx;
  try {
    localStorage.setItem(
      "lastStationId",
      radioStations[window.currentIndex].id
    );
  } catch {}
  isTransitioning = true;
  updateCarousel(true);
  // After transition, open modal if requested
  if (allowOpenModal && typeof openRadio === "function") {
    setTimeout(() => {
      openRadio(radioStations[stationIdx]);
    }, 350); // match transition duration
  }
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

  // Delegated click handling: always trigger focusStationByCard for any card click
  listEl.addEventListener("click", (e) => {
    if (isTransitioning) return;
    let card = e.target;
    // If clicking logo or child, walk up to .radio-card
    while (card && !card.classList.contains("radio-card")) {
      card = card.parentElement;
    }
    if (!card || !card.classList.contains("radio-card")) return;
    // Only open modal if the clicked card is already centered (middle one)
    const cards = Array.from(document.querySelectorAll(".radio-card"));
    const domIndex = cards.indexOf(card);
    const isCentered = domIndex === window.visualIndex;
    focusStationByCard(card, isCentered);
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
      // Swipe hint removed
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
    // Swipe hint removed
  });

  // Recenter on resize/orientation changes (mobile misalignment fix)
  let resizeRaf = null;
  const handleResize = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      // Force recalculation of translate based on new widths
      updateCarousel(false);
    });
  };
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", () => {
    // Some browsers fire orientationchange before layout settles
    setTimeout(handleResize, 50);
    setTimeout(handleResize, 250);
  });
}

// Move to next station
function moveToNext() {
  window.visualIndex++;
  const numStations = radioStations.length;
  const numClones = 3;
  if (
    window.visualIndex >= numClones &&
    window.visualIndex < numStations + numClones
  ) {
    window.currentIndex = window.visualIndex - numClones;
  }
  isTransitioning = true;
  updateCarousel(true);
  checkAndResetPosition();
}

// Move to previous station
function moveToPrevious() {
  window.visualIndex--;
  const numStations = radioStations.length;
  const numClones = 3;
  if (
    window.visualIndex >= numClones &&
    window.visualIndex < numStations + numClones
  ) {
    window.currentIndex = window.visualIndex - numClones;
  }
  isTransitioning = true;
  updateCarousel(true);
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
  // Some browsers may return 'normal' for gap; ensure a robust numeric value
  let gap = NaN;
  const gapCandidates = [
    carouselStyles.gap,
    carouselStyles.rowGap,
    carouselStyles.columnGap,
  ];
  for (const g of gapCandidates) {
    const v = parseFloat(g);
    if (!Number.isNaN(v) && isFinite(v)) {
      gap = v;
      break;
    }
  }
  // Final fallback: measure the visual gap between first two cards
  if ((Number.isNaN(gap) || !isFinite(gap)) && cards.length >= 2) {
    const r0 = cards[0].getBoundingClientRect();
    const r1 = cards[1].getBoundingClientRect();
    gap = Math.max(0, Math.round(r1.left - r0.right));
  }
  if (Number.isNaN(gap) || !isFinite(gap)) {
    // Heuristic fallback based on breakpoint
    gap = window.innerWidth <= 600 ? 14 : 20;
  }
  // Account for inner/outer padding: on mobile we set track padding to 0 and use wrapper padding
  const paddingLeftStr = carouselStyles.paddingLeft || "0";
  let paddingLeft = parseFloat(paddingLeftStr);
  if (Number.isNaN(paddingLeft)) paddingLeft = 0;

  // Use the actual card layout width (ignores transforms); fallback to 200px
  let cardWidth = 200;
  if (firstCard) {
    const w = firstCard.offsetWidth;
    if (w) cardWidth = w;
  }
  const offset = cardWidth + gap;

  // Calculate the center position using the wrapper (not the transformed track)
  const wrapper = document.querySelector(".carousel-wrapper");
  let centerOffset = 0;
  let targetOffsetLeft = null;
  if (cards[window.visualIndex]) {
    const targetCard = cards[window.visualIndex];
    const wrapperStyles = wrapper ? getComputedStyle(wrapper) : null;
    const wrapperPaddingLeft = wrapperStyles
      ? parseFloat(wrapperStyles.paddingLeft) || 0
      : 0;
    const wrapperPaddingRight = wrapperStyles
      ? parseFloat(wrapperStyles.paddingRight) || 0
      : 0;
    const wrapperWidthRaw =
      (wrapper && wrapper.clientWidth) || carouselElement.clientWidth || 0;
    const wrapperWidth = Math.max(
      0,
      wrapperWidthRaw - wrapperPaddingLeft - wrapperPaddingRight
    );
    const targetWidth = targetCard.offsetWidth || cardWidth;
    centerOffset = wrapperWidth / 2 - targetWidth / 2;
    // Use actual DOM layout offset to avoid rounding drift
    targetOffsetLeft = targetCard.offsetLeft;
  } else {
    const wrapperStyles = wrapper ? getComputedStyle(wrapper) : null;
    const wrapperPaddingLeft = wrapperStyles
      ? parseFloat(wrapperStyles.paddingLeft) || 0
      : 0;
    const wrapperPaddingRight = wrapperStyles
      ? parseFloat(wrapperStyles.paddingRight) || 0
      : 0;
    const wrapperWidthRaw =
      (wrapper && wrapper.clientWidth) || carouselElement.clientWidth || 0;
    const wrapperWidth = Math.max(
      0,
      wrapperWidthRaw - wrapperPaddingLeft - wrapperPaddingRight
    );
    centerOffset = wrapperWidth / 2 - cardWidth / 2;
  }
  // Compute translate using measured offsetLeft when possible for precision
  const translateX =
    targetOffsetLeft != null
      ? centerOffset - (targetOffsetLeft - paddingLeft)
      : centerOffset - window.visualIndex * offset - paddingLeft;

  // Enable or disable transition
  if (withTransition) {
    carouselElement.style.transition = "transform 0.3s ease";
  } else {
    carouselElement.style.transition = "none";
  }

  carouselElement.style.transform = `translateX(${translateX}px)`;

  // Cancel any pending autoplay debounce before scheduling a new one
  if (autoplayDebounceTimer) {
    clearTimeout(autoplayDebounceTimer);
    autoplayDebounceTimer = null;
  }
  // Schedule playback when transition completes (or debounced if no transition)
  const currentStationData = radioStations[window.currentIndex];
  if (withTransition) {
    if (playAfterTransitionTimer) clearTimeout(playAfterTransitionTimer);
    playAfterTransitionTimer = setTimeout(() => {
      isTransitioning = false;
      // Only trigger playback handoff if not already playing this station
      const alreadyThisStation = lastPlayedStationId === currentStationData.id;
      if (!alreadyThisStation) {
        // Debounce the autoplay slightly to avoid rapid nudge retriggers
        autoplayDebounceTimer = setTimeout(() => {
          // Confirm we're still pointing at the same station before playing
          if (lastPlayedStationId !== currentStationData.id) {
            playStaticThenStation(currentStationData);
            lastPlayedStationId = currentStationData.id;
          }
        }, AUTOPLAY_DEBOUNCE_MS);
      }
    }, 320);
  } else {
    isTransitioning = false;
    const alreadyThisStation = lastPlayedStationId === currentStationData.id;
    if (!alreadyThisStation) {
      autoplayDebounceTimer = setTimeout(() => {
        if (lastPlayedStationId !== currentStationData.id) {
          playStaticThenStation(currentStationData);
          lastPlayedStationId = currentStationData.id;
        }
      }, AUTOPLAY_DEBOUNCE_MS);
    }
  }

  // Update active state based only on station index.
  // This keeps both the clone and the real card active during the snap, avoiding visual flicker.
  const audioEl = document.getElementById("audioPlayer");
  const isPlaying = audioEl && !audioEl.paused && !!audioEl.src;
  cards.forEach((card) => {
    const dataIndex = parseInt(card.dataset.index);
    const actualIndex =
      ((dataIndex % radioStations.length) + radioStations.length) %
      radioStations.length;
    card.classList.toggle("active", actualIndex === window.currentIndex);
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

  // Apply theme with background crossfade
  applyThemeWithFade(currentStationData.game);

  // Update game logo based on current game
  updateGameLogo(currentStationData.game);

  // Autoplay handled above via scheduled playStaticThenStation
}
// Smoothly crossfade background when theme changes
function applyThemeWithFade(game) {
  const body = document.body;
  const fader = document.getElementById("bgFader");
  if (!body) return;

  // Respect reduced motion
  if (reduceMotion) {
    body.classList.remove("theme-gtaiii", "theme-gtavc", "theme-gtasa");
    if (game === "gtaiii") body.classList.add("theme-gtaiii");
    else if (game === "gtavc") body.classList.add("theme-gtavc");
    else if (game === "gtasa") body.classList.add("theme-gtasa");
    return;
  }

  // Prepare fader with the current background by freezing current body vars
  if (fader) {
    // Cancel any ongoing fade-out to avoid abrupt cuts
    if (bgFadeTimer) {
      try {
        clearTimeout(bgFadeTimer);
      } catch {}
      bgFadeTimer = null;
    }
    if (bgFadeDebounceTimer) {
      try {
        clearTimeout(bgFadeDebounceTimer);
      } catch {}
      bgFadeDebounceTimer = null;
    }
    const styles = getComputedStyle(body);
    const start = styles.getPropertyValue("--bg-start").trim();
    const end = styles.getPropertyValue("--bg-end").trim();
    fader.style.setProperty("--fader-bg-start", start);
    fader.style.setProperty("--fader-bg-end", end);
    // Jump to visible state without animating
    fader.style.transition = "none";
    fader.style.filter = "blur(10px)";
    fader.style.opacity = "1";
    // force reflow
    void fader.offsetWidth;
    // restore CSS-defined transition
    fader.style.transition = "";

    // While fader is visible, disable body background transition so changes behind don't pop
    body.style.transition = "none";
  }

  // Swap theme class on body
  body.classList.remove("theme-gtaiii", "theme-gtavc", "theme-gtasa");
  if (game === "gtaiii") body.classList.add("theme-gtaiii");
  else if (game === "gtavc") body.classList.add("theme-gtavc");
  else if (game === "gtasa") body.classList.add("theme-gtasa");

  // Debounce fade-out: keep fader up while user scrubs quickly
  if (fader) {
    bgFadeDebounceTimer = setTimeout(() => {
      fader.style.opacity = "0";
      fader.style.filter = "blur(0px)";
      // After fade duration, restore body's transition so future single changes animate
      bgFadeTimer = setTimeout(() => {
        body.style.transition = "";
        bgFadeTimer = null;
      }, 1500); // a bit longer than CSS 1400ms to be safe
      bgFadeDebounceTimer = null;
    }, 250); // wait for 250ms of idle before fading out
  }
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
  if (newSrc && gameLogo.getAttribute("src") !== newSrc) {
    gameLogo.style.opacity = "0";
    setTimeout(() => {
      gameLogo.src = newSrc;
      gameLogo.alt = game.toUpperCase() + " Logo";
      gameLogo.style.opacity = "1";
    }, 150);
  }
}
