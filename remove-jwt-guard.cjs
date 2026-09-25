const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('apps/api/src/modules/**/*.controller.ts', { cwd: process.cwd() });
for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/import \{ JwtAuthGuard \}.*;\n?/g, '');
  content = content.replace(/@UseGuards\(JwtAuthGuard, /g, '@UseGuards(');
  content = content.replace(/@UseGuards\(JwtAuthGuard\)\n/g, '');
  fs.writeFileSync(filePath, content);
}
console.log('Removed JwtAuthGuard from controllers');
