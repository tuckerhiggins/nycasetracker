function exportToCalendar() {
    if (!currentCaseId) {
        showToast('Please save the case first', 'error');
        return;
    }
    
    const caseData = cases.find(c => c.id === currentCaseId);
    if (!caseData || !caseData.courtDate) {
        showToast('No court date set for this case', 'error');
        return;
    }
    
    const courtDate = parseDate(caseData.courtDate);
    if (!courtDate) {
        showToast('Invalid court date', 'error');
        return;
    }
    
    const startTime = new Date(courtDate);
    startTime.setHours(9, 30, 0, 0);
    
    const endTime = new Date(courtDate);
    endTime.setHours(10, 30, 0, 0);
    
    const summary = `Court: ${caseData.clientName} - ${caseData.indictment}`;
    let description = `Case: ${caseData.clientName}\\nIndictment: ${caseData.indictment}`;
    
    if (caseData.part) {
        description += `\\nPart: ${caseData.part}`;
    }
    
    if (caseData.onFor) {
        description += `\\nOn For: ${caseData.onFor}`;
    }
    
    if (caseData.charges && caseData.charges.length > 0) {
        description += `\\nTop Charge: ${caseData.charges[0]}`;
    }
    
    const deadline = calculate3030Deadline(caseData);
    if (deadline !== 'N/A' && deadline !== 'Readiness not stated') {
        description += `\\n30.30 Deadline: ${formatDate(deadline)}`;
    }
    
    const icsContent = generateICS(summary, description, startTime, endTime);
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `court-${caseData.indictment.replace(/[^a-z0-9]/gi, '-')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Calendar event exported', 'success');
}

function generateICS(summary, description, startTime, endTime) {
    const formatICSDate = (date) => {
        const pad = (n) => String(n).padStart(2, '0');
        return date.getFullYear() +
               pad(date.getMonth() + 1) +
               pad(date.getDate()) + 'T' +
               pad(date.getHours()) +
               pad(date.getMinutes()) +
               pad(date.getSeconds());
    };
    
    const now = new Date();
    const dtstamp = formatICSDate(now);
    const dtstart = formatICSDate(startTime);
    const dtend = formatICSDate(endTime);
    const uid = `${Date.now()}@nyccasetracker.com`;
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NYC Case Tracker//Court Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${summary}
DESCRIPTION:${description}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}
