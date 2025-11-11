function calculate3030Deadline(caseData) {
    if (!caseData.arraignmentDate) {
        return 'N/A';
    }
    
    if (!caseData.readinessStated) {
        return 'Readiness not stated';
    }
    
    const arraignmentDate = parseDate(caseData.arraignmentDate);
    if (!arraignmentDate) {
        return 'N/A';
    }
    
    let startDate;
    if (caseData.readinessDate) {
        startDate = parseDate(caseData.readinessDate);
    } else {
        startDate = arraignmentDate;
    }
    
    if (!startDate) {
        return 'N/A';
    }
    
    const isFelony = checkIfFelony(caseData.charges);
    const daysToAdd = isFelony ? 182 : 90;
    
    const deadline = addDays(startDate, daysToAdd);
    
    return toISODate(deadline);
}

function checkIfFelony(charges) {
    if (!charges || charges.length === 0) {
        return true;
    }
    
    const topCharge = charges[0].toUpperCase();
    
    const misdemeanorPatterns = [
        /\bA MISD\b/,
        /\bB MISD\b/,
        /\bMISDE?MEANOR\b/,
        /\bUNCLASSIFIED MISD\b/
    ];
    
    for (const pattern of misdemeanorPatterns) {
        if (pattern.test(topCharge)) {
            return false;
        }
    }
    
    return true;
}

function get3030Status(caseData) {
    const deadline = calculate3030Deadline(caseData);
    
    if (deadline === 'N/A' || deadline === 'Readiness not stated') {
        return {
            status: 'unknown',
            daysRemaining: null,
            deadline: deadline
        };
    }
    
    const daysRemaining = calculateDaysRemaining(deadline);
    
    if (daysRemaining === null) {
        return {
            status: 'unknown',
            daysRemaining: null,
            deadline: deadline
        };
    }
    
    if (daysRemaining <= 0) {
        return {
            status: 'expired',
            daysRemaining: daysRemaining,
            deadline: deadline
        };
    } else if (daysRemaining <= 30) {
        return {
            status: 'warning',
            daysRemaining: daysRemaining,
            deadline: deadline
        };
    } else {
        return {
            status: 'ok',
            daysRemaining: daysRemaining,
            deadline: deadline
        };
    }
}
