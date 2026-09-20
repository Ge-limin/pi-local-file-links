import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = dirname(dirname(fileURLToPath(import.meta.resolve('@earendil-works/pi-coding-agent'))));
const result = spawnSync(process.execPath, ['--test', 'test/pi-integration.test.js'], {
  stdio: 'inherit', env: { ...process.env, PI_PACKAGE_ROOT: root },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
