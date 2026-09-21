import { gzipSync } from 'node:zlib';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

async function files(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...await files(path));
    else output.push(path);
  }
  return output;
}

const assets = [];
for (const path of await files(resolve('dist'))) {
  const bytes = await readFile(path);
  assets.push({ path: relative(resolve('dist'), path), bytes: bytes.length, gzipBytes: gzipSync(bytes).length });
}
assets.sort((a, b) => b.gzipBytes - a.gzipBytes);
const js = assets.filter((asset) => asset.path.endsWith('.js'));
const summary = {
  totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
  totalGzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
  javascriptBytes: js.reduce((sum, asset) => sum + asset.bytes, 0),
  javascriptGzipBytes: js.reduce((sum, asset) => sum + asset.gzipBytes, 0),
  largestAssets: assets.slice(0, 10),
  thresholds: { javascriptGzipBytes: 200_000, individualAssetBytes: 750_000 },
};
if (summary.javascriptGzipBytes > summary.thresholds.javascriptGzipBytes) {
  throw new Error(`JavaScript gzip budget exceeded: ${summary.javascriptGzipBytes} bytes.`);
}
const oversized = assets.filter((asset) => asset.bytes > summary.thresholds.individualAssetBytes);
if (oversized.length) throw new Error(`Oversized production assets: ${JSON.stringify(oversized)}`);
await mkdir(resolve('.cache/phase-05-audit'), { recursive: true });
await writeFile(resolve('.cache/phase-05-audit/performance-audit.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
