export const BUDGET_BYTES = 200 * 1024;

export interface ChunkInfo { name: string; gzipBytes: number; modules: string[]; lazy: boolean; }
export interface BudgetResult { ok: boolean; initialBytes: number; problems: string[]; }

// The entry and lobby routes load every non-lazy chunk, so that sum must fit the budget and exclude 3D code.
export function checkBudget(chunks: ChunkInfo[], limit = BUDGET_BYTES): BudgetResult {
  const initial = chunks.filter((chunk) => !chunk.lazy);
  const initialBytes = initial.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
  const problems: string[] = [];
  if (initialBytes > limit) {
    problems.push(`Initial JavaScript is ${(initialBytes / 1024).toFixed(1)} KB gzipped; the budget is ${(limit / 1024).toFixed(0)} KB.`);
  }
  for (const chunk of chunks) {
    if (/babylon/i.test(chunk.name) || chunk.modules.some((id) => /babylon/i.test(id))) {
      problems.push(`${chunk.name} bundles Babylon.js; 3D code must be lazy-loaded by game features only.`);
    }
  }
  return { ok: problems.length === 0, initialBytes, problems };
}
