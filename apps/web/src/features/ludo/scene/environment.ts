import { PMREMGenerator, type Scene, type WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** A built-in studio environment, pre-filtered once for reflections; nothing is downloaded. Returns a disposer. */
export function applyStudioEnvironment(renderer: WebGLRenderer, scene: Scene, intensity = 0.7): () => void {
  const generator = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const target = generator.fromScene(room, 0.04);
  scene.environment = target.texture;
  scene.environmentIntensity = intensity;
  generator.dispose();
  return () => { scene.environment = null; target.dispose(); };
}
