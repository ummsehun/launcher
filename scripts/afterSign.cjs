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

  let identity = process.env.CSC_NAME || process.env.APPLE_SIGNING_IDENTITY;

  if (!identity || identity === '-') {
    console.log('afterSign: attempting to auto-resolve Developer ID certificate from keychain');
    try {
      const output = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning']).toString();
      const matches = [...output.matchAll(/"(Developer ID Application: [^"]+)"/g)];
      if (matches.length > 0) {
        identity = matches[0][1];
        console.log(`afterSign: dynamically found Developer ID identity: "${identity}"`);
      }
    } catch (err) {
      console.warn('afterSign: failed to run security find-identity:', err.message);
    }
  }

  if (!identity) {
    console.log('afterSign: falling back to ad-hoc signing ("-")');
    identity = '-';
  }

  for (const binaryPath of binaries) {
    console.log(`afterSign: signing ${binaryPath} with identity "${identity}"`);
    const args = ['--force'];
    if (identity !== '-') {
      args.push('--options', 'runtime', '--timestamp');
    }
    args.push('--sign', identity, binaryPath);
    execFileSync('codesign', args);
  }

  console.log('afterSign: all binaries signed successfully');
};
