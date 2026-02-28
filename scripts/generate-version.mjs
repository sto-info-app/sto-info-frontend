import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const packageJsonPath = join(__dirname, '../package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  const versionData = {
    version: packageJson.version,
    buildTime: new Date().toISOString(),
  };

  const outputPath = join(__dirname, '../src/version.json');
  writeFileSync(outputPath, JSON.stringify(versionData, null, 2));

  console.log(`Generated version.json with version ${packageJson.version}`);
} catch (error) {
  console.error('Error generating version.json:', error);
  process.exit(1);
}
