import path from 'path';
import { app } from 'electron';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class BinaryResolver {
  private static ytDlpVersionPromise: Promise<string> | null = null;
  private static ffmpegVersionPromise: Promise<string> | null = null;
  private static resolvedYtDlpPath: string | null = null;

  private static get resourcesPath() {
    return app.isPackaged
      ? process.resourcesPath
      : path.resolve(process.cwd(), 'resources');
  }

  private static get platformDir() {
    return `${process.platform}-${process.arch}`;
  }

  static get ytDlpPath(): string {
    if (this.resolvedYtDlpPath) {
      return this.resolvedYtDlpPath;
    }
    return this.getDefaultYtDlpPath();
  }

  private static getDefaultYtDlpPath(): string {
    const ext = process.platform === 'win32' ? '.exe' : '';
    // On macOS, prefer a system/pip/homebrew-installed yt-dlp over the bundled
    // PyInstaller binary. PyInstaller's double-fork bootloader hangs when spawned
    // from Electron's child_process on macOS 26 Tahoe. A system yt-dlp (installed
    // via pip or Homebrew) is a plain Python script wrapper that does not have
    // this issue. Falls back to the bundled binary if no system install is found.
    if (process.platform === 'darwin') {
      const systemPaths = [
        `${process.env.HOME}/.local/bin/yt-dlp`,
        '/opt/homebrew/bin/yt-dlp',
        '/usr/local/bin/yt-dlp',
      ];
      const found = systemPaths.find((p) => {
        try { require('fs').accessSync(p, require('fs').constants.X_OK); return true; } catch { return false; }
      });
      if (found) return found;
    }
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
      env.OBJC_DISABLE_INITIALIZE_FORK_SAFETY = 'YES';
    }
    return env;
  }

  private static async readYtDlpVersion(): Promise<string> {
    const ext = process.platform === 'win32' ? '.exe' : '';
    const candidates: string[] = [];

    if (process.platform === 'darwin') {
      candidates.push(
        `${process.env.HOME}/.local/bin/yt-dlp`,
        '/opt/homebrew/bin/yt-dlp',
        '/usr/local/bin/yt-dlp'
      );
    }
    candidates.push(path.join(this.resourcesPath, 'bin', this.platformDir, `yt-dlp${ext}`));

    const uniqueCandidates = Array.from(new Set(candidates));
    let lastError: Error | null = null;

    for (const candidate of uniqueCandidates) {
      try {
        await this.assertExecutable(candidate);
        const { stdout } = await execFileAsync(candidate, ['--version'], {
          timeout: 30000,
          env: this.getSecuredEnv(),
        });
        const version = stdout.trim();
        if (version) {
          this.resolvedYtDlpPath = candidate;
          return version;
        }
      } catch (error: any) {
        console.error(`[BinaryResolver] Candidate failed: ${candidate}`, {
          message: error.message,
          code: error.code,
          signal: error.signal,
          status: error.status,
          stderr: error.stderr?.toString(),
          stdout: error.stdout?.toString(),
        });
        lastError = error as Error;
      }
    }

    throw lastError || new Error('No working yt-dlp binary found');
  }

  private static async readFfmpegVersion(): Promise<string> {
    await this.assertExecutable(this.ffmpegPath);
    const { stdout } = await execFileAsync(this.ffmpegPath, ['-version'], {
      timeout: 30000,
      env: this.getSecuredEnv(),
    });
    return stdout.split('\n')[0].trim();
  }
}

