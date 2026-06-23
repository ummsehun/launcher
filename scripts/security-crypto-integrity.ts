import { verifySha256Digest } from '../src/main/services/archive-install-utils';
import { expectThrows, SecurityCheckRunner } from './security-test-utils';

const runner = new SecurityCheckRunner();

const matchingDigest = 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const matchingHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

await runner.record('SHA-256 digest accepts exact match', () => {
  verifySha256Digest(matchingDigest, matchingHex);
});

await runner.record('SHA-256 digest comparison is case-insensitive', () => {
  verifySha256Digest(
    'sha256:ABCDEFabcdefABCDEFabcdefABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD',
    'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  );
});

await runner.record('SHA-256 digest rejects mismatch', async () => {
  await expectThrows(
    () => verifySha256Digest(matchingDigest, 'f'.repeat(64)),
    'mismatched digest was accepted',
  );
});

await runner.record('SHA-256 digest rejects unsupported algorithm', async () => {
  await expectThrows(
    () => verifySha256Digest(`sha1:${'a'.repeat(40)}`, 'a'.repeat(64)),
    'unsupported digest algorithm was accepted',
  );
});

await runner.record('SHA-256 digest rejects short hex value', async () => {
  await expectThrows(
    () => verifySha256Digest(`sha256:${'a'.repeat(63)}`, 'a'.repeat(64)),
    'short SHA-256 digest was accepted',
  );
});

await runner.record('SHA-256 digest rejects long hex value', async () => {
  await expectThrows(
    () => verifySha256Digest(`sha256:${'a'.repeat(65)}`, 'a'.repeat(64)),
    'long SHA-256 digest was accepted',
  );
});

await runner.record('SHA-256 digest rejects non-hex value', async () => {
  await expectThrows(
    () => verifySha256Digest(`sha256:${'g'.repeat(64)}`, 'a'.repeat(64)),
    'non-hex SHA-256 digest was accepted',
  );
});

await runner.record('SHA-256 digest rejects missing prefix', async () => {
  await expectThrows(
    () => verifySha256Digest('a'.repeat(64), 'a'.repeat(64)),
    'digest without sha256 prefix was accepted',
  );
});

runner.printAndSetExitCode();
