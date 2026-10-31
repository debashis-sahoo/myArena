import { BoxGeometry, Group, Mesh } from 'three';
import { TRAY_HALF } from '@myarena/ludo';
import type { ThemeLook } from './look';

export interface TrayObject { object: Group; dispose: () => void; }

/**
 * The dice tray: a lined floor with a low rim, in die units (the die's edge is 1), sized to the bounds of the throw
 * built in `@myarena/ludo` so the die never leaves it.
 */
export function createTray(look: ThemeLook): TrayObject {
  const object = new Group();
  const span = TRAY_HALF * 2;
  const floorGeometry = new BoxGeometry(span + 0.6, 0.2, span + 0.6);
  const floor = new Mesh(floorGeometry, look.trayFloor);
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  object.add(floor);

  const long = new BoxGeometry(span + 1.4, 0.7, 0.5);
  const short = new BoxGeometry(0.5, 0.7, span + 0.6);
  const edge = TRAY_HALF + 0.55;
  for (const [x, z, geometry] of [[0, -edge, long], [0, edge, long], [-edge, 0, short], [edge, 0, short]] as const) {
    const rim = new Mesh(geometry, look.tray);
    rim.position.set(x, 0.25, z);
    rim.castShadow = true;
    rim.receiveShadow = true;
    object.add(rim);
  }
  return { object, dispose() { floorGeometry.dispose(); long.dispose(); short.dispose(); } };
}
