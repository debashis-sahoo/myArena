export const BUDGET_BYTES = 200 * 1024;
/** Everything Ludo loads when a match starts (engine scene, UI and Three.js) together. */
export const LUDO_LAZY_BUDGET_BYTES = 400 * 1024;

/** Each game tile picture (for example `ludo-tile-<hash>.svg`) must stay small enough not to delay the landing page. */
export const TILE_IMAGE_BUDGET_BYTES = 100 * 1024;

export interface AssetInfo { fileName: string; bytes: number; }

const tilePicture = /(^|[\\/])[a-z0-9-]+-tile[-.][^\\/]*\.(svg|png|jpe?g|webp|avif)$/i;

export function checkTileImages(assets: AssetInfo[], limit = TILE_IMAGE_BUDGET_BYTES): string[] {
  return assets
    .filter((asset) => tilePicture.test(asset.fileName) && asset.bytes > limit)
    .map((asset) => `${asset.fileName} is ${(asset.bytes / 1024).toFixed(1)} KB; a game tile picture must be at most ${(limit / 1024).toFixed(0)} KB.`);
}

export interface ChunkInfo { name: string; gzipBytes: number; modules: string[]; lazy: boolean; }
export interface BudgetResult { ok: boolean; initialBytes: number; ludoLazyBytes: number; problems: string[]; }

const babylon = /babylon/i;
const threeInName = /(^|[\\/_-])three([\\/_.-]|$)/i;
const threeModule = /node_modules[\\/]three[\\/]/;
const ludoModule = /features[\\/]ludo[\\/]/;

// The entry and lobby routes load every non-lazy chunk, so that sum must fit the budget and exclude 3D code.
export function checkBudget(chunks: ChunkInfo[], limit = BUDGET_BYTES): BudgetResult {
  const initial = chunks.filter((chunk) => !chunk.lazy);
  const initialBytes = initial.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
  const problems: string[] = [];
  if (initialBytes > limit) {
    problems.push(`Initial JavaScript is ${(initialBytes / 1024).toFixed(1)} KB gzipped; the budget is ${(limit / 1024).toFixed(0)} KB.`);
  }
  for (const chunk of chunks) {
    if (babylon.test(chunk.name) || chunk.modules.some((id) => babylon.test(id))) {
      problems.push(`${chunk.name} bundles Babylon.js; this project uses Three.js, lazily, for game features only.`);
    }
    if (!chunk.lazy && (threeInName.test(chunk.name) || chunk.modules.some((id) => threeModule.test(id)))) {
      problems.push(`${chunk.name} bundles Three.js in the initial bundle; 3D code must be lazy-loaded by game features only.`);
    }
  }
  const ludoLazy = chunks.filter((chunk) => chunk.lazy && chunk.modules.some((id) => ludoModule.test(id) || threeModule.test(id)));
  const ludoLazyBytes = ludoLazy.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
  if (ludoLazyBytes > LUDO_LAZY_BUDGET_BYTES) {
    problems.push(`The Ludo lazy chunks are ${(ludoLazyBytes / 1024).toFixed(1)} KB gzipped together; the budget is ${(LUDO_LAZY_BUDGET_BYTES / 1024).toFixed(0)} KB.`);
  }
  return { ok: problems.length === 0, initialBytes, ludoLazyBytes, problems };
}
