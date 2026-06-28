// SVG turbulence filters that give the rubber-stamp impressions their worn,
// uneven-ink edges. Render once on any page that draws entry stamps.
export default function InkFilters() {
  const filters = [
    { id: "ink0", bf: 0.012, seed: 2, scale: 2.6, bf2: 0.16, seed2: 5, slope: -1.7, intercept: 1.55, oct: 4 },
    { id: "ink1", bf: 0.015, seed: 8, scale: 2.3, bf2: 0.19, seed2: 3, slope: -1.9, intercept: 1.6, oct: 4 },
    { id: "ink2", bf: 0.01, seed: 5, scale: 3.0, bf2: 0.14, seed2: 9, slope: -1.6, intercept: 1.5, oct: 5 },
    { id: "ink3", bf: 0.018, seed: 12, scale: 2.1, bf2: 0.21, seed2: 1, slope: -2.0, intercept: 1.62, oct: 4 },
    { id: "ink4", bf: 0.013, seed: 20, scale: 2.7, bf2: 0.17, seed2: 7, slope: -1.8, intercept: 1.58, oct: 4 },
  ];
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {filters.map((f) => (
          <filter key={f.id} id={f.id} x="-18%" y="-18%" width="136%" height="136%">
            <feTurbulence type="fractalNoise" baseFrequency={f.bf} numOctaves={f.oct} seed={f.seed} result="b" />
            <feDisplacementMap in="SourceGraphic" in2="b" scale={f.scale} xChannelSelector="R" yChannelSelector="G" result="d" />
            <feTurbulence type="fractalNoise" baseFrequency={f.bf2} numOctaves={3} seed={f.seed2} result="f" />
            <feComponentTransfer in="f" result="m">
              <feFuncA type="linear" slope={f.slope} intercept={f.intercept} />
            </feComponentTransfer>
            <feComposite in="d" in2="m" operator="in" />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
