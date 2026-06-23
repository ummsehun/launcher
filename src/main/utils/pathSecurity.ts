import fs from 'node:fs/promises';
import path from 'node:path';

export const isPathInside = (baseDir: string, targetPath: string): boolean => {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedBase, resolvedTarget);

  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const resolveNearestExistingPath = async (targetPath: string): Promise<string> => {
  let current = path.resolve(targetPath);

  while (true) {
    try {
      await fs.access(current);
      return current;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        throw error;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        throw error;
      }
      current = parent;
    }
  }
};

export const isRealPathInside = async (baseDir: string, targetPath: string): Promise<boolean> => {
  if (!isPathInside(baseDir, targetPath)) {
    return false;
  }

  const realBase = await fs.realpath(baseDir);
  const nearestExistingPath = await resolveNearestExistingPath(targetPath);
  const realNearestExistingPath = await fs.realpath(nearestExistingPath);

  return isPathInside(realBase, realNearestExistingPath);
};

export const assertRealPathInside = async (
  baseDir: string,
  targetPath: string,
  message = 'Invalid path: outside allowed root',
): Promise<void> => {
  if (!(await isRealPathInside(baseDir, targetPath))) {
    throw new Error(message);
  }
};
