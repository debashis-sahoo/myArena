import type { BufferGeometry, Material, Texture } from 'three';

/** Collects what a theme creates so that it can be released in one call. */
export class Bag {
  private readonly materials: Material[] = [];
  private readonly geometries: BufferGeometry[] = [];
  private readonly textures: Texture[] = [];

  material<T extends Material>(value: T): T { this.materials.push(value); return value; }
  geometry<T extends BufferGeometry>(value: T): T { this.geometries.push(value); return value; }
  texture<T extends Texture>(value: T): T { this.textures.push(value); return value; }

  dispose(): void {
    for (const material of this.materials) material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const texture of this.textures) texture.dispose();
    this.materials.length = 0;
    this.geometries.length = 0;
    this.textures.length = 0;
  }
}
