import fs from 'node:fs/promises';
import path from 'node:path';
import { type TerminalSeriesId } from '@shared/launcherTypes';
import { launcherConfigRepo } from '../launcher/launcherConfigRepository';
import { assertRealPathInside } from '../utils/pathSecurity';

export const assertManagedInstallPath = async (
  seriesId: TerminalSeriesId,
  installPath: string,
): Promise<string> => {
  const managedRoot = launcherConfigRepo.getTermRoot();
  const resolvedInstallPath = path.resolve(installPath);

  await fs.mkdir(managedRoot, { recursive: true });
  await assertRealPathInside(
    managedRoot,
    resolvedInstallPath,
    `${seriesId} install path must stay inside the TermPlay managed root`,
  );

  return resolvedInstallPath;
};
