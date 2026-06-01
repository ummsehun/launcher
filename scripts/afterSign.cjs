/**
 * electron-builder afterSign hook
 *
 * Signs bundled binaries (yt-dlp, ffmpeg) inside the packaged .app so that
 * macOS Gatekeeper doesn't block them at runtime.
 *
 * Runs only on macOS. On other platforms it's a no-op.
 */

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function afterSign(context) {
  const { electronPlatformName, appOutDir, packager } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);
  const binDir = path.join(appPath, 'Contents', 'Resources', 'bin', 'darwin-arm64');

  if (!fs.existsSync(binDir)) {
    console.log(`afterSign: bin directory not found, skipping: ${binDir}`);
    return;
  }

  const binaries = fs.readdirSync(binDir).map((name) => path.join(binDir, name));

  if (binaries.length === 0) {
    console.log('afterSign: no binaries found to sign');
    return;
  }

  // Signing identity is provided by electron-builder via CSC_LINK / CSC_NAME.
  // Fall back to '-' (ad-hoc) for local development builds.
  const identity = process.env.CSC_NAME || process.env.APPLE_SIGNING_IDENTITY || '-';

  for (const binaryPath of binaries) {
    console.log(`afterSign: signing ${binaryPath} with identity "${identity}"`);
    execFileSync('codesign', [
      '--force',
      '--sign', identity,
      binaryPath,
    ]);
  }

  console.log('afterSign: all binaries signed successfully');
};
