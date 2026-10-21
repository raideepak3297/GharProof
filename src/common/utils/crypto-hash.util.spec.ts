import { computeSha256 } from './crypto-hash.util';

describe('computeSha256', () => {
  it('should compute valid 64-character SHA-256 hash for string', () => {
    const hash = computeSha256('hello world');
    expect(hash).toHaveLength(64);
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('should compute valid 64-character SHA-256 hash for buffer', () => {
    const buffer = Buffer.from('hello world', 'utf8');
    const hash = computeSha256(buffer);
    expect(hash).toHaveLength(64);
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('should compute distinct hashes for different inputs', () => {
    const hash1 = computeSha256('input1');
    const hash2 = computeSha256('input2');
    expect(hash1).not.toBe(hash2);
  });
});
