import { join } from 'node:path';
import { platform } from 'node:os';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';

export const getGasciiBinaryPath = (installPath: string): string => {
  if (platform() === 'darwin') {
    return join(installPath, 'bin', 'gascii');
  }

  if (platform() === 'linux') {
    return join(installPath, 'bin', 'gascii-bin');
  }

  throw new Error('Windows support is not ready yet');
};

export const resolveGasciiInstallPath = async (): Promise<string> => {
  const config = await launcherConfigRepo.getConfig();
  return config.series.gascii.installPath || join(launcherConfigRepo.getTermRoot(), 'gascii');
};
