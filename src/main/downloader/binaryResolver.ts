import path from 'path';
import { app } from 'electron';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class BinaryResolver {
  private static ytDlpVersionPromise: Promise<string> | null = null;
  private static ffmpegVersionPromise: Promise<string> | null = null;

  private static get resourcesPath() {
    return app.isPackaged
      ? process.resourcesPath
      : path.resolve(process.cwd(), 'resources');
  }

  private static get platformDir() {
    return `${process.platform}-${process.arch}`;
  }

  static get ytDlpPath() {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(this.resourcesPath, 'bin', this.platformDir, `yt-dlp${ext}`);
  }

  static get ffmpegPath() {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(this.resourcesPath, 'bin', this.platformDir, `ffmpeg${ext}`);
  }

  static async assertExecutable(filePath: string): Promise<void> {
    try {
      const accessMode = process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK;
      await fs.access(filePath, accessMode);
    } catch {
      throw new Error(`Binary not found or not executable at: ${filePath}`);
    }
  }

  static async checkYtDlpVersion(): Promise<string> {
    if (!this.ytDlpVersionPromise) {
      this.ytDlpVersionPromise = this.readYtDlpVersion().catch((error) => {
        this.ytDlpVersionPromise = null;
        throw error;
      });
    }

    return this.ytDlpVersionPromise;
  }

  static async checkFfmpegAvailable(): Promise<string> {
    if (!this.ffmpegVersionPromise) {
      this.ffmpegVersionPromise = this.readFfmpegVersion().catch((error) => {
        this.ffmpegVersionPromise = null;
        throw error;
      });
    }

    return this.ffmpegVersionPromise;
  }

  private static getSecuredEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    if (process.platform === 'darwin') {
      const standardPaths = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];
      const currentPaths = env.PATH ? env.PATH.split(':') : [];
      const mergedPaths = Array.from(new Set([...standardPaths, ...currentPaths]));
      env.PATH = mergedPaths.join(':');
    }
    return env;
  }

  private static async readYtDlpVersion(): Promise<string> {
    await this.assertExecutable(this.ytDlpPath);
    const { stdout } = await execFileAsync(this.ytDlpPath, ['--version'], { 
      timeout: 10000,
      env: this.getSecuredEnv(),
    });
    return stdout.trim();
  }

  private static async readFfmpegVersion(): Promise<string> {
    await this.assertExecutable(this.ffmpegPath);
    const { stdout } = await execFileAsync(this.ffmpegPath, ['-version'], { 
      timeout: 10000,
      env: this.getSecuredEnv(),
    });
    return stdout.split('\n')[0].trim();
  }
}
