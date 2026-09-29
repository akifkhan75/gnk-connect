const { spawn } = require('child_process');
const path = require('path');

const apps = ['admin', 'api', 'portal', 'website'];

apps.forEach((app) => {
  const child = spawn('npm', ['run', 'dev', '--prefix', `apps/${app}`], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (err) => {
    console.error(`Failed to start ${app}:`, err);
  });
});
