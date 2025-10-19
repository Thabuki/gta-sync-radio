// Audio visualizer module
function setupVisualizer() {
  const { audioPlayer, viz } =
    PlayerState;

  viz.canvas = document.getElementById(
    "bgVisualizer"
  );
  if (!viz.canvas || !audioPlayer)
    return;
  viz.ctx = viz.canvas.getContext("2d");

  // Resize handler
  const resize = () => {
    const dpr =
      window.devicePixelRatio || 1;
    const cssW = Math.ceil(
      viz.canvas.clientWidth
    );
    const cssH = Math.ceil(
      viz.canvas.clientHeight
    );
    viz.canvas.width = Math.floor(
      cssW * dpr
    );
    viz.canvas.height = Math.floor(
      cssH * dpr
    );
    viz.ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );
  };
  window.addEventListener(
    "resize",
    resize
  );
  resize();

  // Lazily create AudioContext when user interacts (play)
  const ensureNodes = () => {
    if (viz.analyser) return;
    try {
      viz.audioCtx =
        new (window.AudioContext ||
          window.webkitAudioContext)();
      const source =
        viz.audioCtx.createMediaElementSource(
          audioPlayer
        );
      viz.analyser =
        viz.audioCtx.createAnalyser();
      viz.analyser.fftSize = 256;
      const bufferLength =
        viz.analyser.frequencyBinCount;
      viz.dataArray = new Uint8Array(
        bufferLength
      );
      source.connect(viz.analyser);
      viz.analyser.connect(
        viz.audioCtx.destination
      );
    } catch {}
  };

  const draw = () => {
    if (!viz.ctx || !viz.analyser)
      return;
    viz.rafId =
      requestAnimationFrame(draw);
    viz.analyser.getByteFrequencyData(
      viz.dataArray
    );
    const width = Math.ceil(
      viz.canvas.clientWidth
    );
    const height = Math.ceil(
      viz.canvas.clientHeight
    );
    viz.ctx.clearRect(
      0,
      0,
      width,
      height
    );

    const barCount = 64;
    const gap = 2;
    const available = Math.max(
      0,
      width - gap * (barCount - 1)
    );
    const baseBarWidth = Math.max(
      1,
      Math.floor(available / barCount)
    );
    const remainder = Math.max(
      0,
      available -
        baseBarWidth * barCount
    );
    const groupWidth =
      baseBarWidth * barCount +
      remainder +
      gap * (barCount - 1);

    let x = Math.max(
      0,
      Math.floor(
        (width - groupWidth) / 2
      )
    );
    for (let i = 0; i < barCount; i++) {
      const add = i < remainder ? 1 : 0;
      let bw = baseBarWidth + add;
      const v = viz.dataArray[i] / 255;
      const barHeight =
        v * (height * 0.35);
      const y = height - barHeight - 20;
      const grad =
        viz.ctx.createLinearGradient(
          x,
          y,
          x,
          y + barHeight
        );
      grad.addColorStop(
        0,
        "rgba(255,255,255,0.6)"
      );
      grad.addColorStop(
        1,
        "rgba(255,255,255,0.0)"
      );
      viz.ctx.fillStyle = grad;
      viz.ctx.fillRect(
        x,
        y,
        bw,
        barHeight
      );
      x +=
        bw +
        (i < barCount - 1 ? gap : 0);
    }
  };

  const start = async () => {
    try {
      ensureNodes();
      if (
        viz.audioCtx &&
        viz.audioCtx.state ===
          "suspended"
      ) {
        await viz.audioCtx.resume();
      }
      if (!viz.rafId)
        viz.rafId =
          requestAnimationFrame(draw);
    } catch {}
  };

  const stop = () => {
    if (viz.rafId) {
      cancelAnimationFrame(viz.rafId);
      viz.rafId = null;
    }
  };

  audioPlayer.addEventListener(
    "play",
    start
  );
  audioPlayer.addEventListener(
    "pause",
    stop
  );
  audioPlayer.addEventListener(
    "ended",
    stop
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stop();
      else if (!audioPlayer.paused)
        start();
    }
  );
}

window.setupVisualizer =
  setupVisualizer;
