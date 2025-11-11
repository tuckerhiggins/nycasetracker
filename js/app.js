/**
 * NYC Case Tracker - Main Application
 * Coordinates all modules and handles user interactions
 */

import * as Utils from './utils.js';
import * as Calculations from './calculations.js';
import * as Storage from './storage.js';
import * as UI from './ui.js';
import * as Crypto from './crypto.js';
import { exportToCalendar } from './calendar.js';

// ============================================================================
// GLOBAL STATE
// ============================================================================

let currentModalCaseId = null;
let currentViewMode = 'all'; // 'all', 'today', 'busy', 'todos'
let pendingExWindows = []; // For new case form

// Row counters for excludable windows
let exCalcRowCounter = 0;
let modalExRowCounter = 0;
let quickExRowCounter = 0;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  setupEventListeners();
  renderCases();
  resetExCalc();
  resetModalExCalc();
  resetQuickExCalc();
  checkUpcomingCourts();
  setupKeyboardShortcuts();
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      UI.focusInput('search');
    }

    // Ctrl/Cmd + N: Focus new case
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      UI.focusInput('clientName');
    }

    // Escape: Close modals
    if (e.key === 'Escape') {
      closeCaseModal();
      closeAdvExModal();
    }
  });
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================

function setupEventListeners() {
  // Main form submission
  document.getElementById('case-form').addEventListener('submit', handleCaseFormSubmit);

  // Search and filters
  document.getElementById('search').addEventListener('input', Utils.debounce(renderCases, 300));
  document.getElementById('sortMode').addEventListener('change', renderCases);
  document.getElementById('excludeMode').addEventListener('change', renderCases);
  document.getElementById('showWarrant').addEventListener('change', renderCases);
  document.getElementById('showClosed').addEventListener('change', renderCases);
  document.getElementById('showReadyOnly').addEventListener('change', renderCases);
  document.getElementById('minCasesBusy').addEventListener('change', renderCases);
  document.getElementById('minPartsBusy').addEventListener('change', renderCases);

  // View mode buttons
  document.querySelectorAll('.view-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode || 'all';
      setViewMode(mode);
    });
  });

  // Advanced filters toggle
  document.getElementById('advancedFiltersToggle').addEventListener('click', toggleAdvancedFilters);

  // Backup buttons
  document.getElementById('exportBtn').addEventListener('click', exportEncryptedBackup);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', handleImportFile);
  document.getElementById('importMergeBtn').addEventListener('click', () => {
    // Set a flag to know this is a merge operation
    window.importMergeMode = true;
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', handleImportFile);
  document.getElementById('clearCasesBtn').addEventListener('click', clearAllCases);

  // Calendar export button (NEW)
  document.getElementById('exportCalendarBtn').addEventListener('click', exportCalendarFile);

  // Email and Print Today buttons (v2.1)
  document.getElementById('emailTodayBtn').addEventListener('click', emailTodaysCases);
  document.getElementById('printTodayBtn').addEventListener('click', printTodaysCases);

  // Advanced excludable modals
  document.getElementById('advancedMainToggle').addEventListener('click', openAdvExModal);
  document.getElementById('advancedModalToggle').addEventListener('click', toggleModalAdvanced);
  document.getElementById('exCalcAddBtn').addEventListener('click', () => {
    addExCalcRow();
    recalcExCalcTotals();
  });
  document.getElementById('modalExAddBtn').addEventListener('click', () => {
    addModalExRow();
    recalcModalExTotals();
  });

  // Modal close on overlay click
  document.getElementById('caseModal').addEventListener('click', (e) => {
    if (e.target.id === 'caseModal') closeCaseModal();
  });
  document.getElementById('advExModal').addEventListener('click', (e) => {
    if (e.target.id === 'advExModal') closeAdvExModal();
  });

  // Modal include arguable checkbox
  const modalIncludeArg = document.getElementById('modalIncludeArg');
  if (modalIncludeArg) {
    modalIncludeArg.addEventListener('change', updateModal3030Date);
  }

  // Todo creation toggle
  const modalTodoCreateBtn = document.getElementById('modalTodoCreateBtn');
  if (modalTodoCreateBtn) {
    modalTodoCreateBtn.addEventListener('click', toggleTodoCreationRow);
  }

  // Charge management (NEW)
  const addChargeBtn = document.getElementById('addChargeBtn');
  if (addChargeBtn) {
    addChargeBtn.addEventListener('click', toggleChargeInputRow);
  }

  // Modal button event listeners (instead of onclick)
  document.getElementById('closeCaseModalBtn').addEventListener('click', closeCaseModal);
  document.getElementById('addTodoBtn').addEventListener('click', addTodoToCurrentCase);
  document.getElementById('saveChargeBtn').addEventListener('click', saveNewCharge);
  document.getElementById('cancelChargeBtn').addEventListener('click', cancelNewCharge);
  document.getElementById('addNoteBtn').addEventListener('click', addNoteToCurrentCase);
  document.getElementById('exportCaseBtn').addEventListener('click', exportCurrentCase);
  document.getElementById('saveChangesBtn').addEventListener('click', saveModalChanges);
  document.getElementById('deleteCaseBtn').addEventListener('click', deleteCurrentCase);
  document.getElementById('closeAdvExModalBtn').addEventListener('click', closeAdvExModal);
  document.getElementById('saveAdvExBtn').addEventListener('click', saveAdvExAndClose);

  // Quick calculator
  document.getElementById('quickExAddBtn').addEventListener('click', () => {
    addQuickExRow();
    recalcQuickExTotals();
  });
  document.getElementById('quickChargeLevel').addEventListener('change', updateQuickDeadline);
  document.getElementById('quickStartDate').addEventListener('change', updateQuickDeadline);
  
  // NEW: Enhanced contact management
  const addPhoneBtn = document.getElementById('addPhoneBtn');
  if (addPhoneBtn) addPhoneBtn.addEventListener('click', addPhoneToCurrentCase);
  
  const addEmailBtn = document.getElementById('addEmailBtn');
  if (addEmailBtn) addEmailBtn.addEventListener('click', addEmailToCurrentCase);
  
  const expandContactsBtn = document.getElementById('expandContactsBtn');
  if (expandContactsBtn) expandContactsBtn.addEventListener('click', toggleAdditionalContacts);
  
  // NEW: Quick actions in modal
  const quickEmailBtn = document.getElementById('quickEmailCase');
  if (quickEmailBtn) quickEmailBtn.addEventListener('click', quickEmailCase);
  
  const quickPrintBtn = document.getElementById('quickPrintCase');
  if (quickPrintBtn) quickPrintBtn.addEventListener('click', quickPrintCase);
  
  const quickCopyBtn = document.getElementById('quickCopyDocket');
  if (quickCopyBtn) quickCopyBtn.addEventListener('click', quickCopyDocket);
  
  // NEW: Conditional field visibility
  const modalWarrantCheck = document.getElementById('modalWarrant');
  if (modalWarrantCheck) {
    modalWarrantCheck.addEventListener('change', (e) => {
      const field = document.getElementById('warrantDateField');
      if (field) field.style.display = e.target.checked ? 'block' : 'none';
    });
  }
  
  const modalCocCheck = document.getElementById('modalCocFiled');
  if (modalCocCheck) {
    modalCocCheck.addEventListener('change', (e) => {
      const field = document.getElementById('cocDateField');
      if (field) field.style.display = e.target.checked ? 'block' : 'none';
    });
  }
}

// ============================================================================
// CASE RENDERING
// ============================================================================

function renderCases() {
  const tbody = document.getElementById('casesBody');
  const mobileContainer = document.getElementById('mobileCardsContainer');
  const allCases = Storage.loadCases();
  const filter = document.getElementById('search').value.toLowerCase();
  const sortMode = document.getElementById('sortMode').value;
  const showWarrant = document.getElementById('showWarrant').checked;
  const showClosed = document.getElementById('showClosed').checked;
  const showReadyOnly = document.getElementById('showReadyOnly').checked;
  const excludeMode = document.getElementById('excludeMode').value;
  const minCasesBusy = Math.max(1, parseInt(document.getElementById('minCasesBusy').value) || 3);
  const minPartsBusy = Math.max(1, parseInt(document.getElementById('minPartsBusy').value) || 2);

  let cases = allCases;

  // Base filters
  cases = cases.filter(c => {
    if (showReadyOnly && !c.cocFiled) return false;
    if (c.closed && !showClosed) return false;
    if (c.warrant && !showWarrant) return false;
    return true;
  });

  // Text search
  if (filter) {
    cases = cases.filter(c => {
      const combinedText = (
        (c.clientName || '') + ' ' +
        (c.docketNumber || '') + ' ' +
        (c.notes || '') + ' ' +
        (c.assignedAda || '') + ' ' +
        (c.clientPhone || '') + ' ' +
        (c.clientEmail || '') + ' ' +
        (c.nextCourtAppearanceType || '')
      ).toLowerCase();
      return combinedText.includes(filter);
    });
  }

  const casesForSummary = cases.slice();
  updateBusySummary(casesForSummary);
  updateDashboardHeader(casesForSummary);

  // View modes
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (currentViewMode === 'today') {
    cases = cases.filter(c => {
      if (!c.nextCourtDate) return false;
      try {
        const d = Utils.parseLocalDate(c.nextCourtDate);
        d.setHours(0, 0, 0, 0);
        return Utils.isSameDay(d, today);
      } catch {
        return false;
      }
    });
  } else if (currentViewMode === 'busy') {
    const stats = {};
    cases.forEach(c => {
      if (!c.nextCourtDate) return;
      const key = c.nextCourtDate;
      if (!stats[key]) stats[key] = { count: 0, parts: new Set() };
      stats[key].count++;
      if (c.courtPart) stats[key].parts.add(c.courtPart);
    });

    cases = cases.filter(c => {
      if (!c.nextCourtDate) return false;
      const s = stats[c.nextCourtDate];
      if (!s) return false;
      const partsCount = s.parts.size;
      return (s.count > minCasesBusy) || (partsCount > minPartsBusy);
    });
  } else if (currentViewMode === 'todos') {
    cases = cases.filter(c =>
      Array.isArray(c.todos) && c.todos.some(t => t && !t.completed)
    );
  }

  // Sorting
  if (currentViewMode === 'todos') {
    cases.sort(compareByTodoDeadlineThenClient);
  } else if (sortMode === 'ncd') {
    cases.sort(compareByNcd);
  } else {
    cases.sort(compareByClient);
  }

  // Render both table and mobile cards
  tbody.innerHTML = '';
  mobileContainer.innerHTML = '';

  cases.forEach(c => {
    const row = createCaseRow(c, excludeMode);
    tbody.appendChild(row);
    
    const card = createMobileCard(c, excludeMode);
    mobileContainer.appendChild(card);
  });
}

/**
 * Create a mobile card element for a case (v2.1)
 */
function createMobileCard(c, excludeMode) {
  let totalDays;
  if (c.cocFiled && c.cocDate && c.startDate) {
    const s = Utils.parseLocalDate(c.startDate);
    const d = Utils.parseLocalDate(c.cocDate);
    totalDays = Math.max(0, Utils.daysBetweenDates(s, d));
  } else if (c.clockStopped && c.frozenTotalDays != null) {
    totalDays = c.frozenTotalDays;
  } else {
    totalDays = Utils.daysBetween(c.startDate);
  }

  const defEx = Number(c.definitelyExcludedDays) || 0;
  const argEx = Number(c.arguablyExcludedDays) || 0;
  const simpleExcluded = Number(c.excludedDays) || 0;

  let excluded = simpleExcluded;
  if (defEx || argEx) {
    excluded = excludeMode === 'defOnly' ? defEx : (defEx + argEx);
  }

  const chargeable = Math.max(0, totalDays - excluded);
  const { capDays, deadlineStr } = Calculations.computeCapAndDeadline(c.chargeLevel, c.startDate);
  const ncdCls = Utils.ncdClass(c.nextCourtDate);

  const daysUntil = Calculations.daysUntilDeadline(deadlineStr);
  let deadlineClass = '';
  if (daysUntil !== null) {
    if (daysUntil <= 0) deadlineClass = 'deadline-red';
    else if (daysUntil <= 30) deadlineClass = 'deadline-yellow';
    else deadlineClass = 'deadline-green';
  }

  const card = document.createElement('div');
  card.className = 'case-card';

  let badgeClass = '';
  let badgeText = '';
  if (c.warrant) {
    badgeClass = 'warrant-bg';
    badgeText = 'WARRANT';
  } else if (c.closed) {
    badgeClass = 'closed-bg';
    badgeText = 'CLOSED';
  } else if (c.cocFiled) {
    badgeClass = 'ready-bg';
    badgeText = 'READY';
  }

  card.innerHTML = `
    <div class="case-card-header">
      <div>
        <div class="case-card-title">${Utils.sanitizeString(c.clientName)}</div>
        <div class="case-card-subtitle">${Utils.sanitizeString(c.docketNumber || 'No docket #')}</div>
      </div>
      ${badgeText ? `<span class="case-card-badge ${badgeClass}">${badgeText}</span>` : ''}
    </div>
    <div class="case-card-body">
      <div class="case-card-row">
        <span class="case-card-label">Charge Level</span>
        <span class="case-card-value">${getChargeLevelText(c.chargeLevel)}</span>
      </div>
      <div class="case-card-row">
        <span class="case-card-label">Chargeable Days</span>
        <span class="case-card-value">${chargeable} / ${capDays}</span>
      </div>
      <div class="case-card-row">
        <span class="case-card-label">30.30 Deadline</span>
        <span class="case-card-value ${deadlineClass}">${deadlineStr || 'N/A'}</span>
      </div>
      <div class="case-card-row">
        <span class="case-card-label">Next Court Date</span>
        <span class="case-card-value ${ncdCls}">${c.nextCourtDate ? Utils.formatDate(Utils.parseLocalDate(c.nextCourtDate)) : 'None'}</span>
      </div>
      ${c.courtPart ? `
      <div class="case-card-row">
        <span class="case-card-label">Part</span>
        <span class="case-card-value">${Utils.sanitizeString(c.courtPart)}</span>
      </div>
      ` : ''}
    </div>
    <div class="case-card-actions">
      <button class="secondary case-view-btn">View Details</button>
    </div>
  `;
  
  // Add event listener for the View Details button
  const viewBtn = card.querySelector('.case-view-btn');
  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      openCaseModal(c.id);
    });
  }

  return card;
}

function getChargeLevelText(level) {
  const map = {
    'felony': 'Felony',
    'classA': 'Class A Misd',
    'classB': 'Class B Misd',
    'violation': 'Violation'
  };
  return map[level] || 'Unknown';
}

function createCaseRow(c, excludeMode) {
  let totalDays;
  if (c.cocFiled && c.cocDate && c.startDate) {
    const s = Utils.parseLocalDate(c.startDate);
    const d = Utils.parseLocalDate(c.cocDate);
    totalDays = Math.max(0, Utils.daysBetweenDates(s, d));
  } else if (c.clockStopped && c.frozenTotalDays != null) {
    totalDays = c.frozenTotalDays;
  } else {
    totalDays = Utils.daysBetween(c.startDate);
  }

  const defEx = Number(c.definitelyExcludedDays) || 0;
  const argEx = Number(c.arguablyExcludedDays) || 0;
  const simpleExcluded = Number(c.excludedDays) || 0;

  let excluded = simpleExcluded;
  let excludedDetail = `${simpleExcluded} (simple total)`;

  if (defEx || argEx) {
    if (excludeMode === 'defOnly') {
      excluded = defEx;
      excludedDetail = `${defEx} definitely excludable; ${argEx} arguably excludable (not counted)`;
    } else {
      excluded = defEx + argEx;
      excludedDetail = `${defEx} definitely + ${argEx} arguably excludable (both counted)`;
    }
  }

  const chargeable = Math.max(0, totalDays - excluded);
  const { capDays, deadlineStr, tooltip } = Calculations.computeCapAndDeadline(c.chargeLevel, c.startDate);
  const ncdCls = Utils.ncdClass(c.nextCourtDate);

  // Calculate days until deadline
  const daysUntil = Calculations.daysUntilDeadline(deadlineStr);
  const totalDeadlineText = Calculations.formatDaysUntilDeadline(daysUntil);

  let ncdDeadlineText = '';
  if (!c.cocFiled && deadlineStr && c.nextCourtDate) {
    try {
      const deadlineDate = Utils.parseLocalDate(deadlineStr);
      const ncdDate = Utils.parseLocalDate(c.nextCourtDate);
      const daysFromNcd = Calculations.daysUntilDeadline(deadlineStr, ncdDate);
      ncdDeadlineText = Calculations.formatDaysUntilDeadline(daysFromNcd).replace('until', 'until from court date').replace('past', 'past as of court date');
    } catch {}
  }

  const tr = document.createElement('tr');
  if (c.warrant) tr.classList.add('row-warrant');
  if (c.closed) tr.classList.add('row-closed');
  if (c.cocFiled) tr.classList.add('row-ready');

  const todos = Array.isArray(c.todos) ? c.todos : [];
  const outstandingTodos = todos.filter(t => t && !t.completed);
  let nextTodo = null;
  let nextDeadlineDate = null;

  if (outstandingTodos.length > 0) {
    outstandingTodos.forEach(t => {
      if (t.deadline) {
        try {
          const d = Utils.parseLocalDate(t.deadline);
          if (!nextDeadlineDate || d < nextDeadlineDate) {
            nextDeadlineDate = d;
            nextTodo = t;
          }
        } catch {
          if (!nextTodo) nextTodo = t;
        }
      } else if (!nextTodo && !nextDeadlineDate) {
        nextTodo = t;
      }
    });
    tr.classList.add('row-todo-highlight');
  }

  // Client cell (NEW: docket under client name)
  const tdClient = document.createElement('td');
  const nameDiv = document.createElement('div');
  nameDiv.style.fontWeight = '600';
  nameDiv.style.fontSize = '0.9rem';
  nameDiv.textContent = c.clientName || '';
  tdClient.appendChild(nameDiv);

  if (c.docketNumber) {
    const docketDiv = document.createElement('div');
    docketDiv.className = 'small-text';
    docketDiv.textContent = c.docketNumber;
    tdClient.appendChild(docketDiv);
  }

  if (c.warrant) {
    tdClient.appendChild(document.createTextNode(' '));
    tdClient.appendChild(UI.createBadge('Warrant', 'badge-warrant'));
  }
  if (c.closed) {
    tdClient.appendChild(document.createTextNode(' '));
    tdClient.appendChild(UI.createBadge('Closed', 'badge-closed'));
  }
  if (c.clockStopped) {
    const b = UI.createBadge('Clock stopped', '');
    b.style.background = '#e0f2fe';
    b.style.color = '#1d4ed8';
    tdClient.appendChild(document.createTextNode(' '));
    tdClient.appendChild(b);
  }
  if (c.cocFiled) {
    const b = UI.createBadge('READY (COC filed)', '');
    b.style.background = '#dbeafe';
    b.style.color = '#1d4ed8';
    tdClient.appendChild(document.createTextNode(' '));
    tdClient.appendChild(b);
  }
  if (outstandingTodos.length > 0) {
    tdClient.appendChild(document.createTextNode(' '));
    tdClient.appendChild(UI.createBadge('To-do!', 'badge-todo'));
  }

  if (nextTodo) {
    let label;
    if (nextDeadlineDate) {
      label = Utils.formatDateWithWeekday(nextDeadlineDate);
    } else if (nextTodo.deadline) {
      label = nextTodo.deadline;
    } else {
      label = 'No deadline set';
    }
    const desc = nextTodo.description || '';
    const todoDiv = document.createElement('div');
    todoDiv.className = 'small-text';
    todoDiv.textContent = 'Next to-do: ' + label + (desc ? ' – ' + desc : '');
    tdClient.appendChild(todoDiv);
  }

  // Charge
  const tdCharge = document.createElement('td');
  const tagEl = UI.chargeTagElement(c.chargeLevel);
  if (tagEl) tdCharge.appendChild(tagEl);

  // Start
  const tdStart = document.createElement('td');
  tdStart.textContent = c.startDate || '';

  // Total days
  const tdTotal = document.createElement('td');
  tdTotal.textContent = String(totalDays);
  if (totalDeadlineText) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'small-text';
    infoDiv.textContent = totalDeadlineText;
    tdTotal.appendChild(infoDiv);
  }

  // Excluded
  const tdExcluded = document.createElement('td');
  tdExcluded.textContent = String(excluded);
  tdExcluded.title = excludedDetail;

  // Chargeable
  const tdChargeable = document.createElement('td');
  tdChargeable.textContent = String(chargeable);

  // Cap
  const tdCap = document.createElement('td');
  tdCap.textContent = capDays ? String(capDays) : '';

  // Deadline
  const tdDeadline = document.createElement('td');
  tdDeadline.textContent = deadlineStr || '';
  tdDeadline.title = tooltip || '';

  // NCD (NEW: with appearance type)
  const tdNcd = document.createElement('td');
  if (ncdCls) tdNcd.classList.add(ncdCls);
  tdNcd.textContent = c.nextCourtDate || '';
  if (c.nextCourtAppearanceType) {
    const typeDiv = document.createElement('div');
    typeDiv.className = 'small-text';
    typeDiv.style.fontWeight = '600';
    typeDiv.style.color = '#0369a1';
    typeDiv.textContent = c.nextCourtAppearanceType;
    tdNcd.appendChild(typeDiv);
  }
  if (ncdDeadlineText) {
    const remDiv = document.createElement('div');
    remDiv.className = 'small-text';
    remDiv.textContent = ncdDeadlineText;
    tdNcd.appendChild(remDiv);
  }

  // Part
  const tdPart = document.createElement('td');
  tdPart.textContent = c.courtPart || '';

  tr.appendChild(tdClient);
  tr.appendChild(tdCharge);
  tr.appendChild(tdStart);
  tr.appendChild(tdTotal);
  tr.appendChild(tdExcluded);
  tr.appendChild(tdChargeable);
  tr.appendChild(tdCap);
  tr.appendChild(tdDeadline);
  tr.appendChild(tdNcd);
  tr.appendChild(tdPart);

  tr.addEventListener('click', () => {
    openCaseModal(c.id);
  });

  return tr;
}

// ============================================================================
// SORTING FUNCTIONS
// ============================================================================

function compareByClient(a, b) {
  return (a.clientName || '').localeCompare(b.clientName || '', undefined, { sensitivity: 'base' });
}

function compareByNcd(a, b) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function score(c) {
    if (!c.nextCourtDate) return Number.POSITIVE_INFINITY;
    const d = Utils.parseLocalDate(c.nextCourtDate);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((d - today) / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  const sa = score(a);
  const sb = score(b);
  return sa - sb;
}

function getSoonestOutstandingTodoDeadline(c) {
  if (!c.todos || !Array.isArray(c.todos)) return null;
  let best = null;
  c.todos.forEach(t => {
    if (t && !t.completed && t.deadline) {
      try {
        const d = Utils.parseLocalDate(t.deadline);
        if (!best || d < best) best = d;
      } catch {}
    }
  });
  return best;
}

function compareByTodoDeadlineThenClient(a, b) {
  const da = getSoonestOutstandingTodoDeadline(a);
  const db = getSoonestOutstandingTodoDeadline(b);
  if (!da && !db) return compareByClient(a, b);
  if (!da) return 1;
  if (!db) return -1;
  if (da < db) return -1;
  if (da > db) return 1;
  return compareByClient(a, b);
}


// ============================================================================
// DASHBOARD & SUMMARIES
// ============================================================================

function updateDashboardHeader(casesForSummary) {
  const todayCard = document.getElementById('todayCard');
  const todayNcdLabel = document.getElementById('todayNcdCount');
  const todayDetails = document.getElementById('todayDetails');
  const weekSummary = document.getElementById('weekSummary');
  if (!todayCard || !todayNcdLabel || !todayDetails || !weekSummary) return;

  const minCases = Math.max(1, parseInt(document.getElementById('minCasesBusy')?.value, 10) || 3);
  const minParts = Math.max(1, parseInt(document.getElementById('minPartsBusy')?.value, 10) || 2);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Today metrics
  const todayCases = [];
  const todayPartsSet = new Set();
  let todayTodosDue = 0;

  (casesForSummary || []).forEach(c => {
    if (c.nextCourtDate) {
      const d = Utils.parseLocalDate(c.nextCourtDate);
      d.setHours(0, 0, 0, 0);
      if (Utils.isSameDay(d, today)) {
        todayCases.push(c);
        if (c.courtPart) todayPartsSet.add(c.courtPart);
      }
    }

    if (Array.isArray(c.todos)) {
      c.todos.forEach(t => {
        if (!t || t.completed || !t.deadline) return;
        try {
          const td = Utils.parseLocalDate(t.deadline);
          td.setHours(0, 0, 0, 0);
          if (Utils.isSameDay(td, today)) {
            todayTodosDue++;
          }
        } catch {}
      });
    }
  });

  const todayNcdCount = todayCases.length;
  const todayPartsCount = todayPartsSet.size;
  const todayIsBusy = (todayNcdCount > minCases) || (todayPartsCount > minParts);

  todayCard.classList.toggle('busy', todayIsBusy);
  const todayCdWord = todayNcdCount === 1 ? 'court date' : 'court dates';
  todayNcdLabel.textContent = `${todayNcdCount} ${todayCdWord}`;

  if (todayNcdCount === 0 && todayTodosDue === 0) {
    todayDetails.textContent = 'No court dates or to-dos due today.';
  } else {
    const partsText = `${todayPartsCount} part${todayPartsCount === 1 ? '' : 's'}`;
    const todosText = `${todayTodosDue} to-do${todayTodosDue === 1 ? '' : 's'} due`;
    const busyText = todayIsBusy ? ' • Busy day' : '';
    todayDetails.textContent = `${partsText} • ${todosText}${busyText}`;
  }

  // Week metrics (next 7 days)
  const weekStart = new Date(today.getTime());
  const weekEnd = Utils.addDays(today, 6);
  weekEnd.setHours(23, 59, 59, 999);

  let weekNcdCount = 0;
  const weekPartsSet = new Set();
  let weekTodosDue = 0;
  const dayStats = {};

  (casesForSummary || []).forEach(c => {
    if (c.nextCourtDate) {
      try {
        const d = Utils.parseLocalDate(c.nextCourtDate);
        d.setHours(0, 0, 0, 0);
        if (d >= weekStart && d <= weekEnd) {
          const key = Utils.formatDate(d);
          weekNcdCount++;
          if (c.courtPart) {
            weekPartsSet.add(c.courtPart);
          }
          if (!dayStats[key]) {
            dayStats[key] = { count: 0, parts: new Set() };
          }
          dayStats[key].count++;
          if (c.courtPart) dayStats[key].parts.add(c.courtPart);
        }
      } catch {}
    }

    if (Array.isArray(c.todos)) {
      c.todos.forEach(t => {
        if (!t || t.completed || !t.deadline) return;
        try {
          const td = Utils.parseLocalDate(t.deadline);
          td.setHours(0, 0, 0, 0);
          if (td >= weekStart && td <= weekEnd) {
            weekTodosDue++;
          }
        } catch {}
      });
    }
  });

  let busiestSnippet = '';
  const keys = Object.keys(dayStats);
  if (keys.length > 0) {
    keys.sort((a, b) => Utils.parseLocalDate(a) - Utils.parseLocalDate(b));
    let bestKey = keys[0];
    keys.forEach(k => {
      if (dayStats[k].count > dayStats[bestKey].count) {
        bestKey = k;
      }
    });
    const d = Utils.parseLocalDate(bestKey);
    const short = Utils.formatShortWeekday(d);
    const info = dayStats[bestKey];
    const partsCount = info.parts.size;
    busiestSnippet = ` • Busiest: ${short} (${info.count} case${info.count === 1 ? '' : 's'} in ${partsCount} part${partsCount === 1 ? '' : 's'})`;
  }

  if (weekNcdCount === 0 && weekTodosDue === 0) {
    weekSummary.textContent = 'This week: no court dates or to-dos scheduled.';
  } else {
    const partsCount = weekPartsSet.size;
    const weekCdWord = weekNcdCount === 1 ? 'court date' : 'court dates';
    weekSummary.textContent =
      `This week: ${weekNcdCount} ${weekCdWord} • ` +
      `${partsCount} part${partsCount === 1 ? '' : 's'} • ` +
      `${weekTodosDue} case${weekTodosDue === 1 ? '' : 's'} with to-dos due` +
      busiestSnippet;
  }
}

function updateBusySummary(casesForSummary) {
  const el = document.getElementById('busySummary');
  if (!el) return;

  if (!casesForSummary || casesForSummary.length === 0) {
    el.textContent = 'No cases stored yet.';
    return;
  }

  const minCasesInput = document.getElementById('minCasesBusy');
  const minPartsInput = document.getElementById('minPartsBusy');
  const minCases = Math.max(1, parseInt(minCasesInput?.value, 10) || 3);
  const minParts = Math.max(1, parseInt(minPartsInput?.value, 10) || 2);

  const stats = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  casesForSummary.forEach(c => {
    if (!c.nextCourtDate) return;
    const d = Utils.parseLocalDate(c.nextCourtDate);
    d.setHours(0, 0, 0, 0);
    if (d < today) return;
    const key = c.nextCourtDate;
    if (!stats[key]) stats[key] = { count: 0, parts: new Set() };
    stats[key].count++;
    if (c.courtPart) stats[key].parts.add(c.courtPart);
  });

  const entries = Object.keys(stats).map(dateStr => {
    const info = stats[dateStr];
    const isBusy = (info.count > minCases) || (info.parts.size > minParts);
    return { dateStr, count: info.count, parts: info.parts, isBusy };
  }).filter(e => e.isBusy);

  if (entries.length === 0) {
    el.textContent = `No upcoming busy days (defined as more than ${minCases} cases or more than ${minParts} parts on the same day).`;
    return;
  }

  entries.sort((a, b) => Utils.parseLocalDate(a.dateStr) - Utils.parseLocalDate(b.dateStr));

  const maxShown = 5;
  const snippets = entries.slice(0, maxShown).map(e => {
    const d = Utils.parseLocalDate(e.dateStr);
    const label = Utils.formatDateWithWeekday(d);
    const partsCount = e.parts.size;
    return `${label}: ${e.count} case${e.count === 1 ? '' : 's'} in ${partsCount || 0} part${partsCount === 1 ? '' : 's'}`;
  });

  let tail = '';
  if (entries.length > maxShown) {
    const remaining = entries.length - maxShown;
    tail = `, plus ${remaining} more busy day${remaining === 1 ? '' : 's'}`;
  }

  el.textContent = 'Upcoming busy days: ' + snippets.join('; ') + tail +
    `. (Busy = >${minCases} cases or >${minParts} parts.)`;
}

function checkUpcomingCourts() {
  const cases = Storage.loadCases();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowCases = cases.filter(c => {
    if (!c.nextCourtDate) return false;
    const d = Utils.parseLocalDate(c.nextCourtDate);
    d.setHours(0, 0, 0, 0);
    return Utils.isSameDay(d, tomorrow);
  });

  if (tomorrowCases.length > 0) {
    const names = tomorrowCases.map(c => c.clientName).join(', ');
    UI.showToast(`⚠️ ${tomorrowCases.length} case(s) tomorrow: ${names}`, 'warning', 5000);
  }
}

// ============================================================================
// VIEW MODE
// ============================================================================

function setViewMode(mode) {
  currentViewMode = mode;
  const buttons = document.querySelectorAll('.view-mode');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  renderCases();
}

function toggleAdvancedFilters() {
  const box = document.getElementById('advancedFilters');
  if (!box) return;
  const isHidden = box.style.display === 'none' || box.style.display === '';
  box.style.display = isHidden ? 'flex' : 'none';
  document.getElementById('advancedFiltersToggle').textContent =
    isHidden ? 'Hide advanced filters' : 'Advanced filters…';
}


// ============================================================================
// CASE FORM HANDLING
// ============================================================================

function handleCaseFormSubmit(e) {
  e.preventDefault();
  const clientName = document.getElementById('clientName').value.trim();
  const docketNumber = document.getElementById('docketNumber').value.trim();
  const chargeLevel = document.getElementById('chargeLevel').value;
  const startDate = document.getElementById('startDate').value;
  const ncd = document.getElementById('ncd').value;
  const part = document.getElementById('part').value.trim();
  const appearanceType = document.getElementById('appearanceType')?.value.trim() || '';
  const excludedDays = document.getElementById('excludedDays').value || "0";
  const definitelyExcludedDays = document.getElementById('definitelyExcludedDays').value || "0";
  const arguablyExcludedDays = document.getElementById('arguablyExcludedDays').value || "0";
  const clockStopped = document.getElementById('clockStopped').checked;
  const editingId = document.getElementById('editingId').value;

  if (!clientName || !chargeLevel || !startDate) {
    UI.showToast('Client name, charge level, and start date are required.', 'error');
    return;
  }

  const cases = Storage.loadCases();

  if (editingId) {
    const idx = cases.findIndex(c => c.id === editingId);
    if (idx !== -1) {
      const existing = cases[idx];
      const updated = {
        ...existing,
        clientName: Utils.sanitizeString(clientName),
        docketNumber: Utils.sanitizeString(docketNumber),
        chargeLevel,
        startDate,
        excludedDays,
        definitelyExcludedDays,
        arguablyExcludedDays,
        nextCourtDate: ncd,
        nextCourtAppearanceType: Utils.sanitizeString(appearanceType),
        courtPart: Utils.sanitizeString(part)
      };

      if (clockStopped && !existing.clockStopped) {
        updated.clockStopped = true;
        updated.frozenTotalDays = Utils.daysBetween(startDate);
      } else if (!clockStopped && existing.clockStopped) {
        updated.clockStopped = false;
        updated.frozenTotalDays = null;
      } else {
        updated.clockStopped = existing.clockStopped;
        updated.frozenTotalDays = existing.frozenTotalDays ?? null;
      }

      cases[idx] = updated;
      UI.showToast('Case updated successfully', 'success');
    }
  } else {
    const newCase = {
      id: 'case-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      clientName: Utils.sanitizeString(clientName),
      docketNumber: Utils.sanitizeString(docketNumber),
      chargeLevel,
      startDate,
      excludedDays,
      definitelyExcludedDays,
      arguablyExcludedDays,
      notes: '',
      nextCourtDate: ncd,
      nextCourtAppearanceType: Utils.sanitizeString(appearanceType),
      courtPart: Utils.sanitizeString(part),
      assignedAda: '',
      noteEntries: [],
      warrant: false,
      warrantDate: '',
      closed: false,
      clockStopped,
      frozenTotalDays: clockStopped ? Utils.daysBetween(startDate) : null,
      cocFiled: false,
      cocDate: '',
      clientPhone: '',
      clientEmail: '',
      phones: [],
      emails: [],
      address: '',
      arraignment_date: '',
      exWindows: pendingExWindows ? [...pendingExWindows] : [],
      todos: [],
      charges: []
    };
    cases.push(newCase);
    UI.showToast('Case added successfully', 'success');
  }

  Storage.saveCases(cases);

  pendingExWindows = [];
  document.getElementById('editingId').value = '';
  document.getElementById('case-form').reset();
  document.getElementById('excludedDays').value = "0";
  document.getElementById('definitelyExcludedDays').value = "0";
  document.getElementById('arguablyExcludedDays').value = "0";

  renderCases();
}


// ============================================================================
// CASE MODAL FUNCTIONS
// ============================================================================

function openCaseModal(id) {
  const cases = Storage.loadCases();
  const c = cases.find(c => c.id === id);
  if (!c) return;
  currentModalCaseId = id;

  // Populate basic fields
  document.getElementById('modalClientName').value = c.clientName || '';
  document.getElementById('modalDocketNumber').value = c.docketNumber || '';
  document.getElementById('modalClientPhone').value = c.clientPhone || '';
  document.getElementById('modalClientEmail').value = c.clientEmail || '';
  document.getElementById('modalChargeLevel').value = c.chargeLevel || '';
  document.getElementById('modalStartDate').value = c.startDate || '';
  document.getElementById('modalExcludedDays').value = c.excludedDays || "0";
  document.getElementById('modalDefExcluded').value = c.definitelyExcludedDays || "0";
  document.getElementById('modalArgExcluded').value = c.arguablyExcludedDays || "0";
  document.getElementById('modalNcd').value = c.nextCourtDate || '';
  document.getElementById('modalAppearanceType').value = c.nextCourtAppearanceType || '';
  document.getElementById('modalArraignmentDate').value = c.arraignment_date || '';
  document.getElementById('modalPart').value = c.courtPart || '';
  document.getElementById('modalAda').value = c.assignedAda || '';
  document.getElementById('modalClockStopped').checked = !!c.clockStopped;
  document.getElementById('modalWarrant').checked = !!c.warrant;
  document.getElementById('modalClosed').checked = !!c.closed;
  document.getElementById('modalCocFiled').checked = !!c.cocFiled;
  document.getElementById('modalCocDate').value = c.cocDate || '';
  document.getElementById('modalIncludeArg').checked = true;
  
  // NEW: Enhanced contact fields
  const addressField = document.getElementById('modalAddress');
  if (addressField) addressField.value = c.address || '';
  
  const warrantDateField = document.getElementById('modalWarrantDate');
  if (warrantDateField) {
    warrantDateField.value = c.warrantDate || '';
    document.getElementById('warrantDateField').style.display = c.warrant ? 'block' : 'none';
  }
  
  document.getElementById('cocDateField').style.display = c.cocFiled ? 'block' : 'none';
  
  // Render enhanced contacts
  renderModalPhones(c.phones || []);
  renderModalEmails(c.emails || []);
  updateAdditionalContactCount();

  // Clear note/todo inputs
  document.getElementById('modalNoteDate').value = '';
  document.getElementById('modalNoteText').value = '';

  const todoCreateRow = document.getElementById('modalTodoCreateRow');
  if (todoCreateRow) todoCreateRow.style.display = 'none';
  const todoDescInput = document.getElementById('modalTodoDescription');
  const todoDeadlineInput = document.getElementById('modalTodoDeadline');
  if (todoDescInput) todoDescInput.value = '';
  if (todoDeadlineInput) todoDeadlineInput.value = '';

  // Update modal title and hero
  document.getElementById('modalTitle').textContent = c.clientName || 'Case Details';
  updateModalHero(c);

  // Render lists
  renderModalNotes(c.noteEntries || []);
  renderModalTodos(c.todos || []);
  renderChargesList(c.charges || []);

  // Show/hide advanced section
  const advModal = document.getElementById('advancedModalContainer');
  if ((Number(c.definitelyExcludedDays) || 0) > 0 ||
      (Number(c.arguablyExcludedDays) || 0) > 0 ||
      (c.exWindows && c.exWindows.length > 0)) {
    advModal.style.display = 'flex';
  } else {
    advModal.style.display = 'none';
  }

  loadModalExCalc(c.exWindows || []);

  UI.openModal('caseModal');
}

function updateModalHero(c) {
  // Update hero section with key info
  const hero3030 = document.getElementById('modalHero3030');
  const heroNCD = document.getElementById('modalHeroNCD');
  const heroAppearance = document.getElementById('modalHeroAppearance');

  if (!hero3030 || !heroNCD || !heroAppearance) return;

  // Calculate 30.30 info
  const defEx = Number(c.definitelyExcludedDays) || 0;
  const argEx = Number(c.arguablyExcludedDays) || 0;
  const totalEx = defEx + argEx;
  const res = Calculations.computeQuickDeadline(c.chargeLevel, c.startDate, totalEx);
  
  if (res) {
    const daysUntil = Calculations.daysUntilDeadline(Utils.formatDate(res.dateObj));
    const daysText = daysUntil !== null ? ` (${Math.abs(daysUntil)} days ${daysUntil >= 0 ? 'away' : 'past'})` : '';
    hero3030.textContent = res.dateStr + daysText;
    
    // Add chargeable info
    let totalDays;
    if (c.clockStopped && c.frozenTotalDays != null) {
      totalDays = c.frozenTotalDays;
    } else {
      totalDays = Utils.daysBetween(c.startDate);
    }
    const chargeable = Math.max(0, totalDays - totalEx);
    const { capDays } = Calculations.computeCapAndDeadline(c.chargeLevel, c.startDate);
    
    const subtext = document.querySelector('#modalHero3030').nextElementSibling;
    if (subtext) {
      subtext.textContent = `${chargeable} chargeable of ${capDays} cap days`;
    }
  } else {
    hero3030.textContent = 'Not calculated';
  }

  // Update NCD info
  if (c.nextCourtDate) {
    const ncdDate = Utils.parseLocalDate(c.nextCourtDate);
    heroNCD.textContent = Utils.formatDateWithWeekday(ncdDate);
  } else {
    heroNCD.textContent = 'No court date set';
  }

  if (c.nextCourtAppearanceType) {
    heroAppearance.textContent = 'On for: ' + c.nextCourtAppearanceType;
  } else {
    heroAppearance.textContent = 'Appearance type not specified';
  }
}

function closeCaseModal() {
  currentModalCaseId = null;
  UI.closeModal('caseModal');
}

function saveModalChanges() {
  if (!currentModalCaseId) return;
  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;

  const cocFiledCheckbox = document.getElementById('modalCocFiled');
  const cocDateInput = document.getElementById('modalCocDate');
  const cocFiledChecked = cocFiledCheckbox.checked;
  const cocDateVal = cocDateInput.value;

  if (cocFiledChecked && !cocDateVal) {
    UI.showToast('Please enter a COC date before marking the case as READY (COC filed).', 'error');
    return;
  }

  const c = cases[idx];

  c.clientName = Utils.sanitizeString(document.getElementById('modalClientName').value.trim());
  c.docketNumber = Utils.sanitizeString(document.getElementById('modalDocketNumber').value.trim());
  c.clientPhone = Utils.sanitizeString(document.getElementById('modalClientPhone').value.trim());
  c.clientEmail = Utils.sanitizeString(document.getElementById('modalClientEmail').value.trim());
  c.chargeLevel = document.getElementById('modalChargeLevel').value;
  c.startDate = document.getElementById('modalStartDate').value;
  c.arraignment_date = document.getElementById('modalArraignmentDate').value;
  c.excludedDays = document.getElementById('modalExcludedDays').value || "0";
  c.definitelyExcludedDays = document.getElementById('modalDefExcluded').value || "0";
  c.arguablyExcludedDays = document.getElementById('modalArgExcluded').value || "0";
  c.nextCourtDate = document.getElementById('modalNcd').value;
  c.nextCourtAppearanceType = Utils.sanitizeString(document.getElementById('modalAppearanceType').value.trim());
  c.courtPart = Utils.sanitizeString(document.getElementById('modalPart').value.trim());
  c.assignedAda = Utils.sanitizeString(document.getElementById('modalAda').value.trim());
  
  // NEW: Save enhanced contact fields
  const addressField = document.getElementById('modalAddress');
  if (addressField) {
    c.address = Utils.sanitizeString(addressField.value.trim());
  }
  
  const warrantDateField = document.getElementById('modalWarrantDate');
  if (warrantDateField) {
    c.warrantDate = warrantDateField.value;
  }
  
  // phones and emails are already saved via their add/delete functions

  c.exWindows = collectModalExWindows();

  const newClockStopped = document.getElementById('modalClockStopped').checked;
  const wasStopped = c.clockStopped;

  if (!wasStopped && newClockStopped) {
    c.frozenTotalDays = Utils.daysBetween(c.startDate);
  } else if (wasStopped && !newClockStopped) {
    c.frozenTotalDays = null;
  }

  c.clockStopped = newClockStopped;
  c.warrant = document.getElementById('modalWarrant').checked;
  c.closed = document.getElementById('modalClosed').checked;
  c.cocFiled = cocFiledChecked;
  c.cocDate = cocDateVal;

  Storage.saveCases(cases);
  UI.showToast('Case updated successfully', 'success');
  renderCases();
  closeCaseModal();
}

function deleteCurrentCase() {
  if (!currentModalCaseId) return;
  if (!UI.confirmAction('Delete this case from your tracker? This cannot be undone.')) return;

  const cases = Storage.loadCases().filter(c => c.id !== currentModalCaseId);
  Storage.saveCases(cases);
  UI.showToast('Case deleted', 'success');
  renderCases();
  closeCaseModal();
}

async function exportCurrentCase() {
  if (!currentModalCaseId) {
    UI.showToast('Open a case first to export it.', 'error');
    return;
  }

  const password = prompt('Enter a password to encrypt this case export:');
  if (!password) {
    UI.showToast('Export cancelled (no password entered).', 'info');
    return;
  }

  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) {
    UI.showToast('Could not find this case in storage.', 'error');
    return;
  }

  const existing = cases[idx];

  const exported = {
    ...existing,
    clientName: Utils.sanitizeString(document.getElementById('modalClientName').value.trim()),
    docketNumber: Utils.sanitizeString(document.getElementById('modalDocketNumber').value.trim()),
    clientPhone: Utils.sanitizeString(document.getElementById('modalClientPhone').value.trim()),
    clientEmail: Utils.sanitizeString(document.getElementById('modalClientEmail').value.trim()),
    chargeLevel: document.getElementById('modalChargeLevel').value,
    startDate: document.getElementById('modalStartDate').value,
    arraignment_date: document.getElementById('modalArraignmentDate').value,
    excludedDays: document.getElementById('modalExcludedDays').value || "0",
    definitelyExcludedDays: document.getElementById('modalDefExcluded').value || "0",
    arguablyExcludedDays: document.getElementById('modalArgExcluded').value || "0",
    nextCourtDate: document.getElementById('modalNcd').value,
    nextCourtAppearanceType: Utils.sanitizeString(document.getElementById('modalAppearanceType').value.trim()),
    courtPart: Utils.sanitizeString(document.getElementById('modalPart').value.trim()),
    assignedAda: Utils.sanitizeString(document.getElementById('modalAda').value.trim()),
    cocFiled: document.getElementById('modalCocFiled').checked,
    cocDate: document.getElementById('modalCocDate').value,
    warrant: document.getElementById('modalWarrant').checked,
    closed: document.getElementById('modalClosed').checked,
    clockStopped: document.getElementById('modalClockStopped').checked,
    exWindows: collectModalExWindows()
  };

  if (exported.cocFiled && !exported.cocDate) {
    UI.showToast('Please enter a COC date before marking the case as READY (COC filed).', 'error');
    return;
  }

  let frozen = existing.frozenTotalDays ?? null;
  const newClockStopped = exported.clockStopped;
  const wasStopped = existing.clockStopped;
  if (!wasStopped && newClockStopped) {
    frozen = Utils.daysBetween(exported.startDate);
  } else if (wasStopped && !newClockStopped) {
    frozen = null;
  }
  exported.frozenTotalDays = frozen;

  try {
    const plaintext = JSON.stringify(exported);
    const ciphertextPayload = await Crypto.encryptStringWithPassword(plaintext, password);

    const safeName = (exported.clientName || 'case').replace(/[^a-z0-9\-_]/gi, '_').slice(0, 80);
    UI.downloadFile(ciphertextPayload, `nycasetracker-case-${safeName}.txt`, 'text/plain');

    UI.showToast('Encrypted single-case export created.', 'success');
  } catch (err) {
    console.error(err);
    UI.showToast('Error exporting case: ' + err.message, 'error');
  }
}

// ============================================================================
// NOTES MANAGEMENT
// ============================================================================

function renderModalNotes(notes) {
  const list = document.getElementById('modalNotesList');
  list.innerHTML = '';
  if (!notes || notes.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No notes yet.';
    list.appendChild(li);
    return;
  }
  notes.forEach((n, idx) => {
    const li = document.createElement('li');
    const dateSpan = document.createElement('span');
    dateSpan.className = 'note-date';
    dateSpan.textContent = n.date || '';
    li.appendChild(dateSpan);
    li.appendChild(document.createTextNode(': ' + (n.text || '')));

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'danger small-link';
    btn.style.marginLeft = '0.5rem';
    btn.textContent = 'Delete';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNoteFromCurrentCase(idx);
    });

    li.appendChild(btn);
    list.appendChild(li);
  });
}

function deleteNoteFromCurrentCase(noteIndex) {
  if (!currentModalCaseId && currentModalCaseId !== 0) return;
  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;

  const caseObj = cases[idx];
  if (!Array.isArray(caseObj.noteEntries)) {
    caseObj.noteEntries = [];
  }
  if (noteIndex < 0 || noteIndex >= caseObj.noteEntries.length) return;

  if (!UI.confirmAction('Delete this note?')) return;

  caseObj.noteEntries.splice(noteIndex, 1);
  Storage.saveCases(cases);
  renderModalNotes(caseObj.noteEntries);
  UI.showToast('Note deleted', 'success');
}

function addNoteToCurrentCase() {
  if (!currentModalCaseId) return;
  const date = document.getElementById('modalNoteDate').value;
  const text = document.getElementById('modalNoteText').value.trim();
  if (!date && !text) {
    UI.showToast('Enter a date and/or note text.', 'warning');
    return;
  }

  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;

  const caseObj = cases[idx];
  if (!Array.isArray(caseObj.noteEntries)) {
    caseObj.noteEntries = [];
  }
  caseObj.noteEntries.push({ date: Utils.sanitizeString(date), text: Utils.sanitizeString(text) });
  Storage.saveCases(cases);

  document.getElementById('modalNoteDate').value = '';
  document.getElementById('modalNoteText').value = '';
  renderModalNotes(caseObj.noteEntries);
  UI.showToast('Note added', 'success');
}

// ============================================================================
// TODOS MANAGEMENT
// ============================================================================

function renderModalTodos(todos) {
  const list = document.getElementById('modalTodoList');
  list.innerHTML = '';
  if (!todos || todos.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No to-dos yet.';
    list.appendChild(li);
    return;
  }

  todos.forEach((t, idx) => {
    const li = document.createElement('li');
    const isCompleted = !!t.completed;

    let deadlineText = 'No deadline';
    if (t.deadline) {
      try {
        const d = Utils.parseLocalDate(t.deadline);
        deadlineText = Utils.formatDateWithWeekday(d);
      } catch {
        deadlineText = t.deadline;
      }
    }

    if (isCompleted) {
      li.className = 'todo-completed';
    }

    const dateSpan = document.createElement('span');
    dateSpan.className = 'note-date';
    dateSpan.textContent = deadlineText;
    li.appendChild(dateSpan);
    li.appendChild(document.createTextNode(': ' + (t.description || '')));

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'secondary small-link';
    toggleBtn.style.marginLeft = '0.5rem';
    toggleBtn.textContent = isCompleted ? 'Mark not done' : 'Mark done';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTodoCompleted(idx, !isCompleted);
    });
    li.appendChild(toggleBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'danger small-link';
    delBtn.style.marginLeft = '0.25rem';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTodoFromCurrentCase(idx);
    });
    li.appendChild(delBtn);

    list.appendChild(li);
  });
}

function toggleTodoCreationRow() {
  const row = document.getElementById('modalTodoCreateRow');
  if (!row) return;
  row.style.display = (row.style.display === 'none' || row.style.display === '') ? 'block' : 'none';
}

function addTodoToCurrentCase() {
  if (!currentModalCaseId) {
    UI.showToast('Error: No case selected', 'error');
    return;
  }
  
  const descEl = document.getElementById('modalTodoDescription');
  const deadlineEl = document.getElementById('modalTodoDeadline');
  
  if (!descEl || !deadlineEl) {
    UI.showToast('Error: Form elements not found', 'error');
    return;
  }
  
  const description = descEl.value.trim();
  const deadline = deadlineEl.value;

  if (!description && !deadline) {
    UI.showToast('Enter at least a description or a deadline.', 'warning');
    return;
  }

  try {
    const cases = Storage.loadCases();
    const idx = cases.findIndex(c => c.id === currentModalCaseId);
    if (idx === -1) {
      UI.showToast('Error: Case not found', 'error');
      return;
    }

    const caseObj = cases[idx];
    if (!Array.isArray(caseObj.todos)) {
      caseObj.todos = [];
    }
    caseObj.todos.push({
      description: Utils.sanitizeString(description),
      deadline,
      completed: false
    });

    Storage.saveCases(cases);
    renderModalTodos(caseObj.todos);
    renderCases();
    UI.showToast('To-do added', 'success');

    descEl.value = '';
    deadlineEl.value = '';
  } catch (error) {
    console.error('Error adding todo:', error);
    UI.showToast('Error adding to-do: ' + error.message, 'error');
  }
}

function deleteTodoFromCurrentCase(todoIndex) {
  if (!currentModalCaseId && currentModalCaseId !== 0) return;
  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;

  const caseObj = cases[idx];
  if (!Array.isArray(caseObj.todos)) {
    caseObj.todos = [];
  }
  if (todoIndex < 0 || todoIndex >= caseObj.todos.length) return;

  if (!UI.confirmAction('Delete this to-do?')) return;

  caseObj.todos.splice(todoIndex, 1);
  Storage.saveCases(cases);
  renderModalTodos(caseObj.todos);
  renderCases();
  UI.showToast('To-do deleted', 'success');
}

function toggleTodoCompleted(todoIndex, completed) {
  if (!currentModalCaseId && currentModalCaseId !== 0) return;
  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;

  const caseObj = cases[idx];
  if (!Array.isArray(caseObj.todos)) {
    caseObj.todos = [];
  }
  if (todoIndex < 0 || todoIndex >= caseObj.todos.length) return;

  caseObj.todos[todoIndex].completed = completed;
  Storage.saveCases(cases);
  renderModalTodos(caseObj.todos);
  renderCases();
  UI.showToast(completed ? 'To-do marked complete' : 'To-do marked incomplete', 'success');
}

// ============================================================================
// CHARGES MANAGEMENT (NEW)
// ============================================================================

function renderChargesList(charges) {
  // Use the enhanced visual version
  renderModalChargesEnhanced(charges);
}
  const container = document.getElementById('chargesList');
  if (!container) return;

  container.innerHTML = '';
  
  if (!charges || charges.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'small-text';
    empty.textContent = 'No charges added yet.';
    container.appendChild(empty);
    return;
  }

  charges.forEach((charge, idx) => {
    const item = document.createElement('div');
    item.className = 'charge-item';
    if (charge.isPrimaryCharge) {
      item.classList.add('charge-primary');
    }

    const info = document.createElement('div');
    info.className = 'charge-info';

    const name = document.createElement('div');
    name.className = 'charge-name';
    name.textContent = charge.name || 'Unnamed charge';
    if (charge.isPrimaryCharge) {
      const badge = document.createElement('span');
      badge.style.marginLeft = '0.5rem';
      badge.style.fontSize = '0.7rem';
      badge.style.color = '#0369a1';
      badge.style.fontWeight = '600';
      badge.textContent = '(Primary)';
      name.appendChild(badge);
    }

    const statute = document.createElement('div');
    statute.className = 'charge-statute';
    statute.textContent = charge.statute || '';

    info.appendChild(name);
    if (charge.statute) info.appendChild(statute);

    const actions = document.createElement('div');
    actions.className = 'charge-actions';

    if (!charge.isPrimaryCharge) {
      const primaryBtn = document.createElement('button');
      primaryBtn.className = 'secondary small-link';
      primaryBtn.textContent = 'Make Primary';
      primaryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setPrimaryCharge(idx);
      });
      actions.appendChild(primaryBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger small-link';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCharge(idx);
    });
    actions.appendChild(deleteBtn);

    item.appendChild(info);
    item.appendChild(actions);
    container.appendChild(item);
  });
}

function toggleChargeInputRow() {
  const row = document.getElementById('chargeInputRow');
  if (!row) return;
  const isHidden = row.style.display === 'none' || row.style.display === '';
  row.style.display = isHidden ? 'block' : 'none';
  
  if (isHidden) {
    document.getElementById('newChargeName').focus();
  }
}

function saveNewCharge() {
  if (!currentModalCaseId) return;
  
  const name = document.getElementById('newChargeName').value.trim();
  const statute = document.getElementById('newChargeStatute').value.trim();
  const chargeClass = document.getElementById('newChargeClass').value;
  const isPrimary = document.getElementById('newChargePrimary').checked;

  if (!name) {
    UI.showToast('Enter a charge name.', 'warning');
    return;
  }

  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;

  const caseObj = cases[idx];
  if (!Array.isArray(caseObj.charges)) {
    caseObj.charges = [];
  }

  // If marking as primary, unmark others
  if (isPrimary) {
    caseObj.charges.forEach(ch => ch.isPrimaryCharge = false);
    // Update the case's chargeLevel to match
    if (chargeClass) {
      caseObj.chargeLevel = chargeClass;
    }
  }

  const newCharge = {
    id: 'charge-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    name: Utils.sanitizeString(name),
    statute: Utils.sanitizeString(statute),
    class: chargeClass,
    isPrimaryCharge: isPrimary,
    dateAdded: Utils.formatDate(new Date())
  };

  caseObj.charges.push(newCharge);
  Storage.saveCases(cases);
  
  renderChargesList(caseObj.charges);
  UI.showToast('Charge added', 'success');

  // Clear inputs
  document.getElementById('newChargeName').value = '';
  document.getElementById('newChargeStatute').value = '';
  document.getElementById('newChargePrimary').checked = false;
  toggleChargeInputRow();
}

function cancelNewCharge() {
  document.getElementById('newChargeName').value = '';
  document.getElementById('newChargeStatute').value = '';
  document.getElementById('newChargePrimary').checked = false;
  toggleChargeInputRow();
}

function deleteCharge(chargeIndex) {
  if (!currentModalCaseId) return;
  if (!UI.confirmAction('Delete this charge?')) return;

  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;

  const caseObj = cases[idx];
  if (!Array.isArray(caseObj.charges)) return;
  if (chargeIndex < 0 || chargeIndex >= caseObj.charges.length) return;

  caseObj.charges.splice(chargeIndex, 1);
  Storage.saveCases(cases);
  renderChargesList(caseObj.charges);
  UI.showToast('Charge deleted', 'success');
}

function setPrimaryCharge(chargeIndex) {
  if (!currentModalCaseId) return;

  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;

  const caseObj = cases[idx];
  if (!Array.isArray(caseObj.charges)) return;
  if (chargeIndex < 0 || chargeIndex >= caseObj.charges.length) return;

  // Unmark all others
  caseObj.charges.forEach((ch, i) => {
    ch.isPrimaryCharge = (i === chargeIndex);
  });

  // Update case charge level
  const primaryCharge = caseObj.charges[chargeIndex];
  if (primaryCharge.class) {
    caseObj.chargeLevel = primaryCharge.class;
  }

  Storage.saveCases(cases);
  renderChargesList(caseObj.charges);
  UI.showToast('Primary charge updated', 'success');
}


// ============================================================================
// EXCLUDABLE CALCULATORS - MAIN FORM
// ============================================================================

function openAdvExModal() {
  const container = document.getElementById('exCalcRows');
  container.innerHTML = '';
  exCalcRowCounter = 0;

  if (!pendingExWindows || pendingExWindows.length === 0) {
    addExCalcRow();
  } else {
    pendingExWindows.forEach(w => addExCalcRow(w));
  }

  recalcExCalcTotals();
  UI.openModal('advExModal');
}

function closeAdvExModal() {
  UI.closeModal('advExModal');
}

function saveAdvExAndClose() {
  closeAdvExModal();
}

function resetExCalc() {
  pendingExWindows = [];
  const container = document.getElementById('exCalcRows');
  if (container) container.innerHTML = '';
  exCalcRowCounter = 0;
}

function addExCalcRow(existing) {
  const container = document.getElementById('exCalcRows');
  const rowId = ++exCalcRowCounter;
  const row = document.createElement('div');
  row.className = 'excalc-row';
  row.dataset.rowId = rowId;

  row.innerHTML = `
    <input type="date" class="excalc-start">
    <input type="date" class="excalc-end">
    <input type="text" class="excalc-reason" placeholder="Excludable reason">
    <label style="font-size:0.8rem;">
      <input type="checkbox" class="excalc-arg"> Arg. excludable
    </label>
    <span class="excalc-days">0 days</span>
    <button type="button" class="secondary small-link excalc-remove" title="Remove window">×</button>
  `;

  const startInput = row.querySelector('.excalc-start');
  const endInput = row.querySelector('.excalc-end');
  const reasonInput = row.querySelector('.excalc-reason');
  const argCheckbox = row.querySelector('.excalc-arg');
  const removeBtn = row.querySelector('.excalc-remove');

  if (existing) {
    startInput.value = existing.start || '';
    endInput.value = existing.end || '';
    reasonInput.value = existing.reason || '';
    argCheckbox.checked = !!existing.arguable;
  }

  startInput.addEventListener('change', recalcExCalcTotals);
  endInput.addEventListener('change', recalcExCalcTotals);
  reasonInput.addEventListener('input', recalcExCalcTotals);
  argCheckbox.addEventListener('change', recalcExCalcTotals);
  removeBtn.addEventListener('click', () => {
    row.remove();
    recalcExCalcTotals();
  });

  container.appendChild(row);
}

function recalcExCalcTotals() {
  const rows = Array.from(document.querySelectorAll('#exCalcRows .excalc-row'));
  let totalDef = 0;
  let totalArg = 0;
  const windows = [];

  rows.forEach(row => {
    const startVal = row.querySelector('.excalc-start').value;
    const endVal = row.querySelector('.excalc-end').value;
    const reasonVal = row.querySelector('.excalc-reason').value.trim();
    const argChecked = row.querySelector('.excalc-arg').checked;
    let days = 0;

    if (startVal && endVal) {
      const s = Utils.parseLocalDate(startVal);
      const e = Utils.parseLocalDate(endVal);
      if (e >= s) {
        days = Utils.daysBetweenDates(s, e) + 1;
        if (argChecked) totalArg += days;
        else totalDef += days;
      }
    }
    row.querySelector('.excalc-days').textContent = `${days} day${days === 1 ? '' : 's'}`;

    if (startVal || endVal || reasonVal) {
      windows.push({
        start: startVal,
        end: endVal,
        reason: Utils.sanitizeString(reasonVal),
        arguable: argChecked
      });
    }
  });

  pendingExWindows = windows;

  const defTotal = totalDef;
  const argTotal = totalArg;
  const simpleTotal = defTotal + argTotal;

  const defSpan = document.getElementById('exCalcDefTotal');
  const argSpan = document.getElementById('exCalcArgTotal');
  const totalSpan = document.getElementById('exCalcTotal');

  if (defSpan) defSpan.textContent = String(defTotal);
  if (argSpan) argSpan.textContent = String(argTotal);
  if (totalSpan) totalSpan.textContent = String(simpleTotal);

  const defHidden = document.getElementById('definitelyExcludedDays');
  const argHidden = document.getElementById('arguablyExcludedDays');
  const simpleInput = document.getElementById('excludedDays');

  if (defHidden) defHidden.value = String(defTotal);
  if (argHidden) argHidden.value = String(argTotal);
  if (simpleInput) simpleInput.value = String(simpleTotal);
}

// ============================================================================
// EXCLUDABLE CALCULATORS - MODAL (PER CASE)
// ============================================================================

function resetModalExCalc() {
  const container = document.getElementById('modalExRows');
  if (container) container.innerHTML = '';
  modalExRowCounter = 0;
}

function loadModalExCalc(exWindows) {
  const container = document.getElementById('modalExRows');
  container.innerHTML = '';
  modalExRowCounter = 0;

  if (exWindows && exWindows.length > 0) {
    exWindows.forEach(w => addModalExRow(w));
  } else {
    addModalExRow();
  }

  recalcModalExTotals();
}

function addModalExRow(existing) {
  const container = document.getElementById('modalExRows');
  const rowId = ++modalExRowCounter;
  const row = document.createElement('div');
  row.className = 'excalc-row';
  row.dataset.rowId = rowId;

  row.innerHTML = `
    <input type="date" class="modal-ex-start">
    <input type="date" class="modal-ex-end">
    <input type="text" class="modal-ex-reason" placeholder="Excludable reason">
    <label style="font-size:0.8rem;">
      <input type="checkbox" class="modal-ex-arg"> Arg. excludable
    </label>
    <span class="excalc-days">0 days</span>
    <button type="button" class="secondary small-link modal-ex-remove" title="Remove window">×</button>
  `;

  const startInput = row.querySelector('.modal-ex-start');
  const endInput = row.querySelector('.modal-ex-end');
  const reasonInput = row.querySelector('.modal-ex-reason');
  const argCheckbox = row.querySelector('.modal-ex-arg');
  const removeBtn = row.querySelector('.modal-ex-remove');

  if (existing) {
    startInput.value = existing.start || '';
    endInput.value = existing.end || '';
    reasonInput.value = existing.reason || '';
    argCheckbox.checked = !!existing.arguable;
  }

  startInput.addEventListener('change', recalcModalExTotals);
  endInput.addEventListener('change', recalcModalExTotals);
  reasonInput.addEventListener('input', recalcModalExTotals);
  argCheckbox.addEventListener('change', recalcModalExTotals);
  removeBtn.addEventListener('click', () => {
    row.remove();
    recalcModalExTotals();
  });

  container.appendChild(row);
}

function updateModal3030Date() {
  const span = document.getElementById('modal3030Date');
  if (!span) return;

  const level = document.getElementById('modalChargeLevel').value;
  const startStr = document.getElementById('modalStartDate').value;
  const def = Number(document.getElementById('modalDefExcluded').value) || 0;
  const arg = Number(document.getElementById('modalArgExcluded').value) || 0;
  const includeArg = document.getElementById('modalIncludeArg').checked;

  if (!level || !startStr) {
    span.textContent = '';
    span.title = '';
    return;
  }

  const extraDays = def + (includeArg ? arg : 0);
  const res = Calculations.computeQuickDeadline(level, startStr, extraDays);
  if (!res || !res.dateObj) {
    span.textContent = '';
    span.title = '';
    return;
  }

  const deadlineDate = res.dateObj;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dCopy = new Date(deadlineDate.getTime());
  dCopy.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((dCopy - today) / (1000 * 60 * 60 * 24));

  let diffText;
  if (diffDays > 0) {
    diffText = `${diffDays} day${diffDays === 1 ? '' : 's'} from today`;
  } else if (diffDays === 0) {
    diffText = 'today';
  } else {
    const n = Math.abs(diffDays);
    diffText = `${n} day${n === 1 ? '' : 's'} ago`;
  }

  span.textContent = `${res.dateStr} (${diffText})`;
  span.title = res.tooltip || '';
}

function recalcModalExTotals() {
  const rows = Array.from(document.querySelectorAll('#modalExRows .excalc-row'));
  let totalDef = 0;
  let totalArg = 0;

  rows.forEach(row => {
    const startVal = row.querySelector('.modal-ex-start').value;
    const endVal = row.querySelector('.modal-ex-end').value;
    const argChecked = row.querySelector('.modal-ex-arg').checked;
    let days = 0;
    if (startVal && endVal) {
      const s = Utils.parseLocalDate(startVal);
      const e = Utils.parseLocalDate(endVal);
      if (e >= s) {
        days = Utils.daysBetweenDates(s, e) + 1;
        if (argChecked) totalArg += days;
        else totalDef += days;
      }
    }
    row.querySelector('.excalc-days').textContent = `${days} day${days === 1 ? '' : 's'}`;
  });

  const defInput = document.getElementById('modalDefExcluded');
  const argInput = document.getElementById('modalArgExcluded');
  const simpleInput = document.getElementById('modalExcludedDays');
  const defSpan = document.getElementById('modalExDefTotal');
  const argSpan = document.getElementById('modalExArgTotal');
  const totalSpan = document.getElementById('modalExTotal');

  const defTotal = totalDef;
  const argTotal = totalArg;
  const simpleTotal = defTotal + argTotal;

  if (defInput) defInput.value = String(defTotal);
  if (argInput) argInput.value = String(argTotal);
  if (simpleInput) simpleInput.value = String(simpleTotal);
  if (defSpan) defSpan.textContent = String(defTotal);
  if (argSpan) argSpan.textContent = String(argTotal);
  if (totalSpan) totalSpan.textContent = String(simpleTotal);

  updateModal3030Date();
}

function collectModalExWindows() {
  const rows = Array.from(document.querySelectorAll('#modalExRows .excalc-row'));
  const windows = [];
  rows.forEach(row => {
    const startVal = row.querySelector('.modal-ex-start').value;
    const endVal = row.querySelector('.modal-ex-end').value;
    const reasonVal = row.querySelector('.modal-ex-reason').value.trim();
    const argChecked = row.querySelector('.modal-ex-arg').checked;
    if (startVal || endVal || reasonVal) {
      windows.push({
        start: startVal,
        end: endVal,
        reason: Utils.sanitizeString(reasonVal),
        arguable: argChecked
      });
    }
  });
  return windows;
}

function toggleModalAdvanced() {
  const box = document.getElementById('advancedModalContainer');
  const isHidden = box.style.display === 'none' || box.style.display === '';
  box.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) {
    updateModal3030Date();
  }
}

// ============================================================================
// QUICK 30.30 CALCULATOR
// ============================================================================

function resetQuickExCalc() {
  const container = document.getElementById('quickExRows');
  container.innerHTML = '';
  quickExRowCounter = 0;
  addQuickExRow();
  recalcQuickExTotals();
}

function addQuickExRow() {
  const container = document.getElementById('quickExRows');
  const rowId = ++quickExRowCounter;
  const row = document.createElement('div');
  row.className = 'excalc-row';
  row.dataset.rowId = rowId;

  row.innerHTML = `
    <input type="date" class="quick-ex-start">
    <input type="date" class="quick-ex-end">
    <span class="excalc-days">0 days</span>
    <button type="button" class="secondary small-link quick-ex-remove" title="Remove window">×</button>
  `;

  const startInput = row.querySelector('.quick-ex-start');
  const endInput = row.querySelector('.quick-ex-end');
  const removeBtn = row.querySelector('.quick-ex-remove');

  startInput.addEventListener('change', recalcQuickExTotals);
  endInput.addEventListener('change', recalcQuickExTotals);
  removeBtn.addEventListener('click', () => {
    row.remove();
    recalcQuickExTotals();
  });

  container.appendChild(row);
}

function recalcQuickExTotals() {
  const rows = Array.from(document.querySelectorAll('#quickExRows .excalc-row'));
  let total = 0;

  rows.forEach(row => {
    const startVal = row.querySelector('.quick-ex-start').value;
    const endVal = row.querySelector('.quick-ex-end').value;
    let days = 0;
    if (startVal && endVal) {
      const s = Utils.parseLocalDate(startVal);
      const e = Utils.parseLocalDate(endVal);
      if (e >= s) {
        days = Utils.daysBetweenDates(s, e) + 1;
      }
    }
    row.querySelector('.excalc-days').textContent = `${days} day${days === 1 ? '' : 's'}`;
    total += days;
  });

  document.getElementById('quickExTotal').textContent = String(total);
  updateQuickDeadline();
}

function updateQuickDeadline() {
  const level = document.getElementById('quickChargeLevel').value;
  const startStr = document.getElementById('quickStartDate').value;
  const exDays = Number(document.getElementById('quickExTotal').textContent) || 0;
  const span = document.getElementById('quickDeadline');

  if (!level || !startStr) {
    span.textContent = '';
    span.title = '';
    return;
  }

  const res = Calculations.computeQuickDeadline(level, startStr, exDays);
  if (!res) {
    span.textContent = '';
    span.title = '';
    return;
  }
  span.textContent = res.dateStr;
  span.title = res.tooltip || '';
}

// ============================================================================
// BACKUP & EXPORT FUNCTIONS
// ============================================================================

function getBackupPassword() {
  const pw = document.getElementById('backupPassword').value;
  if (!pw) {
    UI.showToast('Enter a backup password first.', 'warning');
    return null;
  }
  return pw;
}

async function exportEncryptedBackup() {
  const password = getBackupPassword();
  if (!password) return;

  const cases = Storage.loadCases();
  if (!cases || cases.length === 0) {
    if (!UI.confirmAction('You currently have no cases stored. Export an empty backup?')) {
      return;
    }
  }

  UI.setLoadingState(document.getElementById('exportBtn'), true);

  try {
    const plaintext = JSON.stringify(cases);
    const ciphertextPayload = await Crypto.encryptStringWithPassword(plaintext, password);

    UI.downloadFile(ciphertextPayload, 'nycasetracker-backup.txt', 'text/plain');
    UI.showToast('Encrypted backup exported successfully.', 'success');
  } catch (err) {
    console.error(err);
    UI.showToast('Error creating backup: ' + err.message, 'error');
  } finally {
    UI.setLoadingState(document.getElementById('exportBtn'), false);
  }
}

async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const isMergeMode = window.importMergeMode || false;
  window.importMergeMode = false; // Reset flag

  const password = getBackupPassword();
  if (!password) {
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const ciphertextPayload = e.target.result;
      const plaintext = await Crypto.decryptStringWithPassword(ciphertextPayload, password);

      if (!plaintext) {
        throw new Error('Decryption resulted in empty text (wrong password or corrupt file).');
      }

      const parsed = JSON.parse(plaintext);
      const importedCases = Storage.validateAndNormalizeImportedCases(parsed);

      if (isMergeMode) {
        // Merge mode: combine with existing cases
        const existingCases = Storage.loadCases();
        const existingIds = new Set(existingCases.map(c => c.id));
        
        // Add imported cases that don't already exist
        const newCases = importedCases.filter(c => !existingIds.has(c.id));
        const mergedCases = [...existingCases, ...newCases];
        
        Storage.saveCases(mergedCases);
        renderCases();
        UI.showToast(`Merged ${newCases.length} new case${newCases.length === 1 ? '' : 's'} from backup.`, 'success');
      } else {
        // Replace mode: overwrite existing cases
        Storage.saveCases(importedCases);
        renderCases();
        UI.showToast('Backup imported successfully (existing cases replaced).', 'success');
      }
    } catch (err) {
      console.error(err);
      UI.showToast('Could not decrypt/import backup. Check your password and file.', 'error');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

async function handleImportMergeFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const password = getBackupPassword();
  if (!password) {
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const ciphertextPayload = e.target.result;
      const plaintext = await Crypto.decryptStringWithPassword(ciphertextPayload, password);

      if (!plaintext) {
        throw new Error('Decryption resulted in empty text (wrong password or corrupt file).');
      }

      const parsed = JSON.parse(plaintext);
      const importedCases = Storage.validateAndNormalizeImportedCases(parsed);

      const existingCases = Storage.loadCases();
      importedCases.forEach(ic => {
        if (!ic.id || existingCases.some(c => c.id === ic.id)) {
          ic.id = 'case-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        }
        existingCases.push(ic);
      });

      Storage.saveCases(existingCases);
      renderCases();
      UI.showToast('Encrypted backup imported and merged with existing cases.', 'success');
    } catch (err) {
      console.error(err);
      UI.showToast('Could not decrypt/import backup. Check your password and file.', 'error');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function clearAllCases() {
  if (!UI.confirmAction(
    'This will permanently delete all cases stored in this browser on this device.\n\n' +
    'They are only stored locally here unless you have exported an encrypted backup.\n\n' +
    'Do you want to continue?'
  )) {
    return;
  }
  Storage.clearAllCases();
  renderCases();
  UI.showToast('All cases cleared from this browser.', 'info');
}

// ============================================================================
// CALENDAR EXPORT (NEW)
// ============================================================================

function exportCalendarFile() {
  const cases = Storage.loadCases();
  const upcomingCases = cases.filter(c => c.nextCourtDate && !c.closed);

  if (upcomingCases.length === 0) {
    UI.showToast('No upcoming court dates to export.', 'warning');
    return;
  }

  try {
    const { content, count } = exportToCalendar(upcomingCases);
    UI.downloadFile(content, 'court-dates.ics', 'text/calendar');
    UI.showToast(`Exported ${count} court date${count === 1 ? '' : 's'} to calendar file.`, 'success');
  } catch (err) {
    console.error(err);
    UI.showToast('Error exporting calendar: ' + err.message, 'error');
  }
}

// ============================================================================
// EMAIL AND PRINT TODAY'S CASES (v2.1)
// ============================================================================

/**
 * Email today's cases in plain text format
 */
function emailTodaysCases() {
  const today = Utils.formatDate(new Date());
  const cases = Storage.loadCases();
  const todaysCases = cases.filter(c => c.nextCourtDate === today && !c.closed);

  if (todaysCases.length === 0) {
    UI.showToast('No cases scheduled for today', 'warning');
    return;
  }

  let emailBody = `TODAY'S CASES - ${today}\n`;
  emailBody += '='.repeat(60) + '\n\n';

  todaysCases.forEach((c, index) => {
    emailBody += `${index + 1}. ${c.clientName}\n`;
    emailBody += `   Docket: ${c.docketNumber || 'N/A'}\n`;
    emailBody += `   Part: ${c.courtPart || 'N/A'}\n`;
    emailBody += `   On For: ${c.nextCourtAppearanceType || 'N/A'}\n`;
    
    // Add 30.30 deadline
    const deadline = Calc.computeQuickDeadline(c.chargeLevel, c.startDate, Number(c.excludedDays || 0));
    if (deadline) {
      emailBody += `   30.30 Deadline: ${deadline.dateStr}\n`;
    }
    
    // Add contact info
    if (c.clientPhone) {
      emailBody += `   Phone: ${c.clientPhone}\n`;
    }
    if (c.clientEmail) {
      emailBody += `   Email: ${c.clientEmail}\n`;
    }
    
    emailBody += '\n';
  });

  const subject = `Today's Cases - ${today}`;
  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
  window.location.href = mailtoLink;
  
  UI.showToast(`Opening email with ${todaysCases.length} case${todaysCases.length === 1 ? '' : 's'}`, 'success');
}

/**
 * Print today's cases in styled PDF format
 */
function printTodaysCases() {
  const today = Utils.formatDate(new Date());
  const cases = Storage.loadCases();
  const todaysCases = cases.filter(c => c.nextCourtDate === today && !c.closed);

  if (todaysCases.length === 0) {
    UI.showToast('No cases scheduled for today', 'warning');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    UI.showToast('Please allow popups to print', 'error');
    return;
  }

  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Today's Cases - ${today}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #000;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
      font-size: 24px;
      border-bottom: 3px solid #000;
      padding-bottom: 10px;
    }
    .case {
      margin-bottom: 30px;
      padding: 20px;
      border: 2px solid #333;
      page-break-inside: avoid;
    }
    .case-header {
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 10px;
      border-bottom: 1px solid #333;
      padding-bottom: 5px;
    }
    .case-detail {
      margin: 5px 0;
      font-size: 14px;
    }
    .label {
      font-weight: bold;
      display: inline-block;
      width: 150px;
    }
    .charges {
      margin-top: 10px;
      padding: 10px;
      background: #f5f5f5;
      border: 1px solid #ccc;
    }
    .charges-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    @media print {
      body { margin: 20px; }
      .case { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>TODAY'S CASES - ${today}</h1>
`;

  todaysCases.forEach((c, index) => {
    const deadline = Calc.computeQuickDeadline(c.chargeLevel, c.startDate, Number(c.excludedDays || 0));
    const deadlineStr = deadline ? deadline.dateStr : 'N/A';

    html += `
  <div class="case">
    <div class="case-header">${index + 1}. ${Utils.sanitizeString(c.clientName)}</div>
    <div class="case-detail"><span class="label">Docket:</span>${Utils.sanitizeString(c.docketNumber || 'N/A')}</div>
    <div class="case-detail"><span class="label">Part:</span>${Utils.sanitizeString(c.courtPart || 'N/A')}</div>
    <div class="case-detail"><span class="label">On For:</span>${Utils.sanitizeString(c.nextCourtAppearanceType || 'N/A')}</div>
    <div class="case-detail"><span class="label">30.30 Deadline:</span>${deadlineStr}</div>
`;

    if (c.clientPhone || c.clientEmail) {
      html += `<div class="case-detail"><span class="label">Contact:</span></div>`;
      if (c.clientPhone) {
        html += `<div class="case-detail" style="margin-left: 150px;">Phone: ${Utils.sanitizeString(c.clientPhone)}</div>`;
      }
      if (c.clientEmail) {
        html += `<div class="case-detail" style="margin-left: 150px;">Email: ${Utils.sanitizeString(c.clientEmail)}</div>`;
      }
    }

    if (c.charges && c.charges.length > 0) {
      html += `<div class="charges"><div class="charges-title">Charges:</div>`;
      c.charges.forEach(charge => {
        html += `<div>• ${Utils.sanitizeString(charge.name || '')} ${charge.statute ? '(' + Utils.sanitizeString(charge.statute) + ')' : ''}</div>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });

  html += `
</body>
</html>
`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
  }, 250);
  
  UI.showToast(`Preparing to print ${todaysCases.length} case${todaysCases.length === 1 ? '' : 's'}`, 'success');
}

// ============================================================================
// ============================================================================
// ENHANCED CONTACT MANAGEMENT
// Add these functions before the "GLOBAL WINDOW FUNCTIONS" section in app.js
// ============================================================================

/**
 * Render phone numbers in modal
 */
function renderModalPhones(phones) {
  const list = document.getElementById('phonesList');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (!phones || phones.length === 0) {
    list.innerHTML = '<div class="field-help" style="text-align:center;padding:1rem;">No additional phones yet</div>';
    return;
  }
  
  phones.forEach((phone, idx) => {
    const item = document.createElement('div');
    item.className = 'contact-item';
    
    const main = document.createElement('div');
    main.className = 'contact-item-main';
    
    const value = document.createElement('div');
    value.className = 'contact-item-value';
    value.textContent = phone.number || '(No number)';
    main.appendChild(value);
    
    if (phone.note) {
      const note = document.createElement('div');
      note.className = 'contact-item-note';
      note.textContent = phone.note;
      main.appendChild(note);
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'contact-item-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', () => deletePhoneFromCurrentCase(idx));
    
    item.appendChild(main);
    item.appendChild(removeBtn);
    list.appendChild(item);
  });
  
  updateAdditionalContactCount();
}

/**
 * Render emails in modal
 */
function renderModalEmails(emails) {
  const list = document.getElementById('emailsList');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (!emails || emails.length === 0) {
    list.innerHTML = '<div class="field-help" style="text-align:center;padding:1rem;">No additional emails yet</div>';
    return;
  }
  
  emails.forEach((email, idx) => {
    const item = document.createElement('div');
    item.className = 'contact-item';
    
    const main = document.createElement('div');
    main.className = 'contact-item-main';
    
    const value = document.createElement('div');
    value.className = 'contact-item-value';
    value.textContent = email.address || '(No address)';
    main.appendChild(value);
    
    if (email.note) {
      const note = document.createElement('div');
      note.className = 'contact-item-note';
      note.textContent = email.note;
      main.appendChild(note);
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'contact-item-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', () => deleteEmailFromCurrentCase(idx));
    
    item.appendChild(main);
    item.appendChild(removeBtn);
    list.appendChild(item);
  });
  
  updateAdditionalContactCount();
}

/**
 * Update the additional contact count badge
 */
function updateAdditionalContactCount() {
  const cases = Storage.loadCases();
  const c = cases.find(c => c.id === currentModalCaseId);
  if (!c) return;
  
  const phoneCount = (c.phones && c.phones.length) || 0;
  const emailCount = (c.emails && c.emails.length) || 0;
  const hasAddress = !!(c.address && c.address.trim());
  
  const total = phoneCount + emailCount + (hasAddress ? 1 : 0);
  
  const badge = document.getElementById('additionalContactCount');
  if (badge) {
    if (total > 0) {
      badge.textContent = `(${total})`;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  }
}

/**
 * Add phone to current case
 */
function addPhoneToCurrentCase() {
  if (!currentModalCaseId) return;
  
  const number = prompt('Enter phone number:');
  if (!number || !number.trim()) return;
  
  const note = prompt('Add a note (optional):\ne.g., "Mother\'s phone - call after 6pm" or "Phone disconnected"') || '';
  
  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;
  
  if (!Array.isArray(cases[idx].phones)) {
    cases[idx].phones = [];
  }
  
  cases[idx].phones.push({
    id: 'phone-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    number: Utils.sanitizeString(number.trim()),
    note: Utils.sanitizeString(note.trim())
  });
  
  Storage.saveCases(cases);
  renderModalPhones(cases[idx].phones);
  UI.showToast('Phone added', 'success');
}

/**
 * Delete phone from current case
 */
function deletePhoneFromCurrentCase(phoneIndex) {
  if (!currentModalCaseId) return;
  if (!confirm('Remove this phone number?')) return;
  
  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;
  
  if (Array.isArray(cases[idx].phones)) {
    cases[idx].phones.splice(phoneIndex, 1);
    Storage.saveCases(cases);
    renderModalPhones(cases[idx].phones);
    UI.showToast('Phone removed', 'info');
  }
}

/**
 * Add email to current case
 */
function addEmailToCurrentCase() {
  if (!currentModalCaseId) return;
  
  const address = prompt('Enter email address:');
  if (!address || !address.trim()) return;
  
  const note = prompt('Add a note (optional):\ne.g., "Work email" or "Prefers email contact"') || '';
  
  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;
  
  if (!Array.isArray(cases[idx].emails)) {
    cases[idx].emails = [];
  }
  
  cases[idx].emails.push({
    id: 'email-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    address: Utils.sanitizeString(address.trim()),
    note: Utils.sanitizeString(note.trim())
  });
  
  Storage.saveCases(cases);
  renderModalEmails(cases[idx].emails);
  UI.showToast('Email added', 'success');
}

/**
 * Delete email from current case
 */
function deleteEmailFromCurrentCase(emailIndex) {
  if (!currentModalCaseId) return;
  if (!confirm('Remove this email address?')) return;
  
  const cases = Storage.loadCases();
  const idx = cases.findIndex(c => c.id === currentModalCaseId);
  if (idx === -1) return;
  
  if (Array.isArray(cases[idx].emails)) {
    cases[idx].emails.splice(emailIndex, 1);
    Storage.saveCases(cases);
    renderModalEmails(cases[idx].emails);
    UI.showToast('Email removed', 'info');
  }
}

/**
 * Toggle additional contacts section
 */
function toggleAdditionalContacts() {
  const section = document.getElementById('additionalContactsSection');
  const icon = document.getElementById('contactsToggleIcon');
  
  if (!section || !icon) return;
  
  if (section.style.display === 'none') {
    section.style.display = 'block';
    icon.textContent = '▼';
  } else {
    section.style.display = 'none';
    icon.textContent = '▶';
  }
}

/**
 * Enhanced renderModalCharges with visual design
 */
function renderModalChargesEnhanced(charges) {
  const list = document.getElementById('chargesList');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (!charges || charges.length === 0) {
    list.innerHTML = '<div class="field-help" style="text-align:center;padding:1.5rem;">No charges added yet. Add charges to track them separately.</div>';
    return;
  }
  
  charges.forEach((charge, idx) => {
    const item = document.createElement('div');
    item.className = 'charge-visual-item';
    if (charge.isPrimaryCharge) {
      item.classList.add('charge-primary');
    }
    
    const content = document.createElement('div');
    content.className = 'charge-content';
    
    const name = document.createElement('div');
    name.className = 'charge-name';
    if (charge.isPrimaryCharge) {
      const star = document.createElement('span');
      star.className = 'charge-star';
      star.textContent = '⭐';
      name.appendChild(star);
    }
    const nameText = document.createTextNode(charge.name || 'Unnamed Charge');
    name.appendChild(nameText);
    content.appendChild(name);
    
    const details = document.createElement('div');
    details.className = 'charge-details';
    
    if (charge.statute) {
      const statute = document.createElement('span');
      statute.className = 'charge-statute';
      statute.textContent = charge.statute;
      details.appendChild(statute);
    }
    
    if (charge.class) {
      const classBadge = document.createElement('span');
      classBadge.className = 'charge-class-badge';
      
      const classMap = {
        felony: { label: 'Felony', className: 'badge-felony' },
        classA: { label: 'Class A Misd', className: 'badge-classa' },
        classB: { label: 'Class B Misd', className: 'badge-classb' },
        violation: { label: 'Violation', className: 'badge-violation' }
      };
      
      const classInfo = classMap[charge.class] || { label: charge.class, className: '' };
      classBadge.textContent = classInfo.label;
      classBadge.classList.add(classInfo.className);
      details.appendChild(classBadge);
    }
    
    content.appendChild(details);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'charge-remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      if (confirm('Remove this charge?')) {
        deleteChargeFromCurrentCase(idx);
      }
    });
    
    item.appendChild(content);
    item.appendChild(removeBtn);
    list.appendChild(item);
  });
}

/**
 * Quick action: Copy docket number
 */
function quickCopyDocket() {
  const docket = document.getElementById('modalDocketNumber').value;
  if (!docket) {
    UI.showToast('No docket number to copy', 'warning');
    return;
  }
  
  navigator.clipboard.writeText(docket).then(() => {
    UI.showToast('Docket number copied!', 'success');
  }).catch(() => {
    UI.showToast('Could not copy to clipboard', 'error');
  });
}

/**
 * Quick action: Email case details
 */
function quickEmailCase() {
  if (!currentModalCaseId) return;
  
  const cases = Storage.loadCases();
  const c = cases.find(c => c.id === currentModalCaseId);
  if (!c) return;
  
  const subject = encodeURIComponent(`Case: ${c.clientName} - ${c.docketNumber || 'No docket'}`);
  const body = encodeURIComponent(
    `Client: ${c.clientName}\n` +
    `Docket: ${c.docketNumber || 'N/A'}\n` +
    `Next Court Date: ${c.nextCourtDate || 'Not set'}\n` +
    `On for: ${c.nextCourtAppearanceType || 'TBD'}\n` +
    `Part: ${c.courtPart || 'N/A'}\n` +
    `ADA: ${c.assignedAda || 'N/A'}\n`
  );
  
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Quick action: Print case
 */
function quickPrintCase() {
  if (!currentModalCaseId) return;
  
  const cases = Storage.loadCases();
  const c = cases.find(c => c.id === currentModalCaseId);
  if (!c) return;
  
  const printWindow = window.open('', '', 'width=800,height=600');
  const html = `
    <html>
    <head>
      <title>Case: ${c.clientName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 2rem; }
        h1 { margin: 0 0 0.5rem 0; }
        .section { margin: 1.5rem 0; }
        .label { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>${c.clientName}</h1>
      <div class="section">
        <div><span class="label">Docket:</span> ${c.docketNumber || 'N/A'}</div>
        <div><span class="label">Next Court Date:</span> ${c.nextCourtDate || 'Not set'}</div>
        <div><span class="label">On for:</span> ${c.nextCourtAppearanceType || 'TBD'}</div>
        <div><span class="label">Part:</span> ${c.courtPart || 'N/A'}</div>
        <div><span class="label">ADA:</span> ${c.assignedAda || 'N/A'}</div>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

// GLOBAL WINDOW FUNCTIONS (for onclick handlers in HTML)
// ============================================================================

window.openCaseModal = openCaseModal;
window.closeCaseModal = closeCaseModal;
window.saveModalChanges = saveModalChanges;
window.deleteCurrentCase = deleteCurrentCase;
window.exportCurrentCase = exportCurrentCase;
window.addNoteToCurrentCase = addNoteToCurrentCase;
window.addTodoToCurrentCase = addTodoToCurrentCase;
window.saveNewCharge = saveNewCharge;
window.cancelNewCharge = cancelNewCharge;
window.closeAdvExModal = closeAdvExModal;
window.saveAdvExAndClose = saveAdvExAndClose;

