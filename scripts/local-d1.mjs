import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { projectRoot } from './sites-env.mjs';

const inputFile = process.argv[2];
const configFile = resolve(projectRoot, 'dist/server/wrangler.json');

if (!inputFile) {
  console.error('Usage: node scripts/local-d1.mjs <sql-file>');
  process.exit(1);
}

try {
  await access(configFile);
} catch {
  console.error('Local Worker config is missing. Run `pnpm build` first.');
  process.exit(1);
}

const wrangler = resolve(projectRoot, 'node_modules/wrangler/bin/wrangler.js');
const result = spawnSync(
  process.execPath,
  [
    wrangler,
    'd1',
    'execute',
    'DB',
    '--local',
    '--config',
    configFile,
    '--persist-to',
    resolve(projectRoot, '.wrangler/state'),
    '--file',
    resolve(projectRoot, inputFile),
  ],
  { cwd: projectRoot, env: process.env, stdio: 'inherit' },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
