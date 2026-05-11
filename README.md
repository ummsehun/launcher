# TermPlay
![TermPlay Logo](docs/image/banner.png)
터미널 기반 프로그램의 **다운로드 → 검증 → 설치 → 실행 경계**를 통합 관리하는 Electron 크로스플랫폼 런처입니다.

## 1. 프로젝트 개요
TermPlay는 Gascii, Mienjine 같은 터미널 프로그램을 GUI에서 설치/업데이트/실행할 수 있도록 만든 데스크톱 런처입니다.  
핵심은 단순 실행기가 아니라, 외부 실행 파일을 다루는 과정을 안전한 경계 안에서 일관되게 처리하는 것입니다.

## 2. 해결하고자 한 문제
- 터미널 앱은 일반 사용자가 직접 설치/실행하기 어렵습니다.
- 플랫폼별 바이너리, 실행 권한, 실행 방식이 달라 운영이 복잡합니다.
- Electron 앱에서 UI(Renderer)와 로컬 실행 권한의 분리가 약하면 보안 리스크가 커집니다.

TermPlay는 이 문제를 **설치 파이프라인 표준화 + 실행 경계 분리**로 해결합니다.

## 3. 핵심 기능
- 터미널 시리즈 선택 및 실행 (Gascii / Mienjine)
- GitHub Releases 기반 플랫폼별 바이너리 조회/다운로드
- SHA-256 기반 무결성 검증
- staging 경유 안전 설치 흐름
- 시리즈 상태 조회, 검증(verify), 제거(remove) 지원

## 4. 전체 아키텍처
Renderer는 UI/상태 관리만 담당하고, 파일 시스템 접근과 외부 실행은 Main Process에서만 수행합니다.  
Preload(`contextBridge`)는 Renderer에 제한된 API만 노출합니다.

![TermPlay Architecture](docs/image/architecture.png)

## 5. 설치 / 실행 파이프라인
| 단계 | 처리 내용 |
|---|---|
| 1 | 시리즈 선택 및 릴리스 정보 조회 |
| 2 | 플랫폼별 바이너리 다운로드 |
| 3 | SHA-256 체크섬 검증 |
| 4 | 아카이브 엔트리 유효성 검사 |
| 5 | staging 디렉터리에 압축 해제 |
| 6 | 최종 설치 경로로 이동 |
| 7 | 설치 메타데이터 저장 |
| 8 | 외부 터미널에서 실행 |

압축 파일을 바로 최종 경로에 푸는 대신 staging에서 먼저 검증한 뒤 반영해, 손상 파일/경로 오염/중단 설치 리스크를 줄였습니다.

## 6. Electron 보안 설계
- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- `contextBridge` 기반 제한 API 노출
- 파일 시스템/다운로드/설치/외부 프로세스 실행은 Main Process 전용
- `realpath` 기반 설치 경로 검증
- 외부 링크 허용 도메인 제한(`github.com`, `www.github.com`)

![TermPlay Security](docs/image/security.png)

## 7. 기술적 문제와 해결
### 1) 릴리스 자산 구조 차이
시리즈/플랫폼마다 자산 구성이 달라 설치 흐름이 쉽게 깨졌습니다.  
**해결:** Release Resolver와 Installer를 분리해 조회/검증/설치 책임을 단계별로 고정했습니다.

### 2) Renderer 권한 확산 위험
Renderer 침해 시 Node 권한으로 이어질 가능성이 있었습니다.  
**해결:** Renderer/Preload/Main 경계를 분리하고 Main에서만 로컬 권한 작업을 허용했습니다.

### 3) 플랫폼별 실행 방식 차이
macOS/Windows/Linux의 권한 처리와 터미널 실행 방식이 다릅니다.  
**해결:** 시리즈별/플랫폼별 런처 경로를 분리해 실행 안정성을 확보했습니다.

## 8. 기술 스택
| 영역 | 기술 |
|---|---|
| Desktop Runtime | Electron |
| Renderer | React, Tailwind CSS |
| State Management | Zustand |
| Type Safety | TypeScript, Zod |
| Build | Electron Vite, Electron Builder |
| CI/CD | GitHub Actions |
| Distribution | GitHub Releases |

## 9. 실행 화면
| Light | Dark |
|---|---|
| ![TermPlay Light UI](docs/image/light.png) | ![TermPlay Dark UI](docs/image/dark.png) |

## 10. 실행 방법
### Development
```bash
bun install
bun run dev
```

### Build
```bash
bun run build
```

### Release Tag
```bash
git tag v0.1.0
git push origin v0.1.0
```

### macOS Release
```bash
GH_TOKEN=... bun run release:mac
```
