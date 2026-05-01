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
import { gasciiReleaseResolver, type SelectedRelease } from './gascii-release-resolver';
import { gasciiTerminalLauncher } from './gascii-terminal-launcher';
import { gasciiInstaller } from './gascii-installer';
import { gasciiIntegrityService } from './gascii-integrity';
import { getGasciiBinaryPath, resolveGasciiInstallPath } from './gascii-paths';

const logger = createLogger('gascii-series-service');

type InstallProgressListener = (event: SeriesInstallProgress) => void;
type LaunchProgressListener = (event: SeriesLaunchProgress) => void;

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

    return {
      seriesId: 'gascii',
      installedVersion: installed.installedVersion,
      latestVersion: latest?.tag ?? null,
      installPath: installed.installPath,
      binaryPath: installed.binaryPath,
      status: latest && compareTags(latest.tag, installed.installedVersion) > 0 ? 'update-available' : 'installed',
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
    const binaryPath = getGasciiBinaryPath(installPath);
    await fs.access(binaryPath, fs.constants.X_OK);

    const installed = await launcherConfigRepo.getGasciiInstallInfo();
    const info: GasciiInstallInfo = {
      installedVersion: installed?.installedVersion ?? 'local',
      installPath,
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

    this.emitLaunch(onProgress, 2, `Installed version: ${installed.installedVersion}`);
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 3, 'Verifying executable binary');
    await fs.access(installed.binaryPath, fs.constants.X_OK);
    await gasciiIntegrityService.ensureAssetsReady(installed.installPath);
    await this.pauseForSplashStep();

    this.emitLaunch(onProgress, 4, 'Preparing executable permissions');
    await gasciiInstaller.prepareBinaryPermissions(installed.installPath, installed.binaryPath);
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

    const terminal = gasciiTerminalLauncher.launch(installed.installPath, installed.binaryPath);

    return {
      terminal,
      binaryPath: installed.binaryPath,
    };
  }

  private async tryResolveLatestRelease(): Promise<SelectedRelease | null> {
    try {
      return await gasciiReleaseResolver.resolveLatestRelease();
    } catch (error) {
      logger.warn('latest release lookup failed', error);
      return null;
    }
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
