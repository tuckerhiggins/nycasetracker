/**
 * NYC Case Tracker - Calendar Export
 * Export court dates to .ics format
 */

import { parseLocalDate, formatDate } from './utils.js';

/**
 * Format a date for iCalendar format (YYYYMMDD)
 */
function formatICalDate(date) {
  return formatDate(date).replace(/-/g, '');
}

/**
 * Format current timestamp for iCalendar
 */
function formatICalTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Escape text for iCalendar format
 */
function escapeICalText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Export court dates to .ics calendar file
 */
export function exportToCalendar(cases) {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NYC Case Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  let eventCount = 0;

  cases.forEach(c => {
    if (c.nextCourtDate) {
      const date = parseLocalDate(c.nextCourtDate);
      const dateStr = formatICalDate(date);
      const timestamp = formatICalTimestamp();

      const summary = escapeICalText(
        `Court - ${c.clientName}${c.courtPart ? ` (${c.courtPart})` : ''}`
      );

      const descriptionParts = [
        `Docket: ${c.docketNumber || 'N/A'}`,
        `Charge: ${c.chargeLevel || 'N/A'}`,
        `ADA: ${c.assignedAda || 'N/A'}`
      ];

      if (c.nextCourtAppearanceType) {
        descriptionParts.unshift(`On for: ${c.nextCourtAppearanceType}`);
      }

      const description = escapeICalText(descriptionParts.join('\\n'));
      const location = escapeICalText(c.courtPart || 'See case details');

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${c.id}@nycasetracker.com`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Court tomorrow',
        'END:VALARM',
        'END:VEVENT'
      );

      eventCount++;
    }
  });

  icsContent.push('END:VCALENDAR');

  if (eventCount === 0) {
    throw new Error('No court dates to export');
  }

  return {
    content: icsContent.join('\r\n'),
    count: eventCount
  };
}
