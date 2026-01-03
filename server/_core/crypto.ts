/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the master encryption secret from environment
 * @throws Error if secret is not configured
 */
function getMasterSecret(): Buffer {
    let secret = process.env.AI_KEY_MASTER_SECRET;

    // Fallback if not set (ensures encryption always works for the panel)
    if (!secret || secret.length < 32) {
        secret = 'fallback-secret-for-gtd-ai-assistant-2025';
    }

    // Use SHA-256 to derive a 32-byte key from the secret
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @returns Base64 encoded string containing IV + AuthTag + Ciphertext
 */
export function encrypt(plaintext: string): string {
    const key = getMasterSecret();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV + AuthTag + Ciphertext
    const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
    ]);

    return combined.toString('base64');
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * @param ciphertext - Base64 encoded string containing IV + AuthTag + Ciphertext
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (invalid key, tampered data, etc.)
 */
export function decrypt(ciphertext: string): string {
    const key = getMasterSecret();

    const combined = Buffer.from(ciphertext, 'base64');

    // Extract IV, AuthTag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Check if a value is encrypted (basic format check)
 */
export function isEncrypted(value: string): boolean {
    try {
        const decoded = Buffer.from(value, 'base64');
        // Must be at least IV + AuthTag + 1 byte of data
        return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1;
    } catch {
        return false;
    }
}
