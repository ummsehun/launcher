import { GithubReleaseLookupError, type GithubReleaseAsset, type SelectedRelease } from './gascii-release-resolver';
import { getRuntimePlatformKey, SERIES_DEFINITIONS } from './series-definitions';

const MIENJINE_DEFINITION = SERIES_DEFINITIONS.mienjine;

export class MienjineReleaseResolver {
  constructor(private readonly fetchRelease: typeof fetch = fetch) {}

  async resolveRelease(): Promise<SelectedRelease> {
    const release = await this.fetchLatestRelease();
    const asset = this.getAsset();
    const releaseAsset = release.assets.find((candidate) => candidate.name === asset.name);

    if (!releaseAsset) {
      throw new Error(`Mienjine release asset not found: ${asset.name}`);
    }

    if (!/^sha256:[a-f0-9]{64}$/i.test(releaseAsset.digest)) {
      throw new Error(`Mienjine release asset is missing a SHA-256 digest: ${asset.name}`);
    }

    return {
      tag: release.tag,
      asset: releaseAsset,
    };
  }

  getAsset(): { name: string; size: number; digest: string } {
    const release = MIENJINE_DEFINITION.release;
    if (!release) {
      throw new Error('Mienjine release definition is missing');
    }

    const platformKey = getRuntimePlatformKey();
    const asset = release.assets[platformKey];
    if (!asset) {
      throw new Error(`Mienjine release asset is not configured for platform: ${platformKey}`);
    }

    return asset;
  }

  assertSupportedPlatform(): void {
    this.getAsset();
  }

  private async fetchLatestRelease(): Promise<{ tag: string; assets: GithubReleaseAsset[] }> {
    const release = MIENJINE_DEFINITION.release;
    if (!release) {
      throw new Error('Mienjine release definition is missing');
    }

    const response = await this.fetchRelease(`https://api.github.com/repos/${release.owner}/${release.repo}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'TermPlay',
      },
    });

    if (!response.ok) {
      const responseMessage = await this.readGithubErrorMessage(response);
      const detail = responseMessage ? `: ${responseMessage}` : '';
      throw new GithubReleaseLookupError(
        `GitHub latest release lookup failed: HTTP ${response.status}${detail}`,
        response.status,
        responseMessage,
        response.headers.get('x-ratelimit-reset') ?? undefined,
      );
    }

    const data = await response.json() as {
      tag_name?: unknown;
      assets?: Array<{
        name?: unknown;
        browser_download_url?: unknown;
        size?: unknown;
        digest?: unknown;
      }>;
    };

    if (typeof data.tag_name !== 'string') {
      throw new Error('GitHub latest release response did not include a valid tag');
    }

    if (!Array.isArray(data.assets)) {
      throw new Error('GitHub latest release response did not include assets');
    }

    return {
      tag: data.tag_name,
      assets: data.assets
        .filter((asset): asset is GithubReleaseAsset =>
          typeof asset.name === 'string' &&
          typeof asset.browser_download_url === 'string' &&
          typeof asset.digest === 'string' &&
          (typeof asset.size === 'number' || typeof asset.size === 'undefined'),
        ),
    };
  }

  private async readGithubErrorMessage(response: Response): Promise<string | undefined> {
    try {
      const data = await response.json() as { message?: unknown };
      return typeof data.message === 'string' ? data.message : undefined;
    } catch {
      return undefined;
    }
  }
}

export const mienjineReleaseResolver = new MienjineReleaseResolver();
