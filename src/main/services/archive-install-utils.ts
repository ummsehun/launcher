import { spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import { dirname, isAbsolute, join, posix } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { type Entry, type ZipFile, open as openZip } from 'yauzl';
import { formatSpawnFailure } from '../utils/spawnResult';

export const verifySha256Digest = (expectedDigest: string, actualHexDigest: string): void => {
  const expected = /^sha256:([a-f0-9]{64})$/i.exec(expectedDigest);
  if (!expected) {
    throw new Error('Release asset digest is not a supported SHA-256 digest');
  }

  if (expected[1].toLowerCase() !== actualHexDigest.toLowerCase()) {
    throw new Error('Release asset digest verification failed');
  }
};

export const assertSafeTarArchiveEntries = (archivePath: string): void => {
  const result = spawnSync('tar', ['-tzf', archivePath], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    throw new Error(`Archive listing failed: ${formatSpawnFailure(result)}`);
  }

  const entries = result.stdout.split(/\r?\n/).filter(Boolean);
  if (entries.length === 0) {
    throw new Error('Archive is empty');
  }

  for (const entry of entries) {
    assertSafeArchiveEntry(entry);
  }
};

export const assertSafeZipArchiveEntries = async (archivePath: string): Promise<void> => {
  const entries = await listZipEntries(archivePath);
  if (entries.length === 0) {
    throw new Error('Archive is empty');
  }

  for (const entry of entries) {
    assertSafeArchiveEntry(entry);
  }
};

export const assertNoSymlinks = async (rootPath: string): Promise<void> => {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const entryPath = join(rootPath, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Archive contains unsupported symbolic link: ${entry.name}`);
    }

    if (entry.isDirectory()) {
      await assertNoSymlinks(entryPath);
    }
  }));
};

export const extractArchiveToDirectory = async (archivePath: string, targetDirectory: string): Promise<void> => {
  if (archivePath.endsWith('.zip')) {
    await assertSafeZipArchiveEntries(archivePath);
    await extractZipArchive(archivePath, targetDirectory);
    return;
  }

  assertSafeTarArchiveEntries(archivePath);
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', targetDirectory], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    throw new Error(`Archive extraction failed: ${formatSpawnFailure(result)}`);
  }
};

const listZipEntries = async (archivePath: string): Promise<string[]> => {
  const zipFile = await openZipFile(archivePath);
  const entries: string[] = [];

  try {
    await forEachZipEntry(zipFile, async (entry) => {
      entries.push(entry.fileName);
    });
  } finally {
    zipFile.close();
  }

  return entries;
};

const extractZipArchive = async (archivePath: string, targetDirectory: string): Promise<void> => {
  const zipFile = await openZipFile(archivePath);

  try {
    await forEachZipEntry(zipFile, async (entry) => {
      assertSafeArchiveEntry(entry.fileName);

      const targetPath = join(targetDirectory, ...entry.fileName.split('/').filter(Boolean));
      if (entry.fileName.endsWith('/')) {
        await fs.mkdir(targetPath, { recursive: true });
        return;
      }

      await fs.mkdir(dirname(targetPath), { recursive: true });
      const stream = await openZipEntryReadStream(zipFile, entry);
      await pipeline(stream, createWriteStream(targetPath, { mode: 0o600 }));
    });
  } finally {
    zipFile.close();
  }
};

const openZipFile = async (archivePath: string): Promise<ZipFile> =>
  new Promise((resolve, reject) => {
    openZip(archivePath, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(error ?? new Error('Failed to open zip archive'));
        return;
      }

      resolve(zipFile);
    });
  });

const forEachZipEntry = async (
  zipFile: ZipFile,
  callback: (entry: Entry) => Promise<void>,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const onEntry = (entry: Entry) => {
      callback(entry)
        .then(() => zipFile.readEntry())
        .catch(reject);
    };

    zipFile.once('end', resolve);
    zipFile.once('error', reject);
    zipFile.on('entry', onEntry);
    zipFile.readEntry();
  });

const openZipEntryReadStream = async (zipFile: ZipFile, entry: Entry): Promise<NodeJS.ReadableStream> =>
  new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(error ?? new Error(`Failed to read zip entry: ${entry.fileName}`));
        return;
      }

      resolve(stream);
    });
  });

const assertSafeArchiveEntry = (entry: string): void => {
  const normalized = posix.normalize(entry);
  if (
    entry.includes('\0') ||
    normalized === '.' ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized.startsWith('/') ||
    isAbsolute(entry) ||
    /^[A-Za-z]:/.test(entry)
  ) {
    throw new Error(`Archive contains unsafe entry: ${entry}`);
  }
};
