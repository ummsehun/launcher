import fs from 'node:fs/promises';
import {
  type GasciiInstallInfo,
  type SeriesInstallProgress,
  type SeriesLaunchProgress,
  type SeriesStatusInfo,
  type SeriesVerifyResult,
} from '@shared/launcherTypes';
import { createLogger } from '@shared/logger';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { InputValidator } from '../downloader/inputValidator';
import { compareTags } from './gascii-version';
import { GithubReleaseLookupError, gasciiReleaseResolver, type SelectedRelease } from './gascii-release-resolver';
import { gasciiTerminalLauncher } from './gascii-terminal-launcher';
import { gasciiInstaller } from './gascii-installer';
import { gasciiIntegrityService } from './gascii-integrity';
import { getGasciiBinaryPath, resolveGasciiInstallPath } from './gascii-paths';
import { assertManagedInstallPath } from '../security/installPathPolicy';

const logger = createLogger('gascii-series-service');

type InstallProgressListener = (event: SeriesInstallProgress) => void;
type LaunchProgressListener = (event: SeriesLaunchProgress) => void;

const LATEST_RELEASE_FAILURE_LOG_INTERVAL_MS = 5 * 60 * 1000;

const LAUNCH_STEPS: Array<{
  stage: SeriesLaunchProgress['stage'];
  label: string;
  progress: number;
}> = [
  { stage: 'resolving', label: 'Resolving app', progress: 8 },
  { stage: 'checking-installation', label: 'Checking installation', progress: 22 },
  { stage: 'checking-version', label: 'Checking version', progress: 36 },
  { stage: 'verifying-binary', label: 'Verifying binary', progress: 50 },
  { stage: 'preparing-permissions', label: 'Preparing permissions', progress: 64 },
  { stage: 'preparing-terminal', label: 'Preparing terminal', progress: 80 },
  { stage: 'launching', label: 'Launching', progress: 94 },
];

export class GasciiSeriesService {
  private lastLatestReleaseFailureLog: { key: string; loggedAt: number } | null = null;

  async getStatus(): Promise<SeriesStatusInfo> {
    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    const latest = await this.tryResolveLatestRelease();

    if (!installed) {
      return {
        seriesId: 'gascii',
        installedVersion: null,
        latestVersion: latest?.tag ?? null,
        installPath: null,
        binaryPath: null,
        status: 'not-installed',
      };
    }

    const managedInstalled = await this.resolveManagedInstallInfo(installed);
    if (!managedInstalled) {
      return {
        seriesId: 'gascii',
        installedVersion: null,
        latestVersion: latest?.tag ?? null,
        installPath: null,
        binaryPath: null,
        status: 'not-installed',
      };
    }

    return {
      seriesId: 'gascii',
      installedVersion: managedInstalled.installedVersion,
      latestVersion: latest?.tag ?? null,
      installPath: managedInstalled.installPath,
      binaryPath: managedInstalled.binaryPath,
      status: latest && compareTags(latest.tag, managedInstalled.installedVersion) > 0 ? 'update-available' : 'installed',
    };
  }

  async install(onProgress: InstallProgressListener): Promise<GasciiInstallInfo> {
    gasciiReleaseResolver.assertSupportedPlatform();
    this.emitInstall(onProgress, 'resolving', 5, 'Resolving latest Gascii release');

    const release = await gasciiReleaseResolver.resolveLatestRelease();
    const info = await gasciiInstaller.install(release, onProgress);
    await launcherConfigRepo.setGasciiInstallInfo(info);
    const config = await launcherConfigRepo.getConfig();
    config.series.gascii.installPath = info.installPath;
    await launcherConfigRepo.saveConfig(config);

    this.emitInstall(onProgress, 'completed', 100, `Gascii ${release.tag} installed`, release.tag);
    return info;
  }

  async verify(): Promise<SeriesVerifyResult> {
    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    return gasciiIntegrityService.verify(installed);
  }

  async remove(): Promise<void> {
    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    const installPath = installed?.installPath || (await resolveGasciiInstallPath());
    const managedRoot = launcherConfigRepo.getTermRoot();

    if (installPath) {
      if (await InputValidator.isRealInsideDirectory(managedRoot, installPath)) {
        await fs.rm(installPath, { recursive: true, force: true });
      } else {
        logger.warn('skipped deleting unmanaged Gascii install path', { installPath, managedRoot });
      }
    }

    await launcherConfigRepo.clearGasciiInstallInfo();
    const config = await launcherConfigRepo.getConfig();
    config.series.gascii.installPath = '';
    await launcherConfigRepo.saveConfig(config);
  }

  async bindInstallPath(installPath: string): Promise<GasciiInstallInfo> {
    const managedInstallPath = await assertManagedInstallPath('gascii', installPath);
    const binaryPath = getGasciiBinaryPath(managedInstallPath);
    await fs.access(binaryPath, fs.constants.X_OK);

    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    const info: GasciiInstallInfo = {
      installedVersion: installed?.installedVersion ?? 'local',
      installPath: managedInstallPath,
      binaryPath,
      lastInstalledAt: installed?.lastInstalledAt ?? new Date().toISOString(),
    };

    await launcherConfigRepo.setGasciiInstallInfo(info);
    const config = await launcherConfigRepo.getConfig();
    config.series.gascii.installPath = installPath;
    await launcherConfigRepo.saveConfig(config);

    return info;
  }

  async launch(onProgress: LaunchProgressListener): Promise<{ terminal: string; binaryPath: string }> {
    gasciiReleaseResolver.assertSupportedPlatform();
    this.emitLaunch(onProgress, 0, 'Resolving Gascii launch request');
    await this.pauseForSplashStep();

    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    this.emitLaunch(onProgress, 1, 'Checking installed files');
    await this.pauseForSplashStep();
    if (!installed) {
      throw new Error('Gascii is not installed');
    }
    const installPath = await assertManagedInstallPath('gascii', installed.installPath);
    const binaryPath = getGasciiBinaryPath(installPath);

    this.emitLaunch(onProgress, 2, `Installed version: ${installed.installedVersion}`);
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 3, 'Verifying executable binary');
    await fs.access(binaryPath, fs.constants.X_OK);
    await gasciiIntegrityService.ensureAssetsReady(installPath);
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 4, 'Preparing executable permissions');
    await gasciiInstaller.prepareBinaryPermissions(installPath, binaryPath);
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 5, 'Preparing external terminal');
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 6, 'Launching Gascii');
    await this.pauseForSplashStep();
    onProgress({
      seriesId: 'gascii',
      stage: 'completed',
      stepLabel: 'Launching',
      progress: 100,
      message: 'Opening external terminal',
    });
    await this.pauseForSplashComplete();

    const terminal = gasciiTerminalLauncher.launch(installPath, binaryPath);

    return {
      terminal,
      binaryPath,
    };
  }

  private async tryResolveLatestRelease(): Promise<SelectedRelease | null> {
    try {
      return await gasciiReleaseResolver.resolveLatestRelease();
    } catch (error) {
      this.logLatestReleaseFailure(error);
      return null;
    }
  }

  private async resolveManagedInstallInfo(installed: GasciiInstallInfo): Promise<GasciiInstallInfo | null> {
    try {
      const installPath = await assertManagedInstallPath('gascii', installed.installPath);
      return {
        ...installed,
        installPath,
        binaryPath: getGasciiBinaryPath(installPath),
      };
    } catch (error) {
      logger.warn('ignored unmanaged Gascii install path', {
        installPath: installed.installPath,
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private logLatestReleaseFailure(error: unknown): void {
    const now = Date.now();
    const message = error instanceof Error ? error.message : String(error);
    const key = error instanceof GithubReleaseLookupError ? `${error.status}:${message}` : message;

    if (
      this.lastLatestReleaseFailureLog &&
      this.lastLatestReleaseFailureLog.key === key &&
      now - this.lastLatestReleaseFailureLog.loggedAt < LATEST_RELEASE_FAILURE_LOG_INTERVAL_MS
    ) {
      return;
    }

    this.lastLatestReleaseFailureLog = { key, loggedAt: now };

    if (error instanceof GithubReleaseLookupError) {
      logger.warn('latest release lookup failed', {
        status: error.status,
        message: error.message,
        responseMessage: error.responseMessage,
        rateLimitReset: error.rateLimitReset,
      });
      return;
    }

    logger.warn('latest release lookup failed', { message });
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

  private emitLaunch(onProgress: LaunchProgressListener, stepIndex: number, message: string): void {
    const step = LAUNCH_STEPS[stepIndex];
    onProgress({
      seriesId: 'gascii',
      stage: step.stage,
      stepLabel: step.label,
      progress: step.progress,
      message,
    });
  }

  private async pauseForSplashStep(): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, 260);
    });
  }

  private async pauseForSplashComplete(): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, 700);
    });
  }
}

export const gasciiSeriesService = new GasciiSeriesService();
