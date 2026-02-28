/**
 * Field-level AES-256-GCM encryption for sensitive data (passport numbers).
 *
 * The encryption key is loaded from ENCRYPTION_KEY env var (32-byte base64 string).
 * Each encrypt call generates a fresh 12-byte IV — safe for ~2^32 encryptions per key.
 *
 * Ciphertext format stored in DB: "<iv_base64>:<authTag_base64>:<ciphertext_base64>"
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set in environment variables.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be 32 bytes (256 bits). Got ${key.length} bytes.`
    );
  }
  return key;
}

/**
 * Encrypts a plaintext string.
 * Returns a composite string: "<iv>:<authTag>:<ciphertext>" (all base64).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts a value previously produced by encrypt().
 */
export function decrypt(composite: string): string {
  const key = getKey();
  const parts = composite.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format.");
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

// Standard base64 character set (including padding)
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;

/**
 * Returns true if the value is a valid encrypted composite string produced by encrypt().
 *
 * Validates:
 * - Exactly 3 colon-separated segments
 * - Segment 1 (IV): exactly 16 base64 chars (12 bytes → 16 base64 chars)
 * - Segment 2 (auth tag): exactly 24 base64 chars (16 bytes → 24 base64 chars)
 * - Segment 3 (ciphertext): non-empty, valid base64
 *
 * A plain passport number — even one that contains colons — will fail the
 * length and charset checks, preventing accidental double-encryption or
 * silent decrypt failures.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  const [ivB64, authTagB64, ciphertextB64] = parts;
  return (
    ivB64.length === 16 &&       // 12-byte IV  → exactly 16 base64 chars
    authTagB64.length === 24 &&  // 16-byte tag → exactly 24 base64 chars
    ciphertextB64.length > 0 &&
    BASE64_RE.test(ivB64) &&
    BASE64_RE.test(authTagB64) &&
    BASE64_RE.test(ciphertextB64)
  );
}
