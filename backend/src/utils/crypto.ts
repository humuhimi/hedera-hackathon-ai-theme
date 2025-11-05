/**
 * Cryptography utilities for encrypting/decrypting sensitive data
 * Uses AES-256-GCM for encryption
 */
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive encryption key from base key and salt using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt text using AES-256-GCM
 * @param text Plain text to encrypt
 * @param password Encryption password/key
 * @returns Encrypted text in format: salt:iv:encrypted:authTag (all hex)
 */
export function encrypt(text: string, password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: salt:iv:encrypted:authTag
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    encrypted,
    authTag.toString('hex')
  ].join(':');
}

/**
 * Decrypt text encrypted with encrypt()
 * @param encryptedData Encrypted text from encrypt()
 * @param password Decryption password/key
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string, password: string): string {
  const parts = encryptedData.split(':');

  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const salt = Buffer.from(parts[0], 'hex');
  const iv = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const authTag = Buffer.from(parts[3], 'hex');

  const key = deriveKey(password, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash password or sensitive string
 * Uses SHA-256
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
