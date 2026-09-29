#!/usr/bin/env node
// Loads the monorepo root .env (if present) and runs the given command, so Prisma
// and seed scripts see the same configuration as the API. Real env vars win.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envFile = resolve(import.meta.dirname, '../../../.env');
if (existsSync(envFile)) {
  const before = { ...process.env };
  process.loadEnvFile(envFile);
  Object.assign(process.env, before);
}
const [cmd, ...args] = process.argv.slice(2);
const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
