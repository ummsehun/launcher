import { spawnSync } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { basename, join } from 'node:path';
import { platform } from 'node:os';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { type GasciiInstallInfo, type SeriesInstallProgress } from '@shared/launcherTypes';
import { createLogger } from '@shared/logger';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { getGasciiBinaryPath, resolveGasciiInstallPath } from './gascii-paths';
import { type SelectedRelease } from './gascii-release-resolver';

const logger = createLogger('gascii-installer');

type InstallProgressListener = (event: SeriesInstallProgress) => void;

const INSTALL_STAGES = {
  resolving: 5,
  downloading: 10,
  extracting: 78,
  permissions: 92,
  completed: 100,
} as const;

export class GasciiInstaller {
  async install(release: SelectedRelease, onProgress: InstallProgressListener): Promise<GasciiInstallInfo> {
    const termRoot = launcherConfigRepo.getTermRoot();
    const downloadRoot = join(termRoot, '.downloads');
    const installPath = await resolveGasciiInstallPath();
    const backupPath = join(termRoot, 'gascii.previous');
    const stagingPath = join(termRoot, `.gascii-${Date.now()}`);
    const archivePath = join(downloadRoot, release.asset.name);

    await fs.mkdir(downloadRoot, { recursive: true });
    await fs.rm(archivePath, { force: true });

    await this.downloadAsset(release, archivePath, onProgress);
    await this.extractArchive(archivePath, stagingPath, installPath, backupPath, onProgress);

    const binaryPath = getGasciiBinaryPath(installPath);
    await this.preparePermissions(installPath, binaryPath, onProgress);
    await fs.rm(backupPath, { recursive: true, force: true });
    await fs.rm(archivePath, { force: true });

    return {
      installedVersion: release.tag,
      installPath,
      binaryPath,
      lastInstalledAt: new Date().toISOString(),
    };
  }

  async prepareBinaryPermissions(installPath: string, binaryPath: string): Promise<void> {
    await fs.chmod(binaryPath, 0o755);

    if (platform() === 'darwin') {
      const result = spawnSync('xattr', ['-dr', 'com.apple.quarantine', installPath], {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (result.status !== 0) {
        logger.warn('xattr quarantine cleanup failed', result.stderr.trim() || result.stdout.trim());
      }
    }
  }

  private async downloadAsset(
    release: SelectedRelease,
    archivePath: string,
    onProgress: InstallProgressListener,
  ): Promise<void> {
    this.emitInstall(onProgress, 'downloading', INSTALL_STAGES.downloading, `Downloading ${release.asset.name}`, release.tag);
    const response = await fetch(release.asset.browser_download_url);

    if (!response.ok || !response.body) {
      throw new Error(`Download failed: HTTP ${response.status}`);
    }

    const totalBytes = Number(response.headers.get('content-length')) || release.asset.size || 0;
    let downloadedBytes = 0;
    const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
    nodeStream.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const ratio = downloadedBytes / totalBytes;
        const progress = INSTALL_STAGES.downloading + Math.round(ratio * 62);
        this.emitInstall(
          onProgress,
          'downloading',
          Math.min(72, progress),
          `Downloading ${basename(archivePath)}`,
          release.tag,
        );
      }
    });

    await pipeline(nodeStream, createWriteStream(archivePath));
  }

  private async extractArchive(
    archivePath: string,
    stagingPath: string,
    installPath: string,
    backupPath: string,
    onProgress: InstallProgressListener,
  ): Promise<void> {
    this.emitInstall(onProgress, 'extracting', INSTALL_STAGES.extracting, 'Extracting archive');
    await fs.rm(stagingPath, { recursive: true, force: true });
    await fs.mkdir(stagingPath, { recursive: true });

    const result = spawnSync('tar', ['-xzf', archivePath, '-C', stagingPath], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
      throw new Error(`Archive extraction failed: ${detail}`);
    }

    const extractedRoot = await this.resolveExtractedRoot(stagingPath);
    await fs.rm(backupPath, { recursive: true, force: true });

    try {
      if (existsSync(installPath)) {
        await fs.rename(installPath, backupPath);
      }
      await fs.rename(extractedRoot, installPath);
    } catch (error) {
      await fs.rm(installPath, { recursive: true, force: true });
      if (existsSync(backupPath)) {
        await fs.rename(backupPath, installPath);
      }
      throw error;
    } finally {
      await fs.rm(stagingPath, { recursive: true, force: true });
    }
  }

  private async preparePermissions(
    installPath: string,
    binaryPath: string,
    onProgress: InstallProgressListener,
  ): Promise<void> {
    this.emitInstall(onProgress, 'permissions', INSTALL_STAGES.permissions, 'Preparing binary permissions');
    await this.prepareBinaryPermissions(installPath, binaryPath);
  }

  private async resolveExtractedRoot(stagingPath: string): Promise<string> {
    const entries = await fs.readdir(stagingPath, { withFileTypes: true });

    if (existsSync(getGasciiBinaryPath(stagingPath))) {
      return stagingPath;
    }

    const directories = entries.filter((entry) => entry.isDirectory());
    if (directories.length === 1) {
      return join(stagingPath, directories[0].name);
    }

    throw new Error('Archive layout is not supported');
  }

  private emitInstall(
    onProgress: InstallProgressListener,
    stage: SeriesInstallProgress['stage'],
    progress: number,
    message: string,
    version?: string,
  ): void {
    onProgress({
      seriesId: 'gascii',
      stage,
      progress,
      message,
      version,
    });
  }
}

export const gasciiInstaller = new GasciiInstaller();
