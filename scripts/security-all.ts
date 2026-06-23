import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { expect, SecurityCheckRunner } from './security-test-utils';

const runner = new SecurityCheckRunner();

const scripts = [
  'scripts/security-attack-smoke.ts',
  'scripts/security-crypto-integrity.ts',
  'scripts/security-archive-integrity.ts',
  'scripts/security-electron-hardening.ts',
] as const;

for (const script of scripts) {
  await runner.record(script, () => {
    const result = spawnSync('tsx', [script], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
      env: {
        ...process.env,
        PATH: [
          path.join(process.cwd(), 'node_modules', '.bin'),
          process.env.PATH ?? '',
        ].join(path.delimiter),
      },
    });

    if (result.stdout.trim()) {
      console.log(result.stdout.trim());
    }

    if (result.stderr.trim()) {
      console.error(result.stderr.trim());
    }

    expect(result.status === 0, `${script} exited with ${result.status ?? 'unknown'}`);
  });
}

runner.printAndSetExitCode();
