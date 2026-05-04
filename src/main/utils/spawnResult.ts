import { type SpawnSyncReturns } from 'node:child_process';

export const readSpawnOutput = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8').trim();
  }

  return '';
};

export const formatSpawnFailure = (result: SpawnSyncReturns<string | Buffer>, fallback = 'process failed'): string => {
  if (result.error) {
    return result.error.message;
  }

  return readSpawnOutput(result.stderr) || readSpawnOutput(result.stdout) || `exit code ${result.status ?? 'unknown'}` || fallback;
};
