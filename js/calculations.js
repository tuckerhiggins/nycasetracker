/**
 * NYC Case Tracker - Calculations Module
 * CPL § 30.30 deadline calculations
 */

import {
  parseLocalDate,
  formatDate,
  formatDateWithWeekday,
  daysBetweenDates,
  addMonthsSameDay,
  addDays,
  adjustForWeekendOrHoliday
} from './utils.js';

/**
 * Compute cap days and deadline for a charge level and start date
 */
export function computeCapAndDeadline(level, startDateStr) {
  if (!startDateStr) return { capDays: 0, deadlineStr: '', tooltip: '' };

  const start = parseLocalDate(startDateStr);
  let baseDeadline, capDays;

  if (level === 'felony') {
    baseDeadline = addMonthsSameDay(start, 6);
    capDays = daysBetweenDates(start, baseDeadline);
  } else if (level === 'classA') {
    baseDeadline = addDays(start, 90);
    capDays = 90;
  } else if (level === 'classB') {
    baseDeadline = addDays(start, 60);
    capDays = 60;
  } else if (level === 'violation') {
    baseDeadline = addDays(start, 30);
    capDays = 30;
  } else {
    return { capDays: 0, deadlineStr: '', tooltip: '' };
  }

  const { adjustedDate, tooltip } = adjustForWeekendOrHoliday(baseDeadline);
  const deadlineStr = formatDate(adjustedDate);

  return { capDays, deadlineStr, tooltip };
}

/**
 * Compute a quick deadline with excluded days
 * Used for quick calculator and modal displays
 */
export function computeQuickDeadline(level, startDateStr, exDays) {
  if (!startDateStr || !level) return null;
  const start = parseLocalDate(startDateStr);
  let baseDeadline;

  if (level === 'felony') {
    baseDeadline = addMonthsSameDay(start, 6);
  } else if (level === 'classA') {
    baseDeadline = addDays(start, 90);
  } else if (level === 'classB') {
    baseDeadline = addDays(start, 60);
  } else if (level === 'violation') {
    baseDeadline = addDays(start, 30);
  } else {
    return null;
  }

  const extended = addDays(baseDeadline, exDays || 0);
  const { adjustedDate, tooltip } = adjustForWeekendOrHoliday(extended);
  return { dateStr: formatDateWithWeekday(adjustedDate), tooltip, dateObj: adjustedDate };
}

/**
 * Get days until 30.30 deadline from a specific date
 */
export function daysUntilDeadline(deadlineStr, fromDate = new Date()) {
  if (!deadlineStr) return null;

  try {
    const deadline = parseLocalDate(deadlineStr);
    deadline.setHours(0, 0, 0, 0);

    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);

    const diffMs = deadline - from;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch {
    return null;
  }
}

/**
 * Format days until deadline as human-readable text
 */
export function formatDaysUntilDeadline(days) {
  if (days === null || days === undefined) return '';

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} until 30.30 deadline`;
  } else if (days === 0) {
    return '30.30 deadline today';
  } else {
    const n = Math.abs(days);
    return `${n} day${n === 1 ? '' : 's'} past 30.30 deadline`;
  }
}
