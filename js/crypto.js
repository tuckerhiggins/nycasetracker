/**
 * NYC Case Tracker - Encryption Module
 * AES-GCM encryption using Web Crypto API with PBKDF2 key derivation
 */

const ENCRYPTION_VERSION = 'nyct-v1';
const PBKDF2_ITERATIONS = 100000;

/**
 * Ensure browser supports Web Crypto API
 */
function ensureCryptoSupport() {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('This browser does not support secure encryption (Web Crypto API).');
  }
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive an encryption key from a password using PBKDF2
 */
async function deriveKeyFromPassword(password, salt) {
  ensureCryptoSupport();
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string with a password
 * Returns a JSON string containing encrypted data and metadata
 */
export async function encryptStringWithPassword(plaintext, password) {
  ensureCryptoSupport();
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassword(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  const payload = {
    v: ENCRYPTION_VERSION,
    alg: 'AES-GCM',
    kdf: 'PBKDF2',
    iterations: PBKDF2_ITERATIONS,
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(ciphertext)
  };
  return JSON.stringify(payload);
}

/**
 * Decrypt a string with a password
 * Takes the JSON string from encryptStringWithPassword
 */
export async function decryptStringWithPassword(payloadText, password) {
  ensureCryptoSupport();
  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    throw new Error('Backup file is not valid JSON.');
  }

  if (!payload || payload.v !== ENCRYPTION_VERSION) {
    throw new Error('Unsupported or missing encryption format/version.');
  }

  const saltBuf = base64ToArrayBuffer(payload.salt);
  const ivBuf = base64ToArrayBuffer(payload.iv);
  const dataBuf = base64ToArrayBuffer(payload.data);

  const key = await deriveKeyFromPassword(password, new Uint8Array(saltBuf));
  let plaintextBuf;
  try {
    plaintextBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuf) },
      key,
      dataBuf
    );
  } catch {
    throw new Error('Decryption failed. Wrong password or corrupt file.');
  }
  const dec = new TextDecoder();
  return dec.decode(plaintextBuf);
}
