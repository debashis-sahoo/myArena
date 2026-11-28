import fs from 'node:fs';

const [cleanPath, cachedPath] = process.argv.slice(2);
if (!cleanPath || !cachedPath) {
  throw new Error('Usage: node scripts/release/measure-transfer.mjs <clean.json> <cached.json>');
}

const clean = JSON.parse(fs.readFileSync(cleanPath, 'utf8'));
const cached = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));
if (!(clean.bytes > 0) || !(cached.bytes >= 0)) throw new Error('Transfer byte counts must be non-negative.');
const reduction = (clean.bytes - cached.bytes) / clean.bytes;
if (reduction < 0.5) throw new Error(`Cached transfer reduction ${(reduction * 100).toFixed(1)}% is below 50%.`);
console.log(JSON.stringify({ cleanBytes: clean.bytes, cachedBytes: cached.bytes, reductionPercent: reduction * 100 }));
