import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const forbidden = [
  '/Users/',
  'PANNs MobileNet',
  'PANNs CQT CNN14',
  'Research Grade',
  'Production Ready',
  'State-of-the-art',
  'TODO',
  'FIXME',
];

async function files(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...await files(path));
    else if (/\.(html|js|css|json|txt|xml)$/.test(entry.name)) output.push(path);
  }
  return output;
}

const findings = [];
for (const path of await files(resolve('dist'))) {
  const contents = await readFile(path, 'utf8');
  for (const term of forbidden) if (contents.includes(term)) findings.push({ path, term });
}
if (findings.length) throw new Error(`Forbidden production content found:\n${JSON.stringify(findings, null, 2)}`);
console.log(`Production content audit passed across dist/: ${forbidden.length} forbidden/stale patterns absent.`);
