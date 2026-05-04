import { access, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

type PlatformBinarySet = {
  dir: string;
  binaries: readonly string[];
};

const binarySets: readonly PlatformBinarySet[] = [
  { dir: 'darwin-arm64', binaries: ['yt-dlp', 'ffmpeg'] },
  { dir: 'linux-x64', binaries: ['yt-dlp', 'ffmpeg'] },
  { dir: 'win32-x64', binaries: ['yt-dlp.exe', 'ffmpeg.exe'] },
];

const currentPlatformDir = `${process.platform}-${process.arch}`;
const existingBinRoot = join(process.cwd(), 'resources', 'bin');
const existingDirs = new Set(await readdir(existingBinRoot).catch(() => []));

for (const binarySet of binarySets) {
  if (!existingDirs.has(binarySet.dir) && binarySet.dir !== currentPlatformDir) {
    continue;
  }

  if (!existingDirs.has(binarySet.dir)) {
    throw new Error(`Bundled binary directory is missing: resources/bin/${binarySet.dir}`);
  }

  for (const binary of binarySet.binaries) {
    const binaryPath = join(existingBinRoot, binarySet.dir, binary);
    await assertExecutableFile(binaryPath);

    if (binarySet.dir.startsWith('darwin-')) {
      assertDarwinStandaloneBinary(binaryPath);
    }
  }
}

async function assertExecutableFile(binaryPath: string): Promise<void> {
  const fileStat = await stat(binaryPath).catch(() => null);
  if (!fileStat?.isFile()) {
    throw new Error(`Bundled binary is missing: ${binaryPath}`);
  }

  await access(binaryPath, constants.X_OK).catch(() => {
    throw new Error(`Bundled binary is not executable: ${binaryPath}`);
  });
}

function assertDarwinStandaloneBinary(binaryPath: string): void {
  const fileResult = spawnSync('file', [binaryPath], { encoding: 'utf8' });
  if (fileResult.status !== 0) {
    throw new Error(`file failed for ${binaryPath}: ${fileResult.stderr.trim()}`);
  }

  if (!fileResult.stdout.includes('Mach-O')) {
    throw new Error(`macOS bundled binary must be Mach-O, not a script: ${binaryPath}`);
  }

  const otoolResult = spawnSync('otool', ['-L', binaryPath], { encoding: 'utf8' });
  if (otoolResult.status !== 0) {
    throw new Error(`otool failed for ${binaryPath}: ${otoolResult.stderr.trim()}`);
  }

  const linkedLibraries = otoolResult.stdout;
  const forbiddenPrefixes = ['/opt/homebrew/', '/usr/local/Cellar/', '/opt/local/'];
  const forbiddenPrefix = forbiddenPrefixes.find(prefix => linkedLibraries.includes(prefix));
  if (forbiddenPrefix) {
    throw new Error(`macOS bundled binary depends on local package manager path ${forbiddenPrefix}: ${binaryPath}`);
  }
}
