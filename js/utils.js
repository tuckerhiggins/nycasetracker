/**
 * NYC Case Tracker - Utility Functions
 * Date helpers, validation, formatting, and general utilities
 */

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Parse a date string (YYYY-MM-DD) into a local Date object
 */
export function parseLocalDate(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format a Date object as YYYY-MM-DD
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date object with weekday name
 * Example: "Monday, 03/15/2025"
 */
export function formatDateWithWeekday(date) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dow = days[date.getDay()];
  return `${dow}, ${m}/${d}/${y}`;
}

/**
 * Format a Date object with short weekday
 * Example: "Mon"
 */
export function formatShortWeekday(date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

/**
 * Calculate days between a start date string and today
 */
export function daysBetween(startDateStr) {
  if (!startDateStr) return 0;
  const start = parseLocalDate(startDateStr);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = today - start;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate days between two dates
 */
export function daysBetweenDates(start, end) {
  const a = new Date(start.getTime());
  const b = new Date(end.getTime());
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const diffMs = b - a;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Add months to a date, keeping the same day (or last day of month if overflow)
 */
export function addMonthsSameDay(date, n) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() !== day) {
    d.setDate(0); // Go to last day of previous month
  }
  return d;
}

/**
 * Add days to a date
 */
export function addDays(date, n) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// ============================================================================
// HOLIDAY & WEEKEND UTILITIES
// ============================================================================

/**
 * Get the nth weekday of a month
 * Example: nthWeekdayOfMonth(2024, 0, 1, 3) = 3rd Monday of January 2024
 */
function nthWeekdayOfMonth(year, month, weekday, n) {
  let d = new Date(year, month, 1);
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(1 + diff + 7 * (n - 1));
  return d;
}

/**
 * Get the last weekday of a month
 */
function lastWeekdayOfMonth(year, month, weekday) {
  let d = new Date(year, month + 1, 0); // Last day of month
  const diff = (d.getDay() - weekday + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Get the name of a NY court holiday, if the date is one
 */
export function getHolidayName(date) {
  const y = date.getFullYear();

  function isDate(dt) {
    return isSameDay(date, dt);
  }

  // New Year's Day (observed if Sunday)
  const newYears = new Date(y, 0, 1);
  const newYearsObserved = newYears.getDay() === 0 ? new Date(y, 0, 2) : newYears;
  if (isDate(newYearsObserved)) return "New Year's Day";

  // Juneteenth (June 19, observed if Sunday)
  const juneteenth = new Date(y, 5, 19);
  const juneteenthObserved = juneteenth.getDay() === 0 ? new Date(y, 5, 20) : juneteenth;
  if (isDate(juneteenthObserved)) return "Juneteenth";

  // Independence Day (July 4, observed if Sunday)
  const july4 = new Date(y, 6, 4);
  const july4Observed = july4.getDay() === 0 ? new Date(y, 6, 5) : july4;
  if (isDate(july4Observed)) return "Independence Day";

  // Veterans Day (Nov 11, observed if Sunday)
  const veterans = new Date(y, 10, 11);
  const veteransObserved = veterans.getDay() === 0 ? new Date(y, 10, 12) : veterans;
  if (isDate(veteransObserved)) return "Veterans Day";

  // Christmas Day (Dec 25, observed if Sunday)
  const christmas = new Date(y, 11, 25);
  const christmasObserved = christmas.getDay() === 0 ? new Date(y, 11, 26) : christmas;
  if (isDate(christmasObserved)) return "Christmas Day";

  // MLK Day – 3rd Monday in January
  const mlk = nthWeekdayOfMonth(y, 0, 1, 3);
  if (isDate(mlk)) return "Martin Luther King Jr. Day";

  // Presidents' Day – 3rd Monday in February
  const presidents = nthWeekdayOfMonth(y, 1, 1, 3);
  if (isDate(presidents)) return "Presidents' Day";

  // Memorial Day – last Monday in May
  const memorial = lastWeekdayOfMonth(y, 4, 1);
  if (isDate(memorial)) return "Memorial Day";

  // Labor Day – 1st Monday in September
  const labor = nthWeekdayOfMonth(y, 8, 1, 1);
  if (isDate(labor)) return "Labor Day";

  // Columbus Day – 2nd Monday in October
  const columbus = nthWeekdayOfMonth(y, 9, 1, 2);
  if (isDate(columbus)) return "Columbus Day";

  // Thanksgiving – 4th Thursday in November
  const thanksgiving = nthWeekdayOfMonth(y, 10, 4, 4);
  if (isDate(thanksgiving)) return "Thanksgiving Day";

  return "";
}

/**
 * Adjust a date forward if it falls on a weekend or holiday
 */
export function adjustForWeekendOrHoliday(baseDate) {
  const d = new Date(baseDate.getTime());
  let tooltip = "";

  if (d.getDay() === 6) {
    d.setDate(d.getDate() + 2);
    tooltip = "Adjusted for deadline falling on Saturday";
  } else if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1);
    tooltip = "Adjusted for deadline falling on Sunday";
  } else {
    while (true) {
      const name = getHolidayName(d);
      if (!name) break;
      d.setDate(d.getDate() + 1);
      tooltip = `Adjusted for ${name}`;
    }
  }

  return { adjustedDate: d, tooltip };
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Sanitize a string to prevent XSS and limit length
 */
export function sanitizeString(s) {
  if (s == null) return '';
  return String(s)
    .replace(/[<>'"]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 1000);
}

/**
 * Validate a date range
 */
export function validateDateRange(startDate, endDate, fieldName = 'Date range') {
  if (!startDate || !endDate) return { valid: true };

  try {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, error: `${fieldName}: Invalid date format` };
    }

    if (end < start) {
      return { valid: false, error: `${fieldName}: End date cannot be before start date` };
    }

    const today = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(today.getFullYear() - 2);

    if (start < twoYearsAgo) {
      return {
        valid: false,
        error: `${fieldName}: Start date is more than 2 years ago. Please verify.`,
        warning: true
      };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: `${fieldName}: Invalid date` };
  }
}

/**
 * Validate excluded days don't exceed total days
 */
export function validateExcludedDays(excluded, total) {
  const ex = Number(excluded);
  const tot = Number(total);

  if (isNaN(ex) || ex < 0) {
    return { valid: false, error: 'Excluded days must be a positive number' };
  }

  if (ex > tot) {
    return {
      valid: false,
      error: `Excluded days (${ex}) cannot exceed total days (${tot})`,
      warning: true
    };
  }

  return { valid: true };
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Get CSS class for NCD coloring based on proximity
 */
export function ncdClass(nextCourtDateStr) {
  if (!nextCourtDateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ncd = parseLocalDate(nextCourtDateStr);
  ncd.setHours(0, 0, 0, 0);
  const diffMs = ncd - today;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'ncd-red';
  if (diffDays <= 7) return 'ncd-yellow';
  return 'ncd-green';
}

// ============================================================================
// DATA INTEGRITY
// ============================================================================

/**
 * Calculate a simple checksum for data integrity
 */
export function calculateChecksum(dataString) {
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// ============================================================================
// DEBOUNCE UTILITY
// ============================================================================

/**
 * Debounce a function call
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
