// Toast notification module
function showNowPlayingToast(station) {
  const activeStation =
    (typeof PlayerState !==
      "undefined" &&
      PlayerState.currentStation) ||
    station;
  if (!activeStation) return;
  let toast = document.getElementById(
    "nowPlayingToast"
  );
  if (!toast) {
    // Create toast dynamically if not present in DOM
    toast =
      document.createElement("div");
    toast.id = "nowPlayingToast";
    toast.className =
      "now-playing-toast";
    toast.setAttribute(
      "aria-live",
      "polite"
    );
    toast.setAttribute(
      "aria-atomic",
      "true"
    );
    toast.innerHTML = `
      <img id="toastLogo" alt="Station Logo" />
      <div class="toast-text">
        <strong id="toastTitle">Now Playing</strong>
        <span id="toastTrack"></span>
      </div>
    `;
    document.body.appendChild(toast);
  }

  const logo = document.getElementById(
    "toastLogo"
  );
  const title = document.getElementById(
    "toastTitle"
  );
  const trackSpan =
    document.getElementById(
      "toastTrack"
    );

  logo.src = activeStation.logo;
  title.textContent = "Now Playing";
  // Station name omitted in toast per design; logo is sufficient

  // Get and display current track
  const currentTrack = getCurrentTrack(
    activeStation
  );
  if (currentTrack && trackSpan) {
    trackSpan.textContent = `${currentTrack.artist} - ${currentTrack.title}`;
  } else if (trackSpan) {
    trackSpan.textContent = "";
  }

  toast.hidden = false;
  // Animate in
  toast.classList.add("show");
  // Auto-hide after 2.5s
  if (PlayerState.toastTimer)
    clearTimeout(
      PlayerState.toastTimer
    );
  PlayerState.toastTimer = setTimeout(
    () => {
      toast.classList.remove("show");
    },
    2500
  );
}

function showNowPlayingToastForTrack(
  station,
  track
) {
  const activeStation =
    (typeof PlayerState !==
      "undefined" &&
      PlayerState.currentStation) ||
    station;
  if (!activeStation) return;
  let toast = document.getElementById(
    "nowPlayingToast"
  );
  if (!toast) {
    // Create toast dynamically if not present in DOM
    toast =
      document.createElement("div");
    toast.id = "nowPlayingToast";
    toast.className =
      "now-playing-toast";
    toast.setAttribute(
      "aria-live",
      "polite"
    );
    toast.setAttribute(
      "aria-atomic",
      "true"
    );
    toast.innerHTML = `
      <img id="toastLogo" alt="Station Logo" />
      <div class="toast-text">
        <strong id="toastTitle">Now Playing</strong>
        <span id="toastTrack"></span>
      </div>
    `;
    document.body.appendChild(toast);
  }

  const logo = document.getElementById(
    "toastLogo"
  );
  const title = document.getElementById(
    "toastTitle"
  );
  const trackSpan =
    document.getElementById(
      "toastTrack"
    );

  logo.src = activeStation.logo;
  title.textContent = "Now Playing";
  // Station name omitted in toast per design; logo is sufficient

  if (track && trackSpan) {
    trackSpan.textContent = `${track.artist} - ${track.title}`;
  } else if (trackSpan) {
    trackSpan.textContent = "";
  }

  toast.hidden = false;
  toast.classList.add("show");
  if (PlayerState.toastTimer)
    clearTimeout(
      PlayerState.toastTimer
    );
  PlayerState.toastTimer = setTimeout(
    () => {
      toast.classList.remove("show");
    },
    2500
  );
}

window.showNowPlayingToast =
  showNowPlayingToast;
window.showNowPlayingToastForTrack =
  showNowPlayingToastForTrack;
