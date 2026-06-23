import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { setFileLogWriter } from '@shared/logger';

export const initializeFileLogging = (): void => {
  const logDir = path.join(app.getPath('userData'), 'logs');
  const logPath = path.join(logDir, 'termplay.log');

  fs.mkdirSync(logDir, { recursive: true });

  setFileLogWriter((line) => {
    fs.appendFile(logPath, `${line}\n`, (error) => {
      if (error) {
        console.warn('[launcher:logger] failed to write log file', error);
      }
    });
  });
};
