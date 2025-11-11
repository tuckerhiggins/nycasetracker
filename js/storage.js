/**
 * NYC Case Tracker - Storage Module
 * localStorage operations with data integrity checks
 */

import { sanitizeString, calculateChecksum } from './utils.js';

const STORAGE_KEY = 'ny3030Cases';
const CHECKSUM_KEY = 'ny3030Cases_checksum';
const TIMESTAMP_KEY = 'ny3030Cases_timestamp';

/**
 * Normalize and validate a case object
 */
export function normalizeCaseObject(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id ? String(raw.id) : ('case-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const clientName = sanitizeString(raw.clientName || '');
  const docketNumber = sanitizeString(raw.docketNumber || '');
  const chargeLevel = ['felony', 'classA', 'classB', 'violation'].includes(raw.chargeLevel) ? raw.chargeLevel : '';
  const startDate = raw.startDate || '';
  const excludedDays = String(Number(raw.excludedDays || 0) || 0);
  const definitelyExcludedDays = String(Number(raw.definitelyExcludedDays || 0) || 0);
  const arguablyExcludedDays = String(Number(raw.arguablyExcludedDays || 0) || 0);

  const notes = sanitizeString(raw.notes || '');
  const nextCourtDate = raw.nextCourtDate || '';
  const courtPart = sanitizeString(raw.courtPart || '');
  const assignedAda = sanitizeString(raw.assignedAda || '');
  const warrant = !!raw.warrant;
  const closed = !!raw.closed;
  const clockStopped = !!raw.clockStopped;
  const frozenTotalDays =
    (typeof raw.frozenTotalDays === 'number' || typeof raw.frozenTotalDays === 'string')
      ? (isNaN(Number(raw.frozenTotalDays)) ? null : Number(raw.frozenTotalDays))
      : null;
  const cocFiled = !!raw.cocFiled;
  const cocDate = raw.cocDate || '';
  // Legacy single contact fields (for backward compatibility)
  const clientPhone = sanitizeString(raw.clientPhone || '');
  const clientEmail = sanitizeString(raw.clientEmail || '');
  const arraignment_date = raw.arraignment_date || '';
  
  // NEW: Appearance type field
  const nextCourtAppearanceType = sanitizeString(raw.nextCourtAppearanceType || '');
  
  // NEW: Warrant date
  const warrantDate = raw.warrantDate || '';
  
  // NEW: Enhanced contacts - multiple phones/emails with notes
  const phones = Array.isArray(raw.phones)
    ? raw.phones.map(p => ({
        number: sanitizeString(p && p.number || ''),
        note: sanitizeString(p && p.note || ''),
        id: p && p.id ? String(p.id) : ('phone-' + Date.now() + '-' + Math.random().toString(36).slice(2))
      }))
    : (clientPhone ? [{ number: clientPhone, note: '', id: 'phone-legacy' }] : []);
    
  const emails = Array.isArray(raw.emails)
    ? raw.emails.map(e => ({
        address: sanitizeString(e && e.address || ''),
        note: sanitizeString(e && e.note || ''),
        id: e && e.id ? String(e.id) : ('email-' + Date.now() + '-' + Math.random().toString(36).slice(2))
      }))
    : (clientEmail ? [{ address: clientEmail, note: '', id: 'email-legacy' }] : []);
  
  const address = sanitizeString(raw.address || '');

  const noteEntries = Array.isArray(raw.noteEntries)
    ? raw.noteEntries.map(n => ({
        date: sanitizeString(n && n.date || ''),
        text: sanitizeString(n && n.text || '')
      }))
    : [];

  const exWindows = Array.isArray(raw.exWindows)
    ? raw.exWindows.map(w => ({
        start: w && w.start ? String(w.start) : '',
        end: w && w.end ? String(w.end) : '',
        reason: sanitizeString(w && w.reason || ''),
        arguable: !!(w && w.arguable)
      }))
    : [];

  const todos = Array.isArray(raw.todos)
    ? raw.todos.map(t => ({
        description: sanitizeString(t && t.description || ''),
        deadline: t && t.deadline ? String(t.deadline) : '',
        completed: !!(t && (t.completed || t.done))
      }))
    : [];

  // NEW: Charges array
  const charges = Array.isArray(raw.charges)
    ? raw.charges.map(c => ({
        id: c && c.id ? String(c.id) : ('charge-' + Date.now() + '-' + Math.random().toString(36).slice(2)),
        name: sanitizeString(c && c.name || ''),
        statute: sanitizeString(c && c.statute || ''),
        class: ['felony', 'classA', 'classB', 'violation'].includes(c && c.class) ? c.class : '',
        isPrimaryCharge: !!(c && c.isPrimaryCharge),
        dateAdded: c && c.dateAdded ? String(c.dateAdded) : ''
      }))
    : [];

  return {
    id,
    clientName,
    docketNumber,
    chargeLevel,
    startDate,
    excludedDays,
    definitelyExcludedDays,
    arguablyExcludedDays,
    notes,
    nextCourtDate,
    nextCourtAppearanceType,
    courtPart,
    assignedAda,
    noteEntries,
    warrant,
    warrantDate,
    closed,
    clockStopped,
    frozenTotalDays,
    cocFiled,
    cocDate,
    clientPhone,
    clientEmail,
    phones,
    emails,
    address,
    arraignment_date,
    exWindows,
    todos,
    charges
  };
}

/**
 * Validate and normalize imported cases
 */
export function validateAndNormalizeImportedCases(parsed) {
  if (Array.isArray(parsed)) {
    return parsed.map(normalizeCaseObject).filter(Boolean);
  } else if (parsed && typeof parsed === 'object') {
    const normalized = normalizeCaseObject(parsed);
    return normalized ? [normalized] : [];
  }
  throw new Error('Unsupported backup format');
}

/**
 * Load cases from localStorage with integrity check
 */
export function loadCases() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const storedChecksum = localStorage.getItem(CHECKSUM_KEY);

  if (!raw) return [];

  // Verify data integrity
  const calculatedChecksum = calculateChecksum(raw);
  if (storedChecksum && calculatedChecksum !== storedChecksum) {
    console.warn('Data integrity check failed - checksum mismatch');
    // Still try to load, but warn user
  }

  try {
    const parsed = JSON.parse(raw);
    return validateAndNormalizeImportedCases(parsed);
  } catch (err) {
    console.error('Failed to parse cases:', err);
    return [];
  }
}

/**
 * Save cases to localStorage with integrity check
 */
export function saveCases(cases) {
  const dataString = JSON.stringify(cases);
  const checksum = calculateChecksum(dataString);

  localStorage.setItem(STORAGE_KEY, dataString);
  localStorage.setItem(CHECKSUM_KEY, checksum);
  localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
}

/**
 * Clear all case data from localStorage
 */
export function clearAllCases() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CHECKSUM_KEY);
  localStorage.removeItem(TIMESTAMP_KEY);
}
