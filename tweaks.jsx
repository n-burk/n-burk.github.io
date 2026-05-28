// Tweaks panel — accent color + hero density + dark/light mode (warm/cool paper)
const { useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#0c0d10", "#e8e6e1", "#6dd66d"],
  "heroDensity": 380,
  "heroAccent": true,
  "italicHeadings": true
}/*EDITMODE-END*/;

const PALETTES = [
  // [paper, ink, accent]
  ['#0c0d10', '#e8e6e1', '#6dd66d'], // terminal green (default)
  ['#0a0d12', '#e6ebf2', '#5fb3ff'], // deep cyan
  ['#100c14', '#ece4f0', '#c97aff'], // void violet
  ['#0e0c0a', '#f0e8d8', '#ff8a3d'], // amber CRT
];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply palette
  useEffect(() => {
    const [paper, ink, accent] = t.palette;
    const isDark = paper && parseInt(paper.slice(1, 3), 16) < 80;
    const root = document.documentElement.style;
    root.setProperty('--paper', paper);
    root.setProperty('--ink', ink);
    root.setProperty('--accent', accent);

    if (isDark) {
      root.setProperty('--paper-2', shade(paper, 0.04));
      root.setProperty('--paper-3', shade(paper, 0.08));
      root.setProperty('--ink-soft', shade(ink, -0.32));
      root.setProperty('--ink-muted', shade(ink, -0.58));
      root.setProperty('--line', shade(paper, 0.10));
      root.setProperty('--line-strong', shade(paper, 0.18));
    } else {
      // tint paper-2/3 relative to paper
      root.setProperty('--paper-2', shade(paper, -0.04));
      root.setProperty('--paper-3', shade(paper, -0.08));
      root.setProperty('--ink-soft', shade(ink, 0.20));
      root.setProperty('--ink-muted', shade(ink, 0.45));
      root.setProperty('--line', shade(paper, -0.12));
      root.setProperty('--line-strong', shade(paper, -0.22));
    }

    // Propagate to hero field
    if (window.__heroFieldSettings) {
      window.__heroFieldSettings.accent = accent;
      window.__heroFieldSettings.ink = ink;
      window.__heroFieldSettings.showAccent = t.heroAccent;
      window.__heroFieldSettings.count = t.heroDensity;
      window.__heroFieldRebuild && window.__heroFieldRebuild();
    }
  }, [t.palette, t.heroAccent, t.heroDensity]);

  // Italic headings toggle
  useEffect(() => {
    document.documentElement.style.setProperty('--italic-display', t.italicHeadings ? 'italic' : 'normal');
    document.querySelectorAll('h1 .it, h2 .it, h3 .it, .it').forEach(el => {
      el.style.fontStyle = t.italicHeadings ? '' : 'normal';
    });
  }, [t.italicHeadings]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Palette">
        <TweakColor
          k="palette"
          value={t.palette}
          onChange={(v) => setTweak('palette', v)}
          options={PALETTES}
        />
      </TweakSection>
      <TweakSection label="Hero point cloud">
        <TweakSlider
          k="heroDensity"
          label="Density"
          min={120}
          max={900}
          step={20}
          value={t.heroDensity}
          onChange={(v) => setTweak('heroDensity', v)}
        />
        <TweakToggle
          k="heroAccent"
          label="Accent particles"
          value={t.heroAccent}
          onChange={(v) => setTweak('heroAccent', v)}
        />
      </TweakSection>
      <TweakSection label="Type">
        <TweakToggle
          k="italicHeadings"
          label="Italic flourish in headings"
          value={t.italicHeadings}
          onChange={(v) => setTweak('italicHeadings', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// utility — shade a hex by mixing with white/black
function shade(hex, amt) {
  if (!hex || hex[0] !== '#') return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = amt < 0 ? 0 : 255;
  const a = Math.abs(amt);
  const nr = Math.round(r * (1 - a) + mix * a);
  const ng = Math.round(g * (1 - a) + mix * a);
  const nb = Math.round(b * (1 - a) + mix * a);
  return '#' + [nr, ng, nb].map(x => x.toString(16).padStart(2, '0')).join('');
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<App />);
