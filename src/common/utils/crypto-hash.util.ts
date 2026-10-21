import * as crypto from 'crypto';

/**
 * Computes lowercase 64-character hexadecimal SHA-256 hash
 * over raw buffer or UTF-8 string input.
 */
export function computeSha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
