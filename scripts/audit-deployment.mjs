import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workflowPath = resolve('.github/workflows/deploy-pages.yml');
const workflow = readFileSync(workflowPath, 'utf8');
const buildStart = workflow.indexOf('  build:');
const deployStart = workflow.indexOf('  deploy:');

if (buildStart < 0 || deployStart < 0 || deployStart <= buildStart) {
  throw new Error('Deploy workflow must contain build followed by deploy jobs.');
}

const buildJob = workflow.slice(buildStart, deployStart);
const deployJob = workflow.slice(deployStart);
const assertions = [
  [workflow.includes('  workflow_dispatch:'), 'workflow is manual-dispatch only'],
  [!workflow.includes('  pull_request:') && !workflow.includes('  push:'), 'push and pull request triggers are absent'],
  [buildJob.includes('refs/heads/main') && buildJob.includes('exit 1'), 'build fails unless github.ref is main'],
  [!/^    environment:/m.test(buildJob), 'build job does not target the github-pages environment'],
  [/^    needs: build$/m.test(deployJob), 'deploy job needs build'],
  [/^    environment:\n      name: github-pages$/m.test(deployJob), 'deploy job targets the github-pages environment'],
];

for (const [passed, description] of assertions) {
  if (!passed) throw new Error(`Deployment workflow audit failed: ${description}.`);
}

console.log('Deployment workflow audit passed: manual-only, main-ref guarded, build/deploy environments correct.');
