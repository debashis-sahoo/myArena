import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/release/write-evidence.mjs <input.json> <output.json>');
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const forbidden = JSON.stringify(input);
for (const name of ['candidateVerifier', 'token', 'cookie', 'chat', 'guestId']) {
  const pattern = new RegExp(`"${name}"\\s*:`, 'i');
  if (pattern.test(forbidden)) throw new Error(`Evidence contains forbidden field '${name}'.`);
}

const cutover = input.cutover ?? {};
for (const check of ['build', 'smoke', 'bicepWhatIf', 'policy', 'quota', 'health', 'https', 'websocket', 'stagingRoomAdmission', 'stagingCorsReconnect', 'load']) {
  if (input.checks?.[check] !== 'pass') {
    throw new Error(`Blocking release check '${check}' did not pass.`);
  }
}
if (input.cost?.withinCeiling !== true) {
  throw new Error('Release evidence must show the cost estimate within the approved ceiling or an accepted override.');
}
if (cutover.swapCompletedUtc) {
  const completed = Date.parse(cutover.swapCompletedUtc);
  const actualDeadline = Date.parse(cutover.drainDeadlineUtc);
  if (!Number.isFinite(completed) || actualDeadline !== completed + 30 * 60 * 1000) {
    throw new Error('Drain deadline must be exactly 30 minutes after swap completion.');
  }
}
if (input.timing?.routineRolloutSeconds > 900) {
  throw new Error('Routine rollout exceeded the 900-second acceptance threshold.');
}
if (input.timing?.evidenceRetrievalSeconds >= 300) {
  throw new Error('Evidence retrieval must complete in under 300 seconds.');
}
if (cutover.postSwapSettingMutation && cutover.postSwapSettingMutation !== 'absent') {
  throw new Error('Post-swap runtime setting mutation invalidates room continuity evidence.');
}

const evidence = {
  schemaVersion: 1,
  repository: input.repository ?? 'debashis-sahoo/myArena',
  targetSubscription: 'ec7b61df-f90c-4c20-b089-847e999236d5',
  resourceGroup: 'myArena',
  region: 'centralindia',
  ...input,
};
const canonical = JSON.stringify(evidence);
evidence.evidenceDigest = `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, evidenceDigest: evidence.evidenceDigest }));
