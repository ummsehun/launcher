import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, SecurityCheckRunner } from './security-test-utils';

const runner = new SecurityCheckRunner();
const root = process.cwd();

const readSource = (relativePath: string): Promise<string> =>
  fs.readFile(path.join(root, relativePath), 'utf8');

const getCspContent = (html: string): string => {
  const match = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i.exec(html);
  if (!match) {
    throw new Error('CSP meta tag is missing');
  }

  return match[1];
};

const getCspDirective = (csp: string, directiveName: string): string[] => {
  const directives = csp
    .split(';')
    .map((directive) => directive.trim())
    .filter(Boolean);
  const directive = directives.find((item) => item.split(/\s+/)[0] === directiveName);
  if (!directive) {
    throw new Error(`CSP directive is missing: ${directiveName}`);
  }

  return directive.split(/\s+/).slice(1);
};

await runner.record('BrowserWindow keeps contextIsolation enabled', async () => {
  const source = await readSource('src/main/core/create-window.ts');
  expect(/contextIsolation:\s*true/.test(source), 'contextIsolation is not explicitly true');
});

await runner.record('BrowserWindow keeps nodeIntegration disabled', async () => {
  const source = await readSource('src/main/core/create-window.ts');
  expect(/nodeIntegration:\s*false/.test(source), 'nodeIntegration is not explicitly false');
});

await runner.record('BrowserWindow keeps renderer sandbox enabled', async () => {
  const source = await readSource('src/main/core/create-window.ts');
  expect(/sandbox:\s*true/.test(source), 'renderer sandbox is not explicitly true');
});

await runner.record('dev renderer URL is blocked when packaged', async () => {
  const source = await readSource('src/main/core/window-security.ts');
  expect(source.includes('if (app.isPackaged)'), 'packaged-mode dev URL guard is missing');
  expect(source.includes('return false;'), 'packaged-mode dev URL guard does not fail closed');
});

await runner.record('external URL policy requires HTTPS and allowlisted hosts', async () => {
  const source = await readSource('src/main/core/window-security.ts');
  expect(source.includes("url.protocol === 'https:'"), 'external URL policy does not require https');
  expect(source.includes('ALLOWED_EXTERNAL_HOSTS.has(url.hostname)'), 'external URL policy does not use host allowlist');
});

await runner.record('shell.openExternal is only used in window-security helper', async () => {
  const files = [
    'src/main/core/window-security.ts',
    'src/main/handler/navigation.handler.ts',
    'src/main/index.ts',
    'src/main/preload.ts',
  ];
  const directUses: string[] = [];

  for (const file of files) {
    const source = await readSource(file);
    if (file !== 'src/main/core/window-security.ts' && source.includes('shell.openExternal')) {
      directUses.push(file);
    }
  }

  expect(directUses.length === 0, `shell.openExternal bypasses allowlist in: ${directUses.join(', ')}`);
});

await runner.record('preload exposes launcher API without raw ipcRenderer escape hatch', async () => {
  const source = await readSource('src/main/preload.ts');
  expect(source.includes("contextBridge.exposeInMainWorld('launcher'"), 'preload does not expose named launcher API');
  expect(!source.includes("exposeInMainWorld('ipcRenderer'"), 'preload exposes raw ipcRenderer');
  expect(!source.includes('send: ipcRenderer.send'), 'preload exposes raw ipcRenderer.send');
  expect(!source.includes('on: ipcRenderer.on'), 'preload exposes raw ipcRenderer.on');
});

await runner.record('renderer CSP includes required baseline directives', async () => {
  const csp = getCspContent(await readSource('src/renderer/index.html'));
  const requiredDirectives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'none'"],
  };

  for (const [directiveName, requiredValues] of Object.entries(requiredDirectives)) {
    const values = getCspDirective(csp, directiveName);
    for (const requiredValue of requiredValues) {
      expect(values.includes(requiredValue), `${directiveName} does not include ${requiredValue}`);
    }
  }
});

await runner.record('renderer CSP rejects high-risk script permissions', async () => {
  const csp = getCspContent(await readSource('src/renderer/index.html'));
  const scriptSrc = getCspDirective(csp, 'script-src');
  expect(!scriptSrc.includes("'unsafe-inline'"), "script-src allows 'unsafe-inline'");
  expect(!scriptSrc.includes("'unsafe-eval'"), "script-src allows 'unsafe-eval'");
  expect(!scriptSrc.includes('*'), 'script-src allows wildcard source');
});

await runner.record('renderer CSP style inline exception stays scoped to style-src', async () => {
  const csp = getCspContent(await readSource('src/renderer/index.html'));
  const styleSrc = getCspDirective(csp, 'style-src');
  expect(styleSrc.includes("'unsafe-inline'"), "documented style-src 'unsafe-inline' exception is absent");
  expect(!getCspDirective(csp, 'script-src').includes("'unsafe-inline'"), "script-src copied style-src 'unsafe-inline' exception");
});

runner.printAndSetExitCode();
