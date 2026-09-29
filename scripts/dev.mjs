#!/usr/bin/env node
// Runs every app's dev server in one terminal with prefixed output.
// Use this when `turbo` cannot run (e.g. its native binary is unsupported on the host OS).
// Usage: npm run dev:local [-- api portal]   (defaults to all apps)
import { spawn } from 'node:child_process';

const ALL = {
  api: { color: 35 },
  portal: { color: 36 },
  admin: { color: 33 },
  website: { color: 32 },
};

const selected = process.argv.slice(2).filter((a) => a in ALL);
const apps = selected.length ? selected : Object.keys(ALL);
const children = [];

for (const app of apps) {
  const prefix = `\x1b[${ALL[app].color}m[${app.padEnd(7)}]\x1b[0m `;
  const child = spawn('npm', ['run', 'dev', '-w', `@gnk/${app}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  const pipe = (stream, out) =>
    stream.on('data', (buf) => {
      for (const line of buf.toString().split('\n')) if (line.trim()) out.write(prefix + line + '\n');
    });
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => console.log(`${prefix}exited with code ${code}`));
  children.push(child);
}

const shutdown = () => {
  for (const c of children) c.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
