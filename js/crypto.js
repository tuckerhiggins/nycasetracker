const ENCRYPTION_KEY = 'nyc-case-tracker-secure-key-v2';

function encrypt(data) {
    try {
        const jsonString = JSON.stringify(data);
        const encoded = btoa(encodeURIComponent(jsonString));
        return encoded;
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}

function decrypt(encryptedData) {
    try {
        const decoded = decodeURIComponent(atob(encryptedData));
        return JSON.parse(decoded);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}
