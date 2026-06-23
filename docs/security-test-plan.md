# TermPlay Security Test Plan

## Purpose

TermPlay downloads, verifies, extracts, installs, and launches external terminal programs. Security tests must prove that this flow fails closed when integrity, archive safety, renderer isolation, or launch sandbox assumptions are broken.

This document defines the first security test build-out. It focuses on deterministic scripts that can run with the current `pnpm` and `tsx` setup, without introducing a new test framework.

## Current Confirmed State

- `package.json` already has security scripts:
  - `security:attack` -> `tsx scripts/security-attack-smoke.ts`
  - `security:sandbox` -> `tsx scripts/security-sandbox-probe.ts`
- Archive and digest helpers already exist in `src/main/services/archive-install-utils.ts`.
- Renderer CSP is currently declared as a `<meta http-equiv="Content-Security-Policy">` tag in `src/renderer/index.html`.
- Main window hardening is configured in `src/main/core/create-window.ts` with:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: true`
- External navigation is routed through allowlist logic in `src/main/core/window-security.ts`.

## Assumptions

- CI should run deterministic tests that do not require OS-specific sandbox runtimes.
- OS runtime probes should remain separate because macOS `sandbox-exec`, Linux `bubblewrap`, and Linux `firejail` availability differ by environment.
- Security scripts should avoid network access unless explicitly named as network or release validation checks.
- Tests should prefer real helper functions and temporary files over source-string checks when practical.

## Non-Goals

- Do not introduce Vitest, Jest, Playwright, or another test framework in this pass.
- Do not perform live GitHub release downloads in the default security suite.
- Do not fully prove OS sandbox isolation in cross-platform CI. Runtime sandbox probing remains a separate script.
- Do not refactor production security code unless a test exposes a real gap.

## Proposed Scripts

### `scripts/security-crypto-integrity.ts`

Purpose: verify digest validation behavior directly.

Checks:

- Accepts valid `sha256:<64 hex chars>` digest when the actual digest matches.
- Accepts digest comparison case-insensitively.
- Rejects digest mismatch.
- Rejects unsupported algorithms such as `sha1:...`.
- Rejects malformed SHA-256 values:
  - too short
  - too long
  - non-hex characters
  - missing `sha256:` prefix

Success criteria:

- Every check prints `PASS`.
- Any failed check sets `process.exitCode = 1`.

### `scripts/security-archive-integrity.ts`

Purpose: verify archive entry safety and extraction guardrails with real temporary archives.

Checks:

- Safe `.tar.gz` archive entries pass.
- Safe `.zip` archive entries pass.
- Empty tar or zip archive is rejected.
- Path traversal entries are rejected:
  - `../escape`
  - `safe/../../escape`
- Absolute paths are rejected:
  - `/tmp/escape`
- Windows drive paths are rejected:
  - `C:/escape`
  - `C:\escape`
- Null-byte-like unsafe entry names are rejected where the archive format allows detection.
- Extracted symlinks are rejected by `assertNoSymlinks`.
- Extraction writes only inside the target directory for safe archives.

Implementation notes:

- Use `mkdtemp` under `os.tmpdir()`.
- Use system `tar` for tar fixtures, matching the production helper dependency.
- Use a small Node-based zip creation path only if an existing dependency is available. If no writer exists, create zip fixtures with a stable system tool only when available and mark unavailable fixture creation as a skipped check with a clear reason.
- Always clean up the temporary root in `finally`.

Success criteria:

- Unsafe archives fail before or during extraction.
- No file appears outside the temporary extraction root.

### `scripts/security-electron-hardening.ts`

Purpose: prevent regressions in Electron and renderer security posture.

Checks:

- `BrowserWindow` configuration keeps:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: true`
- Renderer dev URL loading is blocked in packaged mode.
- External URL policy requires:
  - `https:` protocol
  - explicit host allowlist
- `shell.openExternal` is only reached through the allowlist helper.
- Preload exposes a named API surface and does not expose raw `ipcRenderer`.
- Renderer CSP exists in `src/renderer/index.html`.
- CSP includes:
  - `default-src 'self'`
  - `script-src 'self'`
  - `object-src 'none'`
  - `base-uri 'self'`
  - `form-action 'none'`
- CSP rejects:
  - `script-src 'unsafe-inline'`
  - `script-src 'unsafe-eval'`
  - wildcard script sources
- Existing `style-src 'unsafe-inline'` is allowed for now because the current Tailwind/Vite renderer may rely on style injection. This exception should be documented in the script output.

Success criteria:

- The script fails if high-risk Electron or CSP settings are weakened.
- Allowed CSP exceptions are explicit and narrow.

### `scripts/security-all.ts`

Purpose: aggregate deterministic security tests in one command.

Included:

- `security-attack-smoke.ts`
- `security-crypto-integrity.ts`
- `security-archive-integrity.ts`
- `security-electron-hardening.ts`

Excluded:

- `security-sandbox-probe.ts`, because it depends on local OS sandbox runtime availability.

Success criteria:

- Runs scripts sequentially.
- Stops at the end with a non-zero exit code if any script fails.
- Prints a compact summary of failed script names.

## Package Scripts

Add these scripts to `package.json`:

```json
{
  "security:integrity": "tsx scripts/security-crypto-integrity.ts && tsx scripts/security-archive-integrity.ts",
  "security:hardening": "tsx scripts/security-electron-hardening.ts",
  "security:all": "tsx scripts/security-all.ts"
}
```

Keep the existing scripts:

```json
{
  "security:attack": "tsx scripts/security-attack-smoke.ts",
  "security:sandbox": "tsx scripts/security-sandbox-probe.ts"
}
```

## Verification Flow

After implementation:

1. Run `pnpm run security:integrity`.
2. Run `pnpm run security:hardening`.
3. Run `pnpm run security:all`.
4. Run `pnpm run typecheck`.
5. Optionally run `pnpm run security:sandbox` on a machine with the expected sandbox runtime.

## Implementation Order

1. Add small shared test helpers only if duplication across scripts becomes noisy.
2. Write `security-crypto-integrity.ts` first because it is isolated and deterministic.
3. Write `security-electron-hardening.ts` next because it only reads source files.
4. Write `security-archive-integrity.ts` after confirming available archive fixture tooling.
5. Write `security-all.ts`.
6. Add `package.json` scripts.
7. Run the verification flow.

## Open Risks

- Meta CSP cannot provide every header-level CSP directive. `frame-ancestors`, `sandbox`, and report-only behavior cannot be fully represented by the current meta tag approach.
- Source-string checks can catch regressions, but they do not prove runtime behavior by themselves.
- OS sandbox behavior can only be fully trusted after runtime probes on the target OS.
- Release asset SHA-256 verification proves downloaded bytes match the expected digest, but the trustworthiness of the expected digest still depends on how release metadata is maintained.
