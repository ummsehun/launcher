import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  assertNoSymlinks,
  assertSafeTarArchiveEntries,
  assertSafeZipArchiveEntries,
  extractArchiveToDirectory,
} from '../src/main/services/archive-install-utils';
import { expect, expectThrows, SecurityCheckRunner } from './security-test-utils';

const runner = new SecurityCheckRunner();

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'termplay-archive-security-'));

type ArchiveEntry = {
  name: string;
  content?: Buffer;
  type?: 'file' | 'directory';
};

const checksum = (buffer: Buffer): number => {
  let sum = 0;
  for (const byte of buffer) {
    sum += byte;
  }
  return sum;
};

const octal = (value: number, length: number): Buffer => {
  const text = value.toString(8).padStart(length - 1, '0').slice(0, length - 1) + '\0';
  return Buffer.from(text, 'ascii');
};

const createTarGz = async (archivePath: string, entries: ArchiveEntry[]): Promise<void> => {
  const chunks: Buffer[] = [];

  for (const entry of entries) {
    const content = entry.content ?? Buffer.alloc(0);
    const header = Buffer.alloc(512, 0);
    const name = Buffer.from(entry.name, 'utf8');
    name.copy(header, 0, 0, Math.min(name.length, 100));
    octal(entry.type === 'directory' ? 0o755 : 0o644, 8).copy(header, 100);
    octal(0, 8).copy(header, 108);
    octal(0, 8).copy(header, 116);
    octal(entry.type === 'directory' ? 0 : content.length, 12).copy(header, 124);
    octal(0, 12).copy(header, 136);
    Buffer.from('        ', 'ascii').copy(header, 148);
    header[156] = entry.type === 'directory' ? '5'.charCodeAt(0) : '0'.charCodeAt(0);
    Buffer.from('ustar\0', 'ascii').copy(header, 257);
    Buffer.from('00', 'ascii').copy(header, 263);
    octal(checksum(header), 8).copy(header, 148);
    chunks.push(header);

    if (entry.type !== 'directory') {
      chunks.push(content);
      const padding = (512 - (content.length % 512)) % 512;
      if (padding > 0) {
        chunks.push(Buffer.alloc(padding, 0));
      }
    }
  }

  chunks.push(Buffer.alloc(1024, 0));
  await fs.writeFile(archivePath, gzipSync(Buffer.concat(chunks)));
};

const crc32Table = Array.from({ length: 256 }, (_unused, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const crc32 = (buffer: Buffer): number => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const createStoredZip = async (archivePath: string, entries: ArchiveEntry[]): Promise<void> => {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const content = entry.content ?? Buffer.alloc(0);
    const name = Buffer.from(entry.name, 'utf8');
    const crc = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(entry.type === 'directory' ? 0x10 : 0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  await fs.writeFile(archivePath, Buffer.concat([...localParts, centralDirectory, end]));
};

const assertNoOutsideWrite = async (outsidePath: string): Promise<void> => {
  const exists = await fs.stat(outsidePath).then(() => true).catch(() => false);
  expect(!exists, `archive wrote outside extraction root: ${outsidePath}`);
};

try {
  await runner.record('safe tar archive entries pass', async () => {
    const archivePath = path.join(tempRoot, 'safe.tar.gz');
    await createTarGz(archivePath, [{ name: 'app/bin/termplay', content: Buffer.from('ok') }]);
    assertSafeTarArchiveEntries(archivePath);
  });

  await runner.record('safe zip archive entries pass', async () => {
    const archivePath = path.join(tempRoot, 'safe.zip');
    await createStoredZip(archivePath, [{ name: 'app/bin/termplay', content: Buffer.from('ok') }]);
    await assertSafeZipArchiveEntries(archivePath);
  });

  await runner.record('empty tar archive is rejected', async () => {
    const archivePath = path.join(tempRoot, 'empty.tar.gz');
    await createTarGz(archivePath, []);
    await expectThrows(
      () => assertSafeTarArchiveEntries(archivePath),
      'empty tar archive was accepted',
    );
  });

  await runner.record('empty zip archive is rejected', async () => {
    const archivePath = path.join(tempRoot, 'empty.zip');
    await createStoredZip(archivePath, []);
    await expectThrows(
      () => assertSafeZipArchiveEntries(archivePath),
      'empty zip archive was accepted',
    );
  });

  for (const entryName of ['../escape', 'safe/../../escape', '/tmp/escape', 'C:/escape', 'C:\\escape']) {
    await runner.record(`unsafe tar entry is rejected: ${entryName}`, async () => {
      const archivePath = path.join(tempRoot, `unsafe-${Buffer.from(entryName).toString('hex')}.tar.gz`);
      await createTarGz(archivePath, [{ name: entryName, content: Buffer.from('bad') }]);
      await expectThrows(
        () => assertSafeTarArchiveEntries(archivePath),
        `unsafe tar entry was accepted: ${entryName}`,
      );
    });

    await runner.record(`unsafe zip entry is rejected: ${entryName}`, async () => {
      const archivePath = path.join(tempRoot, `unsafe-${Buffer.from(entryName).toString('hex')}.zip`);
      await createStoredZip(archivePath, [{ name: entryName, content: Buffer.from('bad') }]);
      await expectThrows(
        () => assertSafeZipArchiveEntries(archivePath),
        `unsafe zip entry was accepted: ${entryName}`,
      );
    });
  }

  await runner.record('zip entry with null byte is rejected by strict zip parser', async () => {
    const archivePath = path.join(tempRoot, 'null-byte.zip');
    await createStoredZip(archivePath, [{ name: 'safe\0evil', content: Buffer.from('bad') }]);
    await expectThrows(
      () => assertSafeZipArchiveEntries(archivePath),
      'null-byte zip entry was accepted',
    );
  });

  await runner.record('extracted symlinks are rejected', async () => {
    const symlinkRoot = path.join(tempRoot, 'symlink-root');
    await fs.mkdir(symlinkRoot, { recursive: true });
    await fs.writeFile(path.join(symlinkRoot, 'safe.txt'), 'ok');
    await fs.symlink('/tmp', path.join(symlinkRoot, 'escape-link'));
    await expectThrows(
      () => assertNoSymlinks(symlinkRoot),
      'symlink under extracted root was accepted',
    );
  });

  await runner.record('safe archive extraction stays inside target directory', async () => {
    const archivePath = path.join(tempRoot, 'extract-safe.zip');
    const targetDirectory = path.join(tempRoot, 'extract-target');
    const outsidePath = path.join(tempRoot, 'outside-write');
    await createStoredZip(archivePath, [{ name: 'nested/file.txt', content: Buffer.from('ok') }]);
    await fs.mkdir(targetDirectory, { recursive: true });
    await extractArchiveToDirectory(archivePath, targetDirectory);
    const extracted = await fs.readFile(path.join(targetDirectory, 'nested/file.txt'), 'utf8');
    expect(extracted === 'ok', 'safe archive file was not extracted');
    await assertNoOutsideWrite(outsidePath);
  });

  await runner.record('system tar command is available for production archive checks', () => {
    const result = spawnSync('tar', ['--version'], { encoding: 'utf8', stdio: 'pipe' });
    expect(result.status === 0, 'tar command is unavailable');
  });
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

runner.printAndSetExitCode();
