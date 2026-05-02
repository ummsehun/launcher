import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ArgumentBuilder } from '../src/main/downloader/argumentBuilder';
import { InputValidator } from '../src/main/downloader/inputValidator';
import { assertRealPathInside, isPathInside, isRealPathInside } from '../src/main/utils/pathSecurity';

type AttackResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

const results: AttackResult[] = [];

const record = async (name: string, test: () => void | Promise<void>): Promise<void> => {
  try {
    await test();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
};

const expect = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const expectThrows = async (callback: () => void | Promise<void>, message: string): Promise<void> => {
  try {
    await callback();
  } catch {
    return;
  }

  throw new Error(message);
};

const walkFiles = async (root: string): Promise<string[]> => {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'out' || entry.name === '.git') {
      return [];
    }

    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }

    return [entryPath];
  }));

  return files.flat();
};

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'termplay-security-'));

try {
  await record('path traversal is rejected lexically', () => {
    const base = path.join(tempRoot, 'managed');
    const escaped = path.join(base, '..', 'escaped');
    expect(!isPathInside(base, escaped), 'escaped path was accepted');
  });

  await record('symlink escape is rejected by realpath validation', async () => {
    const managed = path.join(tempRoot, 'managed');
    const escaped = path.join(tempRoot, 'escaped');
    const link = path.join(managed, 'link');

    await fs.mkdir(managed, { recursive: true });
    await fs.mkdir(escaped, { recursive: true });
    await fs.symlink(escaped, link);

    expect(!(await isRealPathInside(managed, path.join(link, 'payload.mp4'))), 'symlink escape was accepted');
    await expectThrows(
      () => assertRealPathInside(managed, path.join(link, 'payload.mp4')),
      'assertRealPathInside did not reject symlink escape',
    );
  });

  await record('media output directory blocks outside roots', async () => {
    const managed = path.join(tempRoot, 'downloads');
    const escaped = path.join(tempRoot, 'outside');
    await fs.mkdir(managed, { recursive: true });
    await fs.mkdir(escaped, { recursive: true });

    await expectThrows(
      () => InputValidator.assertRealOutputDir(managed, escaped),
      'outside output directory was accepted',
    );
  });

  await record('youtube validator rejects unsafe protocols and hosts', async () => {
    const invalidUrls = [
      'file:///etc/passwd',
      'javascript:alert(1)',
      'https://evil.example/watch?v=abc',
      'https://www.youtube.com/watch?v=abc&list=PL123',
    ];

    for (const url of invalidUrls) {
      await expectThrows(
        () => InputValidator.validateUrl(url),
        `invalid URL was accepted: ${url}`,
      );
    }
  });

  await record('yt-dlp arguments keep shell metacharacters inside one argument', () => {
    const url = 'https://youtu.be/abc123;touch /tmp/owned';
    const args = ArgumentBuilder.build({
      url,
      format: 'mp4',
      outputDir: path.join(tempRoot, 'downloads'),
      ffmpegPath: '/usr/bin/ffmpeg',
    });

    expect(args.at(-1) === url, 'URL was not preserved as one argv value');
  });

  await record('ProcessRunner keeps child process shell disabled', async () => {
    const source = await fs.readFile(path.join(process.cwd(), 'src/main/downloader/processRunner.ts'), 'utf8');
    expect(source.includes('shell: false'), 'ProcessRunner does not explicitly disable shell execution');
  });

  await record('Gascii launch path uses platform sandbox wrapper', async () => {
    const launcherSource = await fs.readFile(path.join(process.cwd(), 'src/main/services/gascii-terminal-launcher.ts'), 'utf8');
    const sandboxSource = await fs.readFile(path.join(process.cwd(), 'src/main/security/processSandbox.ts'), 'utf8');

    expect(
      launcherSource.includes('createGasciiSandboxCommand(cwd, binaryPath)'),
      'Gascii terminal launcher does not create a sandbox command',
    );
    expect(!launcherSource.includes('cd ${shellQuote(cwd)} && ${shellQuote(binaryPath)}'), 'direct binary fallback is still present');
    expect(sandboxSource.includes('sandbox-exec'), 'macOS sandbox-exec policy is missing');
    expect(sandboxSource.includes('bubblewrap') && sandboxSource.includes('firejail'), 'Linux sandbox tools are missing');
    expect(sandboxSource.includes('Process sandbox cannot be disabled in production'), 'production sandbox bypass guard is missing');
  });

  await record('renderer source has no high-risk DOM/code execution sinks', async () => {
    const files = (await walkFiles(path.join(process.cwd(), 'src/renderer/src')))
      .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));
    const dangerousPatterns = [
      'dangerouslySetInnerHTML',
      'innerHTML',
      'outerHTML',
      'insertAdjacentHTML',
      'document.write',
      'eval(',
      'new Function',
      'localStorage',
      'sessionStorage',
      'postMessage',
    ];
    const findings: string[] = [];

    for (const file of files) {
      const source = await fs.readFile(file, 'utf8');
      for (const pattern of dangerousPatterns) {
        if (source.includes(pattern)) {
          findings.push(`${path.relative(process.cwd(), file)}: ${pattern}`);
        }
      }
    }

    expect(findings.length === 0, findings.join('\n'));
  });
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.ok);

for (const result of results) {
  const mark = result.ok ? 'PASS' : 'FAIL';
  const detail = result.detail ? ` - ${result.detail}` : '';
  console.log(`${mark} ${result.name}${detail}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
