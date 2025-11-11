const STORAGE_KEY = 'nycCaseTrackerCases';

function saveCases() {
    try {
        const encrypted = encrypt(cases);
        if (encrypted) {
            localStorage.setItem(STORAGE_KEY, encrypted);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error saving cases:', error);
        return false;
    }
}

function loadCases() {
    try {
        const encrypted = localStorage.getItem(STORAGE_KEY);
        if (encrypted) {
            const decrypted = decrypt(encrypted);
            if (decrypted && Array.isArray(decrypted)) {
                cases = decrypted;
                return true;
            }
        }
        cases = [];
        return false;
    } catch (error) {
        console.error('Error loading cases:', error);
        cases = [];
        return false;
    }
}

function clearAllData() {
    if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        cases = [];
        renderCases();
        showToast('All data cleared', 'success');
    }
}
