import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import { type GasciiInstallInfo, type SeriesVerifyResult } from '@shared/launcherTypes';

export class GasciiIntegrityService {
  async verify(installed: GasciiInstallInfo | null | undefined): Promise<SeriesVerifyResult> {
    if (!installed) {
      return {
        seriesId: 'gascii',
        ok: false,
        checkedPaths: [],
        missing: ['Gascii installation'],
        message: 'Gascii is not installed',
      };
    }

    const videoPath = join(installed.installPath, 'assets', 'video');
    const legacyVidioPath = join(installed.installPath, 'assets', 'vidio');
    const audioPath = join(installed.installPath, 'assets', 'audio');
    const checkedPaths = [installed.installPath, installed.binaryPath, videoPath, audioPath];
    const missing: string[] = [];

    if (!existsSync(installed.installPath)) {
      missing.push(installed.installPath);
    }

    if (!existsSync(installed.binaryPath)) {
      missing.push(installed.binaryPath);
    }

    const [videoCount, legacyVidioCount, audioCount] = await Promise.all([
      this.countFiles(videoPath),
      this.countFiles(legacyVidioPath),
      this.countFiles(audioPath),
    ]);

    if (videoCount + legacyVidioCount === 0) {
      missing.push(videoPath);
    }

    if (audioCount === 0) {
      missing.push(audioPath);
    }

    return {
      seriesId: 'gascii',
      ok: missing.length === 0,
      checkedPaths,
      missing,
      message: missing.length === 0 ? 'Gascii integrity check passed' : 'Gascii integrity check found missing files',
    };
  }

  async ensureAssetsReady(installPath: string): Promise<void> {
    const assetsPath = join(installPath, 'assets');
    const videoPath = join(assetsPath, 'video');
    const audioPath = join(assetsPath, 'audio');
    const legacyVidioPath = join(assetsPath, 'vidio');

    await fs.mkdir(videoPath, { recursive: true });
    await fs.mkdir(audioPath, { recursive: true });

    const [videoCount, legacyVidioCount, audioCount] = await Promise.all([
      this.countFiles(videoPath),
      this.countFiles(legacyVidioPath),
      this.countFiles(audioPath),
    ]);

    if (videoCount + legacyVidioCount === 0 || audioCount === 0) {
      throw new Error('Gascii assets are missing. Open Library and add media files to assets/video and assets/audio.');
    }
  }

  private async countFiles(directoryPath: string): Promise<number> {
    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).length;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return 0;
      }

      throw error;
    }
  }
}

export const gasciiIntegrityService = new GasciiIntegrityService();
