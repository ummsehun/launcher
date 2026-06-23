import assert from 'node:assert/strict';
import { MienjineReleaseResolver } from '../src/main/services/mienjine-release-resolver';

const resolver = new MienjineReleaseResolver(async () => new Response(JSON.stringify({
  tag_name: 'v9.9.9',
  assets: [
    {
      name: 'terminal-miku3d-macos-arm64.tar.gz',
      browser_download_url: 'https://example.com/mienjine.tar.gz',
      size: 123,
      digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
  ],
})));

const release = await resolver.resolveRelease();

assert.equal(release.tag, 'v9.9.9');
assert.equal(release.asset.browser_download_url, 'https://example.com/mienjine.tar.gz');
