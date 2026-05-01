import path from 'path';
import { type MediaDownloadFormat } from '@shared/launcherTypes';
import { assertRealPathInside, isPathInside, isRealPathInside } from '../utils/pathSecurity';

export class InputValidator {
  static validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }

      const allowedHosts = [
        'www.youtube.com',
        'youtube.com',
        'youtu.be'
      ];
      if (!allowedHosts.includes(parsed.hostname)) {
        throw new Error('Invalid host');
      }

      if (parsed.searchParams.has('list')) {
        throw new Error('Playlists are not supported');
      }
    } catch {
      throw new Error('Invalid YouTube URL');
    }
  }

  static validateFormat(format: string): asserts format is MediaDownloadFormat {
    if (format !== 'mp4' && format !== 'mp3') {
      throw new Error('Invalid media format');
    }
  }

  static validateOutputRoot(baseDownloadDir: string, targetDir: string): string {
    const resolvedBase = path.resolve(baseDownloadDir);
    const resolved = path.resolve(resolvedBase, targetDir);

    if (!isPathInside(resolvedBase, resolved)) {
      throw new Error('Invalid output directory: path traversal detected');
    }

    return resolved;
  }

  static validateOutputDir(baseDownloadDir: string, outputDir: string): string {
    const resolvedBase = path.resolve(baseDownloadDir);
    const resolved = path.resolve(outputDir);

    if (!isPathInside(resolvedBase, resolved)) {
      throw new Error('Invalid output directory: outside allowed download root');
    }

    return resolved;
  }

  static isInsideDirectory(baseDir: string, targetPath: string): boolean {
    return isPathInside(path.resolve(baseDir), path.resolve(targetPath));
  }

  static async assertRealOutputDir(baseDownloadDir: string, outputDir: string): Promise<void> {
    await assertRealPathInside(
      path.resolve(baseDownloadDir),
      path.resolve(outputDir),
      'Invalid output directory: outside allowed download root',
    );
  }

  static async isRealInsideDirectory(baseDir: string, targetPath: string): Promise<boolean> {
    return isRealPathInside(path.resolve(baseDir), path.resolve(targetPath));
  }
}
