export type Quality = 'lite' | 'standard' | 'high';
export const QUALITIES: readonly Quality[] = ['lite', 'standard', 'high'];
export const QUALITY_KEY = 'myarena-ludo-quality';

export interface DeviceHints {
  /** `navigator.deviceMemory` in GB, when the browser tells. */
  memory: number | undefined;
  cores: number | undefined;
  pixelRatio: number;
  coarsePointer: boolean;
  webgl: boolean;
}

let webglCache: boolean | undefined;
export function webglAvailable(): boolean {
  if (webglCache !== undefined) return webglCache;
  try {
    const canvas = document.createElement('canvas');
    webglCache = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch { webglCache = false; }
  return webglCache;
}

export function readHints(): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    memory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    pixelRatio: window.devicePixelRatio || 1,
    coarsePointer: typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches,
    webgl: webglAvailable(),
  };
}

/** The level a device gets when nobody chose one: Lite without WebGL or on small devices, High on strong desktops, otherwise Standard. */
export function automaticQuality(hints: DeviceHints): Quality {
  if (!hints.webgl) return 'lite';
  if ((hints.memory !== undefined && hints.memory <= 2) || (hints.cores !== undefined && hints.cores <= 2)) return 'lite';
  const strong = (hints.cores ?? 0) >= 8 && (hints.memory === undefined || hints.memory >= 8) && !hints.coarsePointer && hints.pixelRatio <= 3;
  return strong ? 'high' : 'standard';
}

export function storedQuality(): Quality | null {
  try {
    const value = window.localStorage.getItem(QUALITY_KEY);
    return QUALITIES.includes(value as Quality) ? (value as Quality) : null;
  } catch { return null; }
}

/** `null` means automatic. */
export function saveQuality(quality: Quality | null): void {
  try {
    if (quality === null) window.localStorage.removeItem(QUALITY_KEY);
    else window.localStorage.setItem(QUALITY_KEY, quality);
  } catch { /* storage may be blocked; the choice just does not persist */ }
}

/** A manual choice always wins, except that nothing can be drawn in 3D without WebGL. */
export function chooseQuality(hints: DeviceHints = readHints(), stored: Quality | null = storedQuality()): Quality {
  if (!hints.webgl) return 'lite';
  return stored ?? automaticQuality(hints);
}

export const lowerQuality = (quality: Quality): Quality => (quality === 'high' ? 'standard' : 'lite');

/** Device pixel ratio the renderer may use at each level. */
export const pixelRatioCap = (quality: Quality): number => (quality === 'high' ? 2 : 1.25);
