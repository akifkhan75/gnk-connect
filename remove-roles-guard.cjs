const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('apps/api/src/modules/**/*.controller.ts', { cwd: process.cwd() });
for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/import \{ RolesGuard \}.*;\n?/g, '');
  content = content.replace(/@UseGuards\(RolesGuard\)\n/g, '');
  content = content.replace(/@Roles\([^)]*\)\n/g, '');
  content = content.replace(/import \{ Roles, .*\} from '..\/auth\/decorators\/roles.decorator';\n?/g, '');
  content = content.replace(/import \{ Roles \} from '..\/auth\/decorators\/roles.decorator';\n?/g, '');
  fs.writeFileSync(filePath, content);
}
console.log('Removed RolesGuard and @Roles from controllers');
