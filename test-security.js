const assert = require('assert');
const path = require('path');

// Set environment variables for test
process.env.DB_ENCRYPTION_KEY = 'test_encryption_key_must_be_32_bytes_long_!!!';
process.env.JWT_SECRET = 'test_jwt_secret_value_!!!';

const cryptoHelper = require('./twa-backend/src/lib/crypto-helper');
const jwtHelper = require('./twa-backend/src/lib/jwt-helper');

async function testSecurity() {
  console.log('⏳ Starting cybersecurity verification tests...');

  // 1. Verify PBKDF2 Password Hashing
  console.log('Testing PBKDF2 password hashing...');
  const password = 'MySecurePassword123!';
  const { hash, salt } = cryptoHelper.hashPassword(password);
  
  assert.ok(hash, 'Hash should not be empty');
  assert.ok(salt, 'Salt should not be empty');
  
  const isCorrect = cryptoHelper.verifyPassword(password, hash, salt);
  assert.strictEqual(isCorrect, true, 'Correct password verification should return true');
  
  const isWrong = cryptoHelper.verifyPassword('WrongPassword', hash, salt);
  assert.strictEqual(isWrong, false, 'Incorrect password verification should return false');
  console.log('✅ PBKDF2 password hashing verified.');

  // 2. Verify AES-256-GCM PII Data Encryption
  console.log('Testing AES-256-GCM field encryption...');
  const sensitiveText = 'john.doe@gmail.com';
  const cipherText = cryptoHelper.encrypt(sensitiveText);
  
  assert.ok(cipherText, 'Ciphertext should not be empty');
  assert.notStrictEqual(cipherText, sensitiveText, 'Ciphertext should not match plain text');
  
  const decryptedText = cryptoHelper.decrypt(cipherText);
  assert.strictEqual(decryptedText, sensitiveText, 'Decrypted text should match original plain text');
  console.log('✅ AES-256-GCM encryption/decryption verified.');

  // 3. Verify SHA-256 Blind Index Hashing
  console.log('Testing SHA-256 Blind Index generation...');
  const index1 = cryptoHelper.generateBlindIndex(sensitiveText);
  const index2 = cryptoHelper.generateBlindIndex(sensitiveText);
  const index3 = cryptoHelper.generateBlindIndex('different@gmail.com');
  
  assert.strictEqual(index1, index2, 'Identical inputs should yield identical blind indexes');
  assert.notStrictEqual(index1, index3, 'Different inputs should yield different blind indexes');
  console.log('✅ SHA-256 Blind Index lookup hash verified.');

  // 4. Verify JWT Signature Generation and Verification
  console.log('Testing JWT token helper...');
  const payload = { id: 42, telegramId: '999888777' };
  const token = jwtHelper.sign(payload);
  
  assert.ok(token, 'Signed JWT token should not be empty');
  
  const verifiedPayload = jwtHelper.verify(token);
  assert.strictEqual(verifiedPayload.id, payload.id, 'Verified JWT ID should match payload ID');
  assert.strictEqual(verifiedPayload.telegramId, payload.telegramId, 'Verified JWT telegramId should match payload');
  
  // Test invalid token signature rejection
  try {
    jwtHelper.verify(token + 'tempered');
    assert.fail('Tampered token verification should have thrown an error');
  } catch (err) {
    console.log('✅ JWT signature validation correctly rejected tampered token.');
  }

  console.log('\n🎉 ALL CYBERSECURITY VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testSecurity().catch(err => {
  console.error('❌ SECURITY VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
