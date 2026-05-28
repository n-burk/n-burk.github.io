// Interactive pipeline node-graph. Drag nodes, hover to inspect, tokens flow.
(function () {
  const stage = document.getElementById('graph-stage');
  const svg = document.getElementById('graph-svg');
  const nodesLayer = document.getElementById('graph-nodes');
  if (!stage || !svg || !nodesLayer) return;
  svg.classList.add('graph-svg');

  const NODES = [
    // ingest
    { id: 'scan',       stage: 'ingest',  nx: 0.00, ny: 0.20, name: 'scan / photogrammetry', impl: 'C++ · Splat', desc: 'High-density inputs from face/body scans and photogrammetry rigs. Normalized into a canonical splat representation upstream of solvers.' },
    { id: 'mocap',      stage: 'ingest',  nx: 0.00, ny: 0.50, name: 'mocap / pose',          impl: 'Python · USD', desc: 'Marker, video, and synthetic motion capture data — retargeted onto the canonical skeleton.' },
    { id: 'prompt',     stage: 'ingest',  nx: 0.00, ny: 0.80, name: 'prompt / reference',    impl: 'ML · Tokens',  desc: 'Text, sketch, or reference image describing the character, asset, or animation to generate.' },
    // solve
    { id: 'topology',   stage: 'solve',   nx: 0.34, ny: 0.10, name: 'topology solver',       impl: 'ML · Mesh',    desc: 'Generates a clean, animatable polygon mesh that matches the target form — consistent topology across the entire character family.' },
    { id: 'paramrig',   stage: 'solve',   nx: 0.34, ny: 0.30, name: 'parametric rig',        impl: 'C++ · Solver', desc: 'Fits a parametric skeleton and blendshape basis so a single rig drives millions of personalized identities.' },
    { id: 'hair',       stage: 'solve',   nx: 0.34, ny: 0.50, name: 'hair inference',        impl: 'ML · Strands', desc: 'Generates groomable hair from images or prompts. Strands are first-class USD primitives downstream.' },
    { id: 'cloth',      stage: 'solve',   nx: 0.34, ny: 0.70, name: 'cloth solver',          impl: 'C++ · Sim',    desc: 'Garment fit + simulation. Inherits constraints from the parametric rig so cloth lives correctly on every variant.' },
    { id: 'anim',       stage: 'solve',   nx: 0.34, ny: 0.90, name: 'anim synthesis',        impl: 'ML · Motion',  desc: 'Generative animation conditioned on mocap and prompt. Outputs USD-native skel animation channels.' },
    // compose
    { id: 'usdlayer',   stage: 'compose', nx: 0.68, ny: 0.22, name: 'usd layer stack',       impl: 'OpenUSD',      desc: 'Each character is composed from a stack of USD layers: identity, garments, hair, animation, overrides. Pixar-native.' },
    { id: 'variant',    stage: 'compose', nx: 0.68, ny: 0.50, name: 'variant set',           impl: 'OpenUSD',      desc: 'Variants for body shape, outfit, hair style, age, region. Resolved per-instance, cached at the store layer.' },
    { id: 'artcastle',  stage: 'compose', nx: 0.68, ny: 0.78, name: 'artcastle store',       impl: 'Cloud · USD',  desc: 'USD-based content store tracking dependencies across Meta Avatars, Codec Avatars, Fantastical Avatars, Instagram Pets — one graph, many products.' },
    // deliver
    { id: 'lod',        stage: 'deliver', nx: 1.00, ny: 0.26, name: 'lod bake',              impl: 'C++ · GPU',    desc: 'Bakes per-target LODs and platform-specific encodings — phone, headset, web.' },
    { id: 'stream',     stage: 'deliver', nx: 1.00, ny: 0.54, name: 'stream / FoA',          impl: 'CDN · Cache',  desc: 'Streamed to clients across the Family of Apps. Personalized, deduplicated, cached at edge.' },
    { id: 'client',     stage: 'deliver', nx: 1.00, ny: 0.82, name: 'client render',         impl: 'Noodles · GL', desc: 'Final render on device. The node-graph that started here is what runs there, too.' },
  ];

  const EDGES = [
    ['scan','topology'], ['scan','paramrig'],
    ['mocap','paramrig'], ['mocap','anim'],
    ['prompt','paramrig'], ['prompt','hair'], ['prompt','anim'],
    ['paramrig','hair'], ['paramrig','cloth'],
    ['topology','usdlayer'],
    ['paramrig','usdlayer'], ['paramrig','variant'],
    ['hair','usdlayer'], ['hair','variant'],
    ['cloth','usdlayer'],
    ['anim','variant'],
    ['usdlayer','artcastle'], ['usdlayer','lod'],
    ['variant','artcastle'], ['variant','lod'],
    ['artcastle','stream'],
    ['lod','stream'],
    ['stream','client'],
  ].map(([from, to]) => ({ from, to }));

  let W = 0, H = 0;
  const pos = {};
  const nodeEls = {};
  const edgeEls = [];
  const tokens = [];
  let dragging = null;
  let raf = 0;

  function size() {
    const rect = stage.getBoundingClientRect();
    W = rect.width; H = rect.height;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // Inset padding so wide node labels never clip the stage edges
    const padX = 110, padY = 24;
    const innerW = Math.max(40, W - padX * 2);
    const innerH = Math.max(40, H - padY * 2);
    NODES.forEach(n => {
      pos[n.id] = {
        x: padX + n.nx * innerW,
        y: padY + n.ny * innerH,
      };
    });
    layoutNodes();
    updateEdges();
  }

  function build() {
    NODES.forEach((n, i) => {
      const el = document.createElement('div');
      el.className = 'graph-node';
      el.dataset.id = n.id;
      el.dataset.stage = n.stage;
      el.innerHTML = `<span class="badge"></span>${n.name}<span class="ix">[${String(i).padStart(2,'0')}]</span>`;
      el.addEventListener('mouseenter', () => setActive(n.id));
      el.addEventListener('mousedown', e => startDrag(n.id, e));
      el.addEventListener('touchstart', e => startDrag(n.id, e), { passive: false });
      nodesLayer.appendChild(el);
      nodeEls[n.id] = el;
    });
    EDGES.forEach((e, i) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'edge');
      svg.appendChild(path);
      edgeEls[i] = path;
    });
    EDGES.forEach((e, i) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', 'token');
      c.setAttribute('r', 2);
      svg.appendChild(c);
      tokens.push({
        edge: i,
        t: Math.random(),
        speed: 0.18 + Math.random() * 0.24,
        el: c,
      });
    });
  }

  function layoutNodes() {
    NODES.forEach(n => {
      const p = pos[n.id];
      const el = nodeEls[n.id];
      el.style.left = p.x + 'px';
      el.style.top = p.y + 'px';
    });
  }

  function bezierD(p0, p1) {
    const dx = Math.max(60, p1.x - p0.x);
    const cx0 = p0.x + dx * 0.55;
    const cx1 = p1.x - dx * 0.55;
    return `M ${p0.x} ${p0.y} C ${cx0} ${p0.y} ${cx1} ${p1.y} ${p1.x} ${p1.y}`;
  }

  function bezierAt(p0, p1, t) {
    const dx = Math.max(60, p1.x - p0.x);
    const c0 = { x: p0.x + dx * 0.55, y: p0.y };
    const c1 = { x: p1.x - dx * 0.55, y: p1.y };
    const it = 1 - t;
    return {
      x: it*it*it*p0.x + 3*it*it*t*c0.x + 3*it*t*t*c1.x + t*t*t*p1.x,
      y: it*it*it*p0.y + 3*it*it*t*c0.y + 3*it*t*t*c1.y + t*t*t*p1.y,
    };
  }

  function updateEdges() {
    EDGES.forEach((e, i) => {
      edgeEls[i].setAttribute('d', bezierD(pos[e.from], pos[e.to]));
    });
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      tok.t += dt * tok.speed;
      if (tok.t > 1) tok.t -= 1;
      const e = EDGES[tok.edge];
      const p = bezierAt(pos[e.from], pos[e.to], tok.t);
      tok.el.setAttribute('cx', p.x);
      tok.el.setAttribute('cy', p.y);
    }
    raf = requestAnimationFrame(tick);
  }

  function setActive(id) {
    Object.entries(nodeEls).forEach(([k, el]) => {
      el.dataset.active = String(k === id);
    });
    EDGES.forEach((e, i) => {
      edgeEls[i].dataset.hot = String(e.from === id || e.to === id);
    });
    const n = NODES.find(x => x.id === id);
    if (!n) return;
    document.getElementById('ins-id').textContent = `id: ${id}`;
    document.getElementById('ins-name').textContent = n.name;
    document.getElementById('ins-stage').textContent = `stage · ${n.stage}`;
    document.getElementById('ins-desc').textContent = n.desc;
    document.getElementById('ins-stats').innerHTML = `
      <div class="row"><span>inputs</span><b>${EDGES.filter(e => e.to === id).length}</b></div>
      <div class="row"><span>outputs</span><b>${EDGES.filter(e => e.from === id).length}</b></div>
      <div class="row"><span>impl</span><b>${n.impl}</b></div>
    `;
  }

  function startDrag(id, e) {
    const rect = stage.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const p = pos[id];
    dragging = { id, dx: cx - p.x, dy: cy - p.y };
    setActive(id);
    e.preventDefault && e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    const rect = stage.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const p = pos[dragging.id];
    p.x = Math.max(60, Math.min(W - 40, cx - dragging.dx));
    p.y = Math.max(16, Math.min(H - 16, cy - dragging.dy));
    const el = nodeEls[dragging.id];
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    updateEdges();
    e.preventDefault && e.preventDefault();
  }
  function onUp() { dragging = null; }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchend', onUp);
  window.addEventListener('resize', size);

  build();
  size();
  setActive('paramrig');
  raf = requestAnimationFrame(tick);
})();
