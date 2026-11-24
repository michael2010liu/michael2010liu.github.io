// Synthetic EEG montage. Everything here is generated, not recorded.
(() => {
  const canvas = document.getElementById("eeg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const readout = document.querySelector(".readout");
  const buttons = document.querySelectorAll(".state-btn");
  const DEFAULT_READOUT = "Hover a channel";
  const stateGroup = document.querySelector(".state");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FS = 250;           // samples per second
  const WINDOW = 6;         // seconds on screen
  const N = FS * WINDOW;

  // Channels, front of head to back. alpha = how strongly each site shows the
  // posterior alpha rhythm; blink = how much an eye blink reaches it.
  const channels = [
    { name: "Fp1", alpha: 0.15, blink: 1.0 },
    { name: "Fp2", alpha: 0.15, blink: 1.0 },
    { name: "F3",  alpha: 0.25, blink: 0.45 },
    { name: "F4",  alpha: 0.25, blink: 0.45 },
    { name: "C3",  alpha: 0.45, blink: 0.12 },
    { name: "C4",  alpha: 0.45, blink: 0.12 },
    { name: "O1",  alpha: 1.0,  blink: 0.0 },
    { name: "O2",  alpha: 1.0,  blink: 0.0 },
  ];

  const css = getComputedStyle(document.documentElement);
  const col = (v) => css.getPropertyValue(v).trim();
  const INK = col("--ink"), INK3 = col("--ink-3"), GRID = col("--grid"), FIELD = col("--field");

  // Per-channel oscillator state so each trace has its own character.
  const state = channels.map((c, i) => ({
    buf: new Float32Array(N),
    phaseA: Math.random() * Math.PI * 2,
    phaseT: Math.random() * Math.PI * 2,
    phaseB: Math.random() * Math.PI * 2,
    fA: 9.6 + Math.random() * 0.9,
    pink: 0, pink2: 0,
    envA: 1,
  }));

  let eyes = "closed";
  let alphaGain = 1;        // eased toward target
  let blinkT = -1;          // seconds since a blink started, -1 = none
  let nextBlink = 1.2;
  let head = 0;             // write index into ring buffer
  let t = 0;

  function gaussian() {
    return (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.87;
  }

  function sample() {
    const dt = 1 / FS;
    t += dt;
    const target = eyes === "closed" ? 1 : 0.18;
    alphaGain += (target - alphaGain) * 0.004;

    // Blinks only happen with eyes open.
    if (eyes === "open") {
      nextBlink -= dt;
      if (nextBlink <= 0 && blinkT < 0) { blinkT = 0; nextBlink = 2 + Math.random() * 3; }
    }
    let blink = 0;
    if (blinkT >= 0) {
      const x = blinkT / 0.28;
      blink = x < 1 ? Math.sin(Math.PI * x) ** 2 * 70 : 0;
      blinkT += dt;
      if (blinkT > 0.28) blinkT = -1;
    }

    for (let i = 0; i < channels.length; i++) {
      const c = channels[i], s = state[i];
      // Slow waxing and waning of alpha, as in real recordings.
      s.envA = 0.75 + 0.25 * Math.sin(t * 0.9 + i * 0.7) + 0.08 * gaussian();
      s.phaseA += 2 * Math.PI * s.fA * dt;
      s.phaseT += 2 * Math.PI * 6.1 * dt;
      s.phaseB += 2 * Math.PI * 19 * dt;
      // Cheap pink-ish background noise.
      s.pink = s.pink * 0.97 + gaussian() * 2.2;
      s.pink2 = s.pink2 * 0.6 + gaussian() * 2.4;

      const alpha = 32 * c.alpha * alphaGain * s.envA * Math.sin(s.phaseA);
      const theta = 6 * Math.sin(s.phaseT);
      const beta = (eyes === "open" ? 4 : 2.5) * Math.sin(s.phaseB);
      const v = alpha + theta + beta + s.pink + s.pink2 + blink * c.blink;
      s.buf[head] = v;
    }
    head = (head + 1) % N;
  }

  // Pre-fill so the montage opens on a full screen of signal.
  for (let k = 0; k < N; k++) sample();

  let W = 0, H = 0, dpr = 1;
  const LABEL_W = 52;
  const PAD_Y = 18;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  let reveal = reduceMotion ? 1 : 0;
  let hover = null;

  function draw() {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    const plotW = W - LABEL_W - 12;
    const rowH = (H - PAD_Y * 2) / channels.length;
    const visS = visibleSeconds(plotW), visN = Math.round(visS * FS), off = N - visN;
    const scale = rowH / 150; // µV to px: each row spans ±75 µV

    // Chart-paper grid: one vertical line per second, faint half-seconds.
    ctx.lineWidth = 1;
    for (let s = 0; s <= visS * 2; s++) {
      const x = LABEL_W + (s / (visS * 2)) * plotW;
      ctx.strokeStyle = GRID;
      ctx.globalAlpha = s % 2 === 0 ? 1 : 0.45;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.font = `500 12px ${col("--mono")}`;
    ctx.textBaseline = "middle";
    const maxX = LABEL_W + plotW * easeOut(reveal);

    for (let i = 0; i < channels.length; i++) {
      const y0 = PAD_Y + rowH * (i + 0.5);
      const isHover = hover && hover.ch === i;
      ctx.fillStyle = isHover ? FIELD : INK3;
      ctx.fillText(channels[i].name, 14, y0);

      ctx.save();
      ctx.beginPath(); ctx.rect(LABEL_W, 0, maxX - LABEL_W, H); ctx.clip();
      ctx.strokeStyle = isHover ? FIELD : INK;
      ctx.lineWidth = isHover ? 1.5 : 1.15;
      ctx.lineJoin = "round";
      ctx.beginPath();
      const buf = state[i].buf;
      const step = Math.max(1, Math.floor(visN / plotW / 1.5));
      for (let k = 0; k < visN; k += step) {
        const v = buf[(head + off + k) % N];
        const x = LABEL_W + (k / (visN - 1)) * plotW;
        const y = y0 - v * scale;
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Hover cursor.
    if (hover) {
      ctx.strokeStyle = FIELD;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(hover.x) + 0.5, 0); ctx.lineTo(Math.round(hover.x) + 0.5, H); ctx.stroke();
    }

  }

  // Narrow screens show fewer seconds so the rhythm stays legible.
  function visibleSeconds(plotW) { return Math.min(WINDOW, Math.max(2, Math.round(plotW / 110))); }

  function easeOut(x) { return 1 - Math.pow(1 - x, 4); }

  // Animation loop, paused when off screen.
  let running = false, last = 0, acc = 0, start = 0;
  function frame(now) {
    if (!running) return;
    if (!last) { last = now; start = now; }
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt * FS;
    while (acc >= 1) { sample(); acc -= 1; }
    if (reveal < 1) reveal = Math.min(1, Math.max(0, (now - start - 240) / 1400));
    if (hover) updateReadout();
    draw();
    requestAnimationFrame(frame);
  }
  let paused = reduceMotion;
  const pauseBtn = document.querySelector(".eeg-pause");
  pauseBtn.setAttribute("aria-pressed", String(paused));
  pauseBtn.setAttribute("aria-label", paused ? "Play the trace" : "Pause the trace");
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.setAttribute("aria-label", paused ? "Play the trace" : "Pause the trace");
    if (paused) { stop(); reveal = 1; draw(); } else play();
  });
  function play() { if (running || paused) return; running = true; last = 0; requestAnimationFrame(frame); }
  function stop() { running = false; }

  const io = new IntersectionObserver((entries) => {
    entries[0].isIntersecting ? play() : stop();
  });
  io.observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));

  function updateReadout() {
    const plotW = W - LABEL_W - 12;
    const frac = Math.min(1, Math.max(0, (hover.x - LABEL_W) / plotW));
    const visS = visibleSeconds(plotW), visN = Math.round(visS * FS);
    const k = Math.round(frac * (visN - 1));
    const v = state[hover.ch].buf[(head + N - visN + k) % N];
    const secs = (frac * visS - visS).toFixed(2);
    readout.textContent = `${channels[hover.ch].name}  ${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} µV  ${secs} s`;
  }

  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < LABEL_W) { hover = null; readout.textContent = DEFAULT_READOUT; readout.classList.remove("is-active"); draw(); return; }
    hover = { x, ch: Math.max(0, Math.min(channels.length - 1, Math.floor((y - PAD_Y) / ((H - PAD_Y * 2) / channels.length)))) };
    readout.classList.add("is-active");
    updateReadout();
    if (!running) draw();
  });
  canvas.addEventListener("pointerleave", () => {
    hover = null;
    readout.textContent = DEFAULT_READOUT;
    readout.classList.remove("is-active");
    if (!running) draw();
  });

  buttons.forEach((b) => b.addEventListener("click", () => {
    eyes = b.dataset.state;
    buttons.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    stateGroup.dataset.active = eyes;
    if (eyes === "open") nextBlink = 0.4;
    if (paused) {
      // No animation: jump straight to the new condition and redraw once.
      alphaGain = eyes === "closed" ? 1 : 0.18;
      for (let k = 0; k < N; k++) sample();
      draw();
    }
  }));

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
})();

// Show the header once the reader leaves the opening screen.
(() => {
  const top = document.querySelector(".top");
  const onScroll = () => top.classList.toggle("is-scrolled", window.scrollY > window.innerHeight * 0.55);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

// Butterflies: each one flutters around its spot in the margin, and flies off
// when the cursor (or a tap) comes near, then drifts back home a few seconds later.
(() => {
  const layer = document.querySelector(".flutter");
  if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  layer.classList.add("is-flying");

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  const flies = [...layer.querySelectorAll("img")].map((el) => ({
    el,
    home: { x: 0, y: 0 }, size: 0,
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    // own wander pattern, so no two move in step
    fx: rand(0.12, 0.3), fy: rand(0.1, 0.25), px: rand(0, TAU), py: rand(0, TAU),
    reach: rand(35, 70),
    angle: parseFloat(el.style.getPropertyValue("--r")) * Math.PI / 180 || 0,
    flap: rand(0, TAU),
    mode: "wander", until: 0, away: { x: 0, y: 0 },
  }));

  // Homes come from the CSS layout, so resizing keeps them in the margins.
  function measure() {
    for (const f of flies) {
      f.el.style.transform = "none";
      if (!f.el.offsetParent) { f.size = 0; continue; }   // hidden on small screens
      f.size = Math.max(f.el.offsetWidth, f.el.offsetHeight);
      f.home = { x: f.el.offsetLeft + f.el.offsetWidth / 2, y: f.el.offsetTop + f.el.offsetHeight / 2 };
      if (!f.placed) { f.pos = { ...f.home }; f.placed = true; }
    }
  }

  function scare(x, y) {
    const now = performance.now() / 1000;
    for (const f of flies) {
      if (!f.size || f.mode === "flee") continue;
      const dx = f.pos.x - x, dy = f.pos.y - y;
      const d = Math.hypot(dx, dy);
      if (d > f.size / 2 + 40) continue;
      // away from the pointer, a little upward, with some scatter
      const a = Math.atan2(dy, dx) + rand(-0.5, 0.5);
      f.away = { x: Math.cos(a), y: Math.sin(a) - 0.6 };
      const n = Math.hypot(f.away.x, f.away.y);
      f.away.x /= n; f.away.y /= n;
      f.vel = { x: f.away.x * 420, y: f.away.y * 420 };
      f.mode = "flee";
      f.until = now + rand(1.2, 1.8);
    }
  }

  const point = (e) => {
    const r = layer.getBoundingClientRect();
    scare(e.clientX - r.left, e.clientY - r.top);
  };
  window.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") point(e); }, { passive: true });
  window.addEventListener("pointerdown", point, { passive: true });

  let last = 0, raf = 0;
  function frame(ms) {
    const now = ms / 1000;
    const dt = Math.min(0.05, now - (last || now));
    last = now;

    for (const f of flies) {
      if (!f.size) continue;
      let tx, ty, max, steer;
      if (f.mode === "flee") {
        tx = f.pos.x + f.away.x * 400; ty = f.pos.y + f.away.y * 400;
        max = 520; steer = 3;
        if (now > f.until) { f.mode = "return"; f.until = now + rand(1.5, 3.5); }
      } else if (f.mode === "return" && now < f.until) {
        // hang about out there for a moment before heading back
        tx = f.pos.x + Math.sin(now * 2 + f.px) * 60; ty = f.pos.y + Math.cos(now * 1.7 + f.py) * 40;
        max = 90; steer = 1.5;
      } else {
        tx = f.home.x + Math.sin(now * f.fx * TAU + f.px) * f.reach;
        ty = f.home.y + Math.sin(now * f.fy * TAU + f.py) * f.reach * 0.6;
        const far = Math.hypot(tx - f.pos.x, ty - f.pos.y) > 120;
        max = far ? 160 : 45; steer = far ? 1.6 : 1.2;
        if (f.mode === "return" && !far) f.mode = "wander";
      }

      // steer toward the target, capped at this mode's top speed
      let wx = (tx - f.pos.x) * 1.5, wy = (ty - f.pos.y) * 1.5;
      const w = Math.hypot(wx, wy);
      if (w > max) { wx *= max / w; wy *= max / w; }
      f.vel.x += (wx - f.vel.x) * Math.min(1, steer * dt);
      f.vel.y += (wy - f.vel.y) * Math.min(1, steer * dt);
      f.pos.x += f.vel.x * dt;
      f.pos.y += f.vel.y * dt;

      // face the way it's flying (head is "up" in the plates); ease the turn
      const speed = Math.hypot(f.vel.x, f.vel.y);
      if (speed > 12) {
        const want = Math.atan2(f.vel.x, -f.vel.y);
        let diff = ((want - f.angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
        f.angle += diff * Math.min(1, (f.mode === "flee" ? 10 : 2.5) * dt);
      }

      // wingbeats: quick close, longer open; faster when it's in a hurry
      f.flap += dt * TAU * (2.2 + speed / 45);
      const beat = Math.pow(0.5 - 0.5 * Math.cos(f.flap), 1.6);
      const sx = 1 - 0.72 * beat;

      f.el.style.transform =
        `translate(${(f.pos.x - f.home.x).toFixed(1)}px, ${(f.pos.y - f.home.y).toFixed(1)}px) rotate(${f.angle.toFixed(3)}rad) scaleX(${sx.toFixed(3)})`;
    }
    raf = requestAnimationFrame(frame);
  }

  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  measure();
  start();
})();
