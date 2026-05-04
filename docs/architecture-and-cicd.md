# TermPlay Architecture and CI/CD

## Architecture Overview

TermPlay is an Electron desktop launcher with three main runtime layers:

- Main process: app bootstrap, IPC handlers, window management, update checks.
- Preload bridge: type-safe `window.launcher` API exposed with `contextBridge`.
- Renderer: React UI backed by Zustand stores.

The runtime also has a shared service layer for Gascii and Mienjine. Both series follow the same install/launch pattern, but Gascii resolves the latest GitHub release while Mienjine uses the release metadata embedded in `series-definitions.ts`.

Important troubleshooting distinction: TermPlay does not install Ghostty, Terminal, or kitty from GitHub. Those terminal apps are expected to already exist on the machine. What comes from GitHub is the Gascii or Mienjine payload archive, which is then installed under the managed TermPlay root.

```mermaid
flowchart LR
  subgraph Runtime[Runtime Architecture]
    U[User]

    subgraph Renderer[Renderer]
      R0[App.tsx]
      R1[LauncherPage and FeatureModal]
      R2[Zustand stores]
      R0 --> R1 --> R2
    end

    subgraph Bridge[Preload Bridge]
      P0[preload.ts]
      P1[window.launcher API]
      P0 --> P1
    end

    subgraph Main[Main Process]
      M0[index.ts]
      M1[createMainWindow]
      M2[IPC handlers]
      M3[auto-update.service]
      M4[LauncherConfigRepository]
      M0 --> M1
      M0 --> M2
      M0 --> M3
      M2 --> M4
    end

    subgraph Services[Series Services]
      S0[GasciiSeriesService]
      S1[MienjineSeriesService]
      S2[Release resolvers]
      S3[Installers]
      S4[Integrity checks]
      S5[Terminal launchers]
      S6[series-launch-security]
      S0 --> S2 --> S3 --> S4 --> S5 --> S6
      S1 --> S2
    end

    subgraph Storage[State and Files]
      D0[ElectronStore under userData/Term]
      D1[Managed install dirs]
      D2[Downloaded archives]
    end

    U --> Renderer
    Renderer --> Bridge
    Bridge --> Main
    Main --> Services
    Services --> Storage
    Main -->|launch progress| Renderer
  end

  subgraph Security[Security boundaries]
    W0[BrowserWindow sandbox=true]
    W1[contextIsolation=true]
    W2[nodeIntegration=false]
    W3[window-security navigation allowlist]
  end

  Main -.-> Security

  subgraph External[External runtime targets]
    E0[Ghostty]
    E1[Terminal]
    E2[kitty]
    E3[sandbox-exec on macOS when enabled]
    E4[GitHub Releases]
  end

  S5 --> E0
  S5 --> E1
  S5 --> E2
  S6 --> E3
  M3 --> E4
```

### Runtime flow in practice

1. The renderer calls `window.launcher.*`.
2. The preload bridge forwards the call to IPC.
3. The main process routes the request to the correct handler.
4. The series service resolves the release, downloads the archive, verifies it, extracts it, and stores install info.
5. Launch verifies the installed files again, then starts an external terminal session.
6. On packaged builds, `auto-update.service` checks GitHub Releases and installs updates on quit.

## CI/CD Pipeline

```mermaid
flowchart LR
  subgraph CI[CI]
    C0[Pull request or push to main]
    C1[.github/workflows/ci.yml]
    C2[Checkout]
    C3[Setup Bun]
    C4[bun install --frozen-lockfile]
    C5[bun run ci]
    C6[validate:series]
    C7[validate:bundled-binaries]
    C8[typecheck]
    C9[build]
    C0 --> C1 --> C2 --> C3 --> C4 --> C5
    C5 --> C6 --> C7 --> C8 --> C9
  end

  subgraph Release[Release]
    R0[Push v* tag]
    R1[.github/workflows/release.yml]
    R2[Validate tag matches package.json version]
    R3[Prepare Linux bundled binaries]
    R4[Prepare Windows bundled binaries]
    R5[Validate bundled binaries]
    R6[bun run release:linux]
    R7[bun run release:win]
    R8[electron-builder.json]
    R9[GitHub Releases]
    R10[finalize-release marks latest]
    R0 --> R1 --> R2
    R2 --> R3 --> R4 --> R5 --> R6 --> R7 --> R8 --> R9 --> R10
  end

  subgraph LocalMac[Local macOS release]
    L0[bun run release:mac or dist:mac]
    L1[electron-builder.json]
    L2[GitHub Releases]
    L0 --> L1 --> L2
  end

  CI -->|build artifacts| Release
  Release -->|update feed| E4
  LocalMac -->|publishes macOS artifacts| E4
```

### CI/CD notes

- CI runs on pull requests and pushes to `main`.
- Release runs on `v*` tags and validates that the tag matches `package.json`.
- Linux and Windows release jobs bundle platform binaries before `electron-builder` runs.
- macOS releases are built locally with `bun run release:mac` or `bun run dist:mac`.
- `electron-builder.json` publishes to GitHub Releases, which is also what the runtime auto-update service checks.

## External Terminal Automation Troubleshooting

This is the part to use when the complaint is "the external terminal did not open" or "the app says it downloaded something from GitHub, but the terminal launch failed".

### What is sourced from GitHub

- Gascii: `gascii-release-resolver.ts` calls the GitHub latest release API, filters the matching platform asset, and requires a SHA-256 digest before install.
- Mienjine: `mienjine-release-resolver.ts` reads the static release definition in `series-definitions.ts`, builds the GitHub release asset URL, and installs that archive.
- Both installers verify the downloaded archive, reject unsafe tar entries, and block symlink tricks before extraction.

### What is local only

- Ghostty, Terminal.app, and kitty are not bundled and not downloaded by TermPlay.
- On macOS, the launchers probe existing local installs first, then fall back to `command -v`.
- If none of the expected terminal apps are installed, the launch path fails with a terminal-not-found error instead of trying to install one.

### Launch sequence

```mermaid
flowchart TD
  A[User clicks Launch] --> B[Series service]
  B --> C[Check installed info in ElectronStore]
  C --> D[Verify binary or start script]
  D --> E[Prepare permissions and quarantine cleanup]
  E --> F[Build sandbox or direct launch command]
  F --> G[Resolve local terminal app]
  G --> H{Terminal found?}
  H -->|No| I[Fail with no supported terminal]
  H -->|Yes| J[Open Ghostty, Terminal, or kitty]
  J --> K[Run command in external terminal]
  K --> L[Request fullscreen on macOS]
```

### Failure matrix

| Symptom | Likely cause | Where to look |
|---|---|---|
| Release lookup fails | GitHub API error, bad tag, rate limit | [gascii-release-resolver.ts](src/main/services/gascii-release-resolver.ts), [mienjine-release-resolver.ts](src/main/services/mienjine-release-resolver.ts) |
| Download fails | Network error or missing asset | [gascii-installer.ts](src/main/services/gascii-installer.ts), [mienjine-installer.ts](src/main/services/mienjine-installer.ts) |
| SHA-256 verification fails | Asset mismatch or corrupted download | [archive-install-utils.ts](src/main/services/archive-install-utils.ts) |
| Archive contains unsafe entry | Path traversal, absolute path, bad tar layout | [archive-install-utils.ts](src/main/services/archive-install-utils.ts) |
| Symlink rejected | Archive contains symbolic links | [archive-install-utils.ts](src/main/services/archive-install-utils.ts) |
| Launch says no supported terminal was found | Ghostty, Terminal.app, or kitty is not installed or not resolvable | [gascii-terminal-launcher.ts](src/main/services/gascii-terminal-launcher.ts), [mienjine-terminal-launcher.ts](src/main/services/mienjine-terminal-launcher.ts) |
| macOS sandbox error | `TERMPLAY_ENABLE_EXPERIMENTAL_MAC_SANDBOX=1` is set but `sandbox-exec` is missing | [processSandbox.ts](src/main/security/processSandbox.ts) |
| Sandbox disabled in production | The env var that disables sandbox was set in a production build | [processSandbox.ts](src/main/security/processSandbox.ts) |
| Quarantine cleanup warning | `xattr` could not remove `com.apple.quarantine` | [gascii-installer.ts](src/main/services/gascii-installer.ts), [mienjine-installer.ts](src/main/services/mienjine-installer.ts) |

### macOS-specific rules

- The installed executable or start script is chmoded to `755` before launch.
- The install root is passed through `xattr -dr com.apple.quarantine` on macOS.
- If experimental macOS sandboxing is enabled, TermPlay writes a sandbox profile into `.termplay-sandbox/` and launches through `sandbox-exec`.
- If sandboxing is not enabled, the command is launched directly.
- The fullscreen request is done with `osascript`; if that step fails, the terminal still launches and only the fullscreen request is logged as a warning.

### Quick mental model

1. GitHub supplies the app payload archive, not the terminal app.
2. TermPlay installs the payload into the managed Term root.
3. On launch, TermPlay checks the install, prepares permissions, then asks the local terminal app to execute the command.
4. If launch breaks, the failure is usually in one of four places: GitHub asset selection, archive validation, local terminal discovery, or macOS permission/sandbox handling.
