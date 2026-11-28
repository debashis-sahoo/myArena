import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputDirectory = path.join(root, process.env.ARTIFACT_DIR ?? 'artifacts');
const packageName = process.env.ARTIFACT_NAME ?? 'myarena';
const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'myarena-artifact-'));

if (process.env.ALLOW_DIRTY_ARTIFACT !== '1') {
  const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
  if (status) throw new Error('Refusing to create a production artifact from an uncommitted worktree.');
}

function run(command, args, cwd = root) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function runNpm(args, cwd = root) {
  if (process.env.npm_execpath) {
    run(process.execPath, [process.env.npm_execpath, ...args], cwd);
    return;
  }
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, cwd);
}

function copy(source, destination) {
  const absoluteSource = path.join(root, source);
  if (!fs.existsSync(absoluteSource)) throw new Error(`Required artifact input is missing: ${source}`);
  fs.cpSync(absoluteSource, path.join(staging, destination), { recursive: true });
}

async function createZip(zipPath) {
  const entries = walkFiles(staging).sort((left, right) => left.name.localeCompare(right.name));
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const content = fs.readFileSync(entry.absolute);
    const compressed = deflateRawSync(content, { level: 9 });
    const checksum = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x0021, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x0021, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  fs.writeFileSync(zipPath, Buffer.concat([...localParts, centralDirectory, end]));
}

function walkFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else if (entry.isFile()) files.push({ absolute, name: path.relative(staging, absolute).split(path.sep).join('/') });
    else if (entry.isSymbolicLink()) continue;
    else throw new Error(`Unsupported artifact entry: ${entry.name}`);
  }
  return files;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

try {
  runNpm(['run', 'build']);
  for (const file of ['package.json', 'package-lock.json']) copy(file, file);
  copy('server/package.json', 'server/package.json');
  copy('server/dist', 'server/dist');
  copy('shared/package.json', 'shared/package.json');
  copy('shared/dist', 'shared/dist');
  copy('client/package.json', 'client/package.json');
  copy('client/dist', 'client/dist');

  runNpm(['ci', '--omit=dev', '--ignore-scripts'], staging);
  const sharedPackage = path.join(staging, 'node_modules/@myarena/shared');
  fs.rmSync(sharedPackage, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(sharedPackage), { recursive: true });
  fs.cpSync(path.join(staging, 'shared'), sharedPackage, { recursive: true });
  fs.mkdirSync(outputDirectory, { recursive: true });

  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const shortCommit = commit.slice(0, 12);
  const zipPath = path.join(outputDirectory, `${packageName}-${shortCommit}.zip`);
  await createZip(zipPath);

  const zipBuffer = fs.readFileSync(zipPath);
  const artifactDigest = `sha256:${crypto.createHash('sha256').update(zipBuffer).digest('hex')}`;
  const lockDigest = `sha256:${crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'package-lock.json'))).digest('hex')}`;
  const manifest = {
    schemaVersion: 1,
    commitSha: commit,
    artifactPath: path.relative(root, zipPath).split(path.sep).join('/'),
    artifactDigest,
    dependencyFingerprint: lockDigest,
    createdAtUtc: new Date().toISOString(),
  };
  const manifestPath = path.join(outputDirectory, `${packageName}-${shortCommit}.manifest.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest));
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}
