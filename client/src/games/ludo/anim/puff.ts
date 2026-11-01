/** A dust puff: one ring plus a few particles, removed from the DOM when finished (at most 5 particles, 450 ms). */
export function spawnPuff(layer: HTMLElement, x: number, y: number, cell: number, strong = false): void {
  const root = document.createElement('div');
  root.className = 'puff';
  root.style.left = `${x}px`;
  root.style.top = `${y}px`;
  const size = cell * (strong ? 1.6 : 1);
  const ring = document.createElement('i');
  ring.className = 'puff-ring';
  ring.style.width = ring.style.height = `${size}px`;
  root.appendChild(ring);
  layer.appendChild(root);

  const animations: Animation[] = [
    ring.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.8 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
      ],
      { duration: 450, easing: 'ease-out', fill: 'forwards' },
    ),
  ];
  const count = strong ? 5 : 3;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('i');
    dot.className = 'puff-dot';
    dot.style.width = dot.style.height = `${Math.max(3, cell * 0.14)}px`;
    root.appendChild(dot);
    const angle = (Math.PI * 2 * i) / count + 0.5;
    const dist = cell * (strong ? 0.9 : 0.55);
    animations.push(
      dot.animate(
        [
          { transform: 'translate(-50%, -50%)', opacity: 0.9 },
          { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist * 0.6}px))`, opacity: 0 },
        ],
        { duration: 450, easing: 'ease-out', fill: 'forwards' },
      ),
    );
  }
  void Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => root.remove());
}
