import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import yauzl from 'yauzl';

const execAsync = promisify(exec);

async function adHocSignBinary(binaryPath: string): Promise<void> {
  if (process.platform !== 'darwin') return;
  console.log(`Ad-hoc signing: ${binaryPath}`);
  await execAsync(`codesign --force --sign - ${JSON.stringify(binaryPath)}`);
}


const PLATFORM = process.env.TERMPLAY_DOWNLOAD_PLATFORM || `${process.platform}-${process.arch}`;
const BIN_ROOT = path.join(process.cwd(), 'resources', 'bin');
const DEST_DIR = path.join(BIN_ROOT, PLATFORM);

const DOWNLOADS: Record<string, { ytDlpUrl: string; ffmpegUrl: string; ytDlpName: string; ffmpegName: string }> = {
  'darwin-arm64': {
    ytDlpUrl: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
    ffmpegUrl: 'https://ffmpeg.martin-riedl.de/redirect/latest/macos/arm64/release/ffmpeg.zip',
    ytDlpName: 'yt-dlp',
    ffmpegName: 'ffmpeg',
  },
  'linux-x64': {
    ytDlpUrl: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
    ffmpegUrl: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    ytDlpName: 'yt-dlp',
    ffmpegName: 'ffmpeg',
  },
  'win32-x64': {
    ytDlpUrl: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    ffmpegUrl: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    ytDlpName: 'yt-dlp.exe',
    ffmpegName: 'ffmpeg.exe',
  },
};

async function downloadFile(url: string, destPath: string): Promise<void> {
  console.log(`Downloading: ${url} -> ${destPath}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download from ${url}: HTTP ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error(`Response body is empty for ${url}`);
  }

  // @ts-ignore
  const nodeReadable = Readable.fromWeb(response.body);
  const writer = createWriteStream(destPath);
  await pipeline(nodeReadable, writer);
}

function extractFileFromZip(zipPath: string, targetFileName: string, destPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    console.log(`Extracting ${targetFileName} from ${zipPath} -> ${destPath}`);
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      if (!zipfile) return reject(new Error('Failed to open zip archive'));

      let found = false;

      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        const baseName = entry.fileName.split('/').pop();
        if (baseName === targetFileName) {
          found = true;
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              zipfile.close();
              return reject(err);
            }
            if (!readStream) {
              zipfile.close();
              return reject(new Error('Failed to open entry read stream'));
            }

            const writeStream = createWriteStream(destPath);
            readStream.pipe(writeStream);
            writeStream.on('finish', () => {
              zipfile.close();
              resolve();
            });
            writeStream.on('error', (e) => {
              zipfile.close();
              reject(e);
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on('end', () => {
        if (!found) {
          zipfile.close();
          reject(new Error(`Target file ${targetFileName} not found in zip archive`));
        }
      });

      zipfile.on('error', (e) => {
        reject(e);
      });
    });
  });
}

async function extractFfmpegFromTarXz(tarXzPath: string, destPath: string): Promise<void> {
  console.log(`Extracting ffmpeg from ${tarXzPath} using system tar -> ${destPath}`);
  const tempExtractDir = path.join(path.dirname(tarXzPath), 'temp-tar-extract');
  await fs.mkdir(tempExtractDir, { recursive: true });

  try {
    await execAsync(`tar -xf "${tarXzPath}" -C "${tempExtractDir}"`);
    // Find the ffmpeg binary in the extracted directories
    const files = await fs.readdir(tempExtractDir, { recursive: true });
    // @ts-ignore
    const ffmpegRelativePath = files.find((f: string) => f.endsWith('/ffmpeg') || f === 'ffmpeg');

    if (!ffmpegRelativePath) {
      throw new Error('ffmpeg binary not found in extracted tar.xz archive');
    }

    const sourcePath = path.join(tempExtractDir, ffmpegRelativePath);
    await fs.copyFile(sourcePath, destPath);
  } finally {
    await fs.rm(tempExtractDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log(`Starting binary downloader for platform: ${PLATFORM}`);
  const config = DOWNLOADS[PLATFORM];

  if (!config) {
    console.error(`Unsupported platform for standalone binary downloader: ${PLATFORM}`);
    process.exit(1);
  }

  await fs.mkdir(DEST_DIR, { recursive: true });

  const tempDir = path.join(process.cwd(), 'resources', 'temp');
  await fs.mkdir(tempDir, { recursive: true });

  const ytDlpDest = path.join(DEST_DIR, config.ytDlpName);
  const ffmpegDest = path.join(DEST_DIR, config.ffmpegName);

  try {
    // 1. Download and save yt-dlp
    console.log(`\n--- Fetching yt-dlp binary for ${PLATFORM} ---`);
    await downloadFile(config.ytDlpUrl, ytDlpDest);
    if (process.platform !== 'win32') {
      await fs.chmod(ytDlpDest, 0o755);
    }
    await adHocSignBinary(ytDlpDest);
    console.log('yt-dlp binary setup complete.');

    // 2. Download and extract ffmpeg
    console.log(`\n--- Fetching ffmpeg archive for ${PLATFORM} ---`);
    const isZip = config.ffmpegUrl.includes('zip') || config.ffmpegUrl.endsWith('.zip');
    const archiveExt = isZip ? '.zip' : '.tar.xz';
    const tempArchive = path.join(tempDir, `ffmpeg-archive${archiveExt}`);

    await downloadFile(config.ffmpegUrl, tempArchive);

    if (isZip) {
      await extractFileFromZip(tempArchive, config.ffmpegName, ffmpegDest);
    } else {
      await extractFfmpegFromTarXz(tempArchive, ffmpegDest);
    }

    if (process.platform !== 'win32') {
      await fs.chmod(ffmpegDest, 0o755);
    }
    await adHocSignBinary(ffmpegDest);
    console.log('ffmpeg binary setup complete.');

  } catch (error) {
    console.error('Binary downloader failed with error:', error);
    process.exit(1);
  } finally {
    // Cleanup temporary files
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  console.log(`\nSuccessfully finalized dynamic binary installation for: ${PLATFORM}`);
}

main();
