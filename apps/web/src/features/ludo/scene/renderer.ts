import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace, WebGLRenderer } from 'three';

export interface RendererOptions {
  /** Highest device pixel ratio to render at; phones can report 3 or more. */
  pixelRatioCap: number;
  antialias: boolean;
  shadows: boolean;
  onResize: (width: number, height: number) => void;
  onContextLost: () => void;
  onContextRestored: () => void;
}

export interface RendererHandle {
  renderer: WebGLRenderer;
  resize: () => void;
  setPixelRatioCap: (cap: number) => void;
  dispose: () => void;
}

/** A renderer sized from the canvas's own box (no `style` attributes are written), with context-loss events passed on. */
export function createRenderer(canvas: HTMLCanvasElement, options: RendererOptions): RendererHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: options.antialias, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = options.shadows;
  renderer.shadowMap.type = PCFSoftShadowMap;
  let cap = options.pixelRatioCap;

  const resize = (): void => {
    const width = Math.max(1, Math.floor(canvas.clientWidth));
    const height = Math.max(1, Math.floor(canvas.clientHeight));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    renderer.setSize(width, height, false);
    options.onResize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const lost = (event: Event): void => { event.preventDefault(); options.onContextLost(); };
  const restored = (): void => options.onContextRestored();
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);

  return {
    renderer,
    resize,
    setPixelRatioCap(next) { cap = next; resize(); },
    dispose() {
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      renderer.dispose();
    },
  };
}
