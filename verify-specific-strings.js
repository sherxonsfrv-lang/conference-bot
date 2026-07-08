const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function decryptWithKey(encryptedText, rawKey) {
  if (!encryptedText) return encryptedText;
  try {
    const ENCRYPTION_KEY = crypto.createHash('sha256').update(rawKey).digest();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return null;
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
}

const stringsToTest = [
  '70c0072df044e5ae0b1c0a27:f878ede370b1feb14616ddc72af71550:5651503d',
  '05d6aab599c4750ef0968e8d:4d34fae509309e865c973ff10278c8fe:540aa0e7344a'
];

const keysToTest = {
  'TELEGRAM_BOT_TOKEN': '8904912477:AAFqRhYZauC_X1CV3Arljs3D4gUjHglrRO8',
  'NEW_DB_ENCRYPTION_KEY': '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p',
  'HARDCODED_FALLBACK': 'secure_fallback_encryption_key_32bytes_min'
};

for (const encryptedText of stringsToTest) {
  console.log(`\nTesting: ${encryptedText}`);
  for (const [keyName, keyValue] of Object.entries(keysToTest)) {
    const result = decryptWithKey(encryptedText, keyValue);
    if (result) {
      console.log(`🎉 SUCCESS! Key "${keyName}" decrypted it to: "${result}"`);
    } else {
      console.log(`❌ Failed with key "${keyName}"`);
    }
  }
}
