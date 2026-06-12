import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error("ENCRYPTION_KEY is not set");
  }

  return crypto.createHash("sha256").update(key).digest();
}

/** Encrypts a string with AES-256-GCM, returning a base64 payload (iv + auth tag + ciphertext). */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/** Decrypts a base64 payload produced by {@link encrypt}. */
export function decrypt(payload: string): string {
  const data = Buffer.from(payload, "base64");

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = data.subarray(IV_LENGTH + 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

/** Masks a connection string / API key, showing only the last `visible` characters. */
export function mask(value: string, visible = 10): string {
  if (value.length <= visible) return "•".repeat(value.length);
  return `${"•".repeat(Math.min(value.length - visible, 24))}${value.slice(-visible)}`;
}
