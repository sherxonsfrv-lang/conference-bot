const crypto = require('crypto');
require('dotenv').config();

// Derive a secure 32-byte encryption key from the environment variable (or fallback safely for local dev)
const rawKey = process.env.DB_ENCRYPTION_KEY || process.env.TELEGRAM_BOT_TOKEN || 'secure_fallback_encryption_key_32bytes_min';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(rawKey).digest();
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a text string using AES-256-GCM
 */
function encrypt(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedText
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return text; // Fail-safe fallback to raw text
  }
}

/**
 * Decrypt an AES-256-GCM encrypted string
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // Not encrypted or wrong format, return as is (useful for transitional phases)
      return encryptedText;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    // Return original text if decryption fails, ensuring no complete crash
    return encryptedText;
  }
}

/**
 * Generate a SHA-256 Blind Index for exact matching lookups
 */
function generateBlindIndex(text) {
  if (!text) return null;
  // Normalize (trim, lowercase) to ensure exact lookups match regardless of casing
  const normalized = text.trim().toLowerCase();
  return crypto.createHmac('sha256', ENCRYPTION_KEY).update(normalized).digest('hex');
}

/**
 * Hash a password using PBKDF2-SHA512 with 100,000 iterations
 */
function hashPassword(password) {
  if (!password) throw new Error('Password is required');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify a password against a PBKDF2 hash and salt
 */
function verifyPassword(password, hash, salt) {
  if (!password || !hash || !salt) return false;
  const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

module.exports = {
  encrypt,
  decrypt,
  generateBlindIndex,
  hashPassword,
  verifyPassword
};
