import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage();
p.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto(process.argv[2]);
await p.waitForTimeout(3000);
await b.close();
