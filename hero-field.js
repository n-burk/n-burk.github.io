// Drifting point-cloud — Gaussian splat in spirit, not in fact.
// Subtle: low contrast, gentle parallax to mouse.
(function () {
  const canvas = document.getElementById('hero-field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0, H = 0;
  let points = [];
  let mouse = { x: 0.5, y: 0.5, on: false };
  let raf = 0;

  const settings = window.__heroFieldSettings || (window.__heroFieldSettings = {
    count: 380,
    accent: 'oklch(0.78 0.18 145)',
    ink: '#e8e6e1',
    showAccent: true,
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function seed() {
    points = [];
    const n = settings.count;
    for (let i = 0; i < n; i++) {
      // Cluster around right side, with a few stragglers everywhere
      const cluster = Math.random() < 0.7;
      const cx = cluster ? 0.72 + (Math.random() - 0.5) * 0.4 : Math.random();
      const cy = cluster ? 0.55 + (Math.random() - 0.5) * 0.7 : Math.random();
      points.push({
        x: cx, y: cy,
        bx: cx, by: cy,
        z: Math.random(), // depth, 0 = far, 1 = near
        r: 0.7 + Math.random() * 1.8,
        a: 0.2 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0006 + Math.random() * 0.001,
        accent: settings.showAccent && Math.random() < 0.06,
      });
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const parX = (mouse.on ? (mouse.x - 0.5) : 0) * 24;
    const parY = (mouse.on ? (mouse.y - 0.5) : 0) * 16;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const drift = Math.sin(t * p.speed + p.phase) * 0.005;
      const xN = p.bx + drift * (1 - p.z);
      const yN = p.by + Math.cos(t * p.speed * 0.7 + p.phase) * 0.004 * (1 - p.z);
      const x = xN * W + parX * (p.z * 0.8 + 0.2);
      const y = yN * H + parY * (p.z * 0.8 + 0.2);
      const r = p.r * (0.6 + p.z * 0.8);
      const alpha = p.a * (0.35 + p.z * 0.65);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (p.accent) {
        ctx.fillStyle = settings.accent;
        ctx.globalAlpha = alpha * 1.0;
      } else {
        ctx.fillStyle = settings.ink;
        ctx.globalAlpha = alpha * 0.5;
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX);
    const cy = (e.touches ? e.touches[0].clientY : e.clientY);
    mouse.x = (cx - rect.left) / rect.width;
    mouse.y = (cy - rect.top) / rect.height;
    mouse.on = true;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });

  resize();
  raf = requestAnimationFrame(draw);

  window.__heroFieldRebuild = () => { seed(); };
})();
