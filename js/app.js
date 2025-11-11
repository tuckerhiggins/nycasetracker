let cases = [];
let currentCaseId = null;
let caseToDelete = null;
let currentFilters = {
    active: 'included',
    trial: 'off',
    warrant: 'off',
    closed: 'off'
};
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    loadCases();
    initializeEventListeners();
    renderCases();
    updateFilterButtons();
});

function initializeEventListeners() {
    document.getElementById('addCaseBtn').addEventListener('click', openAddCaseModal);
    document.getElementById('saveCaseBtn').addEventListener('click', saveCase);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('exportCalendarBtn').addEventListener('click', exportToCalendar);
    
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.currentTarget.dataset.filter;
            cycleFilterState(filter);
        });
    });
    
    document.getElementById('status').addEventListener('change', handleStatusChange);
    document.getElementById('readinessStated').addEventListener('change', handleReadinessChange);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.currentTarget.dataset.tab;
            switchTab(tabName);
        });
    });
    
    document.getElementById('addNoteBtn').addEventListener('click', addNote);
    document.getElementById('addTodoBtn').addEventListener('click', addTodo);
    document.getElementById('addPhoneBtn').addEventListener('click', addPhone);
    document.getElementById('addEmailBtn').addEventListener('click', addEmail);
    
    document.getElementById('emailTodayBtn').addEventListener('click', emailTodaysCases);
    document.getElementById('printTodayBtn').addEventListener('click', printTodaysCases);
    
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const sortBy = th.dataset.sort;
            sortCases(sortBy);
        });
    });
}

function cycleFilterState(filterType) {
    const currentState = currentFilters[filterType];
    
    if (currentState === 'off') {
        currentFilters[filterType] = 'only';
        Object.keys(currentFilters).forEach(key => {
            if (key !== filterType) {
                currentFilters[key] = 'off';
            }
        });
    } else if (currentState === 'only') {
        currentFilters[filterType] = 'included';
        currentFilters.active = 'included';
    } else {
        currentFilters[filterType] = 'off';
        const anyActive = Object.values(currentFilters).some(state => state !== 'off');
        if (!anyActive) {
            currentFilters.active = 'included';
        }
    }
    
    updateFilterButtons();
    renderCases();
}

function updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const filter = btn.dataset.filter;
        const state = currentFilters[filter];
        btn.setAttribute('data-state', state);
    });
}

function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase();
    renderCases();
}

function filterCases() {
    let filtered = cases;
    
    const hasOnlyFilter = Object.values(currentFilters).includes('only');
    
    if (hasOnlyFilter) {
        const onlyType = Object.keys(currentFilters).find(key => currentFilters[key] === 'only');
        filtered = cases.filter(c => c.status === onlyType);
    } else {
        const includedTypes = Object.keys(currentFilters).filter(key => currentFilters[key] === 'included');
        if (includedTypes.length > 0) {
            filtered = cases.filter(c => includedTypes.includes(c.status));
        }
    }
    
    if (searchQuery) {
        filtered = filtered.filter(c => {
            return c.clientName.toLowerCase().includes(searchQuery) ||
                   c.indictment.toLowerCase().includes(searchQuery) ||
                   (c.charges && c.charges.some(ch => ch.toLowerCase().includes(searchQuery))) ||
                   (c.part && c.part.toLowerCase().includes(searchQuery));
        });
    }
    
    return filtered;
}

function renderCases() {
    const filtered = filterCases();
    renderTable(filtered);
    renderMobileCards(filtered);
}

function renderTable(casesToRender) {
    const tbody = document.getElementById('casesTableBody');
    tbody.innerHTML = '';
    
    if (casesToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">No cases found</td></tr>';
        return;
    }
    
    casesToRender.forEach(caseData => {
        const row = document.createElement('tr');
        
        const topCharge = caseData.charges && caseData.charges.length > 0 ? caseData.charges[0] : 'N/A';
        const courtDate = caseData.courtDate ? formatDate(caseData.courtDate) : 'N/A';
        const deadline = caseData.arraignmentDate ? calculate3030Deadline(caseData) : 'N/A';
        
        let deadlineClass = '';
        if (deadline !== 'N/A' && deadline !== 'Readiness not stated') {
            const daysRemaining = calculateDaysRemaining(deadline);
            if (daysRemaining <= 0) {
                deadlineClass = 'deadline-warning';
            } else if (daysRemaining <= 30) {
                deadlineClass = 'deadline-soon';
            } else {
                deadlineClass = 'deadline-ok';
            }
        }
        
        row.innerHTML = `
            <td>${escapeHtml(caseData.clientName)}</td>
            <td>${escapeHtml(caseData.indictment)}</td>
            <td>${escapeHtml(topCharge)}</td>
            <td>${courtDate}</td>
            <td>${escapeHtml(caseData.part || 'N/A')}</td>
            <td><span class="status-badge status-${caseData.status}">${capitalizeFirst(caseData.status)}</span></td>
            <td class="${deadlineClass}">${deadline}</td>
            <td>
                <button class="btn btn-icon btn-secondary" onclick="openEditCaseModal('${caseData.id}')">✏️</button>
                <button class="btn btn-icon btn-danger" onclick="openDeleteModal('${caseData.id}')">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function renderMobileCards(casesToRender) {
    const container = document.getElementById('mobileCardsContainer');
    container.innerHTML = '';
    
    if (casesToRender.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No cases found</div>';
        return;
    }
    
    casesToRender.forEach(caseData => {
        const card = document.createElement('div');
        card.className = 'case-card';
        
        const topCharge = caseData.charges && caseData.charges.length > 0 ? caseData.charges[0] : 'N/A';
        const courtDate = caseData.courtDate ? formatDate(caseData.courtDate) : 'N/A';
        const deadline = caseData.arraignmentDate ? calculate3030Deadline(caseData) : 'N/A';
        
        let deadlineClass = '';
        if (deadline !== 'N/A' && deadline !== 'Readiness not stated') {
            const daysRemaining = calculateDaysRemaining(deadline);
            if (daysRemaining <= 0) {
                deadlineClass = 'deadline-warning';
            } else if (daysRemaining <= 30) {
                deadlineClass = 'deadline-soon';
            } else {
                deadlineClass = 'deadline-ok';
            }
        }
        
        card.innerHTML = `
            <div class="case-card-header">
                <div>
                    <div class="case-card-title">${escapeHtml(caseData.clientName)}</div>
                    <div class="case-card-subtitle">${escapeHtml(caseData.indictment)}</div>
                </div>
                <span class="status-badge status-${caseData.status}">${capitalizeFirst(caseData.status)}</span>
            </div>
            <div class="case-card-body">
                <div class="case-card-row">
                    <span class="case-card-label">Top Charge</span>
                    <span class="case-card-value">${escapeHtml(topCharge)}</span>
                </div>
                <div class="case-card-row">
                    <span class="case-card-label">Court Date</span>
                    <span class="case-card-value">${courtDate}</span>
                </div>
                <div class="case-card-row">
                    <span class="case-card-label">Part</span>
                    <span class="case-card-value">${escapeHtml(caseData.part || 'N/A')}</span>
                </div>
                <div class="case-card-row">
                    <span class="case-card-label">30.30 Deadline</span>
                    <span class="case-card-value ${deadlineClass}">${deadline}</span>
                </div>
            </div>
            <div class="case-card-actions">
                <button class="btn btn-secondary" style="flex: 1;" onclick="openEditCaseModal('${caseData.id}')">✏️ Edit</button>
                <button class="btn btn-danger" style="flex: 1;" onclick="openDeleteModal('${caseData.id}')">🗑️ Delete</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function sortCases(sortBy) {
    cases.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        if (sortBy === 'charges') {
            aVal = a.charges && a.charges.length > 0 ? a.charges[0] : '';
            bVal = b.charges && b.charges.length > 0 ? b.charges[0] : '';
        }
        
        if (sortBy === 'deadline3030') {
            const aDeadline = a.arraignmentDate ? calculate3030Deadline(a) : '';
            const bDeadline = b.arraignmentDate ? calculate3030Deadline(b) : '';
            return aDeadline.localeCompare(bDeadline);
        }
        
        if (!aVal) return 1;
        if (!bVal) return -1;
        
        return aVal.toString().localeCompare(bVal.toString());
    });
    
    saveCases();
    renderCases();
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

function openAddCaseModal() {
    currentCaseId = null;
    document.getElementById('modalTitle').textContent = 'Add New Case';
    resetForm();
    switchTab('info');
    document.getElementById('chargesDisplaySection').style.display = 'none';
    document.getElementById('caseModal').classList.add('active');
}

function openEditCaseModal(caseId) {
    currentCaseId = caseId;
    const caseData = cases.find(c => c.id === caseId);
    
    if (!caseData) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Case';
    resetForm();
    
    document.getElementById('clientName').value = caseData.clientName || '';
    document.getElementById('indictment').value = caseData.indictment || '';
    document.getElementById('courtDate').value = caseData.courtDate || '';
    document.getElementById('part').value = caseData.part || '';
    document.getElementById('onFor').value = caseData.onFor || '';
    document.getElementById('status').value = caseData.status || 'active';
    document.getElementById('arraignmentDate').value = caseData.arraignmentDate || '';
    document.getElementById('warrantDate').value = caseData.warrantDate || '';
    document.getElementById('readinessStated').checked = caseData.readinessStated || false;
    document.getElementById('readinessDate').value = caseData.readinessDate || '';
    document.getElementById('caseNotes').value = caseData.caseNotes || '';
    document.getElementById('addressInput').value = caseData.address || '';
    
    if (caseData.charges && caseData.charges.length > 0) {
        document.getElementById('chargesInput').value = caseData.charges.join('\n');
        displayCharges(caseData.charges);
    } else {
        document.getElementById('chargesDisplaySection').style.display = 'none';
    }
    
    handleStatusChange();
    handleReadinessChange();
    
    renderNotes(caseData.notes || []);
    renderTodos(caseData.todos || []);
    renderPhones(caseData.phones || []);
    renderEmails(caseData.emails || []);
    
    switchTab('info');
    document.getElementById('caseModal').classList.add('active');
}

function displayCharges(charges) {
    const section = document.getElementById('chargesDisplaySection');
    const list = document.getElementById('chargesDisplayList');
    
    list.innerHTML = '';
    charges.forEach(charge => {
        const item = document.createElement('div');
        item.className = 'charge-item';
        item.textContent = charge;
        list.appendChild(item);
    });
    
    section.style.display = 'block';
}

function handleStatusChange() {
    const status = document.getElementById('status').value;
    const warrantDateGroup = document.getElementById('warrantDateGroup');
    
    if (status === 'warrant') {
        warrantDateGroup.style.display = 'block';
    } else {
        warrantDateGroup.style.display = 'none';
    }
}

function handleReadinessChange() {
    const isChecked = document.getElementById('readinessStated').checked;
    const readinessDateGroup = document.getElementById('readinessDateGroup');
    
    if (isChecked) {
        readinessDateGroup.style.display = 'block';
    } else {
        readinessDateGroup.style.display = 'none';
    }
}

function addNote() {
    const noteInput = document.getElementById('noteInput');
    const noteText = noteInput.value.trim();
    
    if (!noteText) {
        showToast('Please enter a note', 'error');
        return;
    }
    
    const caseData = currentCaseId ? cases.find(c => c.id === currentCaseId) : null;
    
    if (!caseData && !currentCaseId) {
        return;
    }
    
    if (caseData) {
        if (!caseData.notes) caseData.notes = [];
        caseData.notes.push({
            id: generateId(),
            text: noteText,
            timestamp: new Date().toISOString()
        });
        saveCases();
        renderNotes(caseData.notes);
    }
    
    noteInput.value = '';
}

function renderNotes(notes) {
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    
    if (!notes || notes.length === 0) {
        notesList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No notes yet</p>';
        return;
    }
    
    notes.slice().reverse().forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.innerHTML = `
            <div class="note-header">
                <span class="note-timestamp">${formatDateTime(note.timestamp)}</span>
                <div class="item-actions">
                    <button class="action-btn delete" onclick="deleteNote('${note.id}')">🗑️</button>
                </div>
            </div>
            <div class="note-text">${escapeHtml(note.text)}</div>
        `;
        notesList.appendChild(noteItem);
    });
}

function deleteNote(noteId) {
    const caseData = cases.find(c => c.id === currentCaseId);
    if (!caseData) return;
    
    caseData.notes = caseData.notes.filter(n => n.id !== noteId);
    saveCases();
    renderNotes(caseData.notes);
}

function addTodo() {
    const todoInput = document.getElementById('todoInput');
    const todoDueDate = document.getElementById('todoDueDate');
    const todoText = todoInput.value.trim();
    
    if (!todoText) {
        showToast('Please enter a to-do', 'error');
        return;
    }
    
    const caseData = currentCaseId ? cases.find(c => c.id === currentCaseId) : null;
    
    if (!caseData && !currentCaseId) {
        return;
    }
    
    if (caseData) {
        if (!caseData.todos) caseData.todos = [];
        caseData.todos.push({
            id: generateId(),
            text: todoText,
            dueDate: todoDueDate.value || null,
            completed: false
        });
        saveCases();
        renderTodos(caseData.todos);
    }
    
    todoInput.value = '';
    todoDueDate.value = '';
}

function renderTodos(todos) {
    const todosList = document.getElementById('todosList');
    todosList.innerHTML = '';
    
    if (!todos || todos.length === 0) {
        todosList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No to-dos yet</p>';
        return;
    }
    
    todos.forEach(todo => {
        const todoItem = document.createElement('div');
        todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        todoItem.innerHTML = `
            <div class="todo-header">
                <span class="todo-due">${todo.dueDate ? formatDate(todo.dueDate) : 'No due date'}</span>
                <div class="item-actions">
                    <button class="action-btn" onclick="toggleTodo('${todo.id}')">${todo.completed ? '↩️' : '✓'}</button>
                    <button class="action-btn delete" onclick="deleteTodo('${todo.id}')">🗑️</button>
                </div>
            </div>
            <div class="todo-text">${escapeHtml(todo.text)}</div>
        `;
        todosList.appendChild(todoItem);
    });
}

function toggleTodo(todoId) {
    const caseData = cases.find(c => c.id === currentCaseId);
    if (!caseData) return;
    
    const todo = caseData.todos.find(t => t.id === todoId);
    if (todo) {
        todo.completed = !todo.completed;
        saveCases();
        renderTodos(caseData.todos);
    }
}

function deleteTodo(todoId) {
    const caseData = cases.find(c => c.id === currentCaseId);
    if (!caseData) return;
    
    caseData.todos = caseData.todos.filter(t => t.id !== todoId);
    saveCases();
    renderTodos(caseData.todos);
}

function addPhone() {
    const phoneInput = document.getElementById('phoneInput');
    const phoneNoteInput = document.getElementById('phoneNoteInput');
    const phoneValue = phoneInput.value.trim();
    
    if (!phoneValue) {
        showToast('Please enter a phone number', 'error');
        return;
    }
    
    const caseData = currentCaseId ? cases.find(c => c.id === currentCaseId) : null;
    
    if (!caseData && !currentCaseId) {
        return;
    }
    
    if (caseData) {
        if (!caseData.phones) caseData.phones = [];
        caseData.phones.push({
            id: generateId(),
            value: phoneValue,
            note: phoneNoteInput.value.trim()
        });
        saveCases();
        renderPhones(caseData.phones);
    }
    
    phoneInput.value = '';
    phoneNoteInput.value = '';
}

function renderPhones(phones) {
    const phonesList = document.getElementById('phonesList');
    phonesList.innerHTML = '';
    
    if (!phones || phones.length === 0) {
        phonesList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No phone numbers yet</p>';
        return;
    }
    
    phones.forEach(phone => {
        const phoneItem = document.createElement('div');
        phoneItem.className = 'contact-item';
        phoneItem.innerHTML = `
            <div class="contact-header">
                <div>
                    <div class="contact-value">${escapeHtml(phone.value)}</div>
                    ${phone.note ? `<div class="contact-note">${escapeHtml(phone.note)}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="action-btn delete" onclick="deletePhone('${phone.id}')">🗑️</button>
                </div>
            </div>
        `;
        phonesList.appendChild(phoneItem);
    });
}

function deletePhone(phoneId) {
    const caseData = cases.find(c => c.id === currentCaseId);
    if (!caseData) return;
    
    caseData.phones = caseData.phones.filter(p => p.id !== phoneId);
    saveCases();
    renderPhones(caseData.phones);
}

function addEmail() {
    const emailInput = document.getElementById('emailInput');
    const emailNoteInput = document.getElementById('emailNoteInput');
    const emailValue = emailInput.value.trim();
    
    if (!emailValue) {
        showToast('Please enter an email address', 'error');
        return;
    }
    
    const caseData = currentCaseId ? cases.find(c => c.id === currentCaseId) : null;
    
    if (!caseData && !currentCaseId) {
        return;
    }
    
    if (caseData) {
        if (!caseData.emails) caseData.emails = [];
        caseData.emails.push({
            id: generateId(),
            value: emailValue,
            note: emailNoteInput.value.trim()
        });
        saveCases();
        renderEmails(caseData.emails);
    }
    
    emailInput.value = '';
    emailNoteInput.value = '';
}

function renderEmails(emails) {
    const emailsList = document.getElementById('emailsList');
    emailsList.innerHTML = '';
    
    if (!emails || emails.length === 0) {
        emailsList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No email addresses yet</p>';
        return;
    }
    
    emails.forEach(email => {
        const emailItem = document.createElement('div');
        emailItem.className = 'contact-item';
        emailItem.innerHTML = `
            <div class="contact-header">
                <div>
                    <div class="contact-value">${escapeHtml(email.value)}</div>
                    ${email.note ? `<div class="contact-note">${escapeHtml(email.note)}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="action-btn delete" onclick="deleteEmail('${email.id}')">🗑️</button>
                </div>
            </div>
        `;
        emailsList.appendChild(emailItem);
    });
}

function deleteEmail(emailId) {
    const caseData = cases.find(c => c.id === currentCaseId);
    if (!caseData) return;
    
    caseData.emails = caseData.emails.filter(e => e.id !== emailId);
    saveCases();
    renderEmails(caseData.emails);
}

function saveCase() {
    const clientName = document.getElementById('clientName').value.trim();
    const indictment = document.getElementById('indictment').value.trim();
    
    if (!clientName || !indictment) {
        showToast('Please fill in required fields', 'error');
        return;
    }
    
    const chargesText = document.getElementById('chargesInput').value.trim();
    const charges = chargesText ? chargesText.split('\n').map(c => c.trim()).filter(c => c) : [];
    
    const caseData = {
        id: currentCaseId || generateId(),
        clientName,
        indictment,
        courtDate: document.getElementById('courtDate').value,
        part: document.getElementById('part').value.trim(),
        onFor: document.getElementById('onFor').value.trim(),
        status: document.getElementById('status').value,
        arraignmentDate: document.getElementById('arraignmentDate').value,
        warrantDate: document.getElementById('warrantDate').value,
        readinessStated: document.getElementById('readinessStated').checked,
        readinessDate: document.getElementById('readinessDate').value,
        charges,
        caseNotes: document.getElementById('caseNotes').value.trim(),
        address: document.getElementById('addressInput').value.trim()
    };
    
    if (currentCaseId) {
        const index = cases.findIndex(c => c.id === currentCaseId);
        const existingCase = cases[index];
        caseData.notes = existingCase.notes || [];
        caseData.todos = existingCase.todos || [];
        caseData.phones = existingCase.phones || [];
        caseData.emails = existingCase.emails || [];
        cases[index] = caseData;
    } else {
        caseData.notes = [];
        caseData.todos = [];
        caseData.phones = [];
        caseData.emails = [];
        cases.push(caseData);
    }
    
    saveCases();
    renderCases();
    closeModal();
    showToast('Case saved successfully', 'success');
}

function openDeleteModal(caseId) {
    caseToDelete = caseId;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    caseToDelete = null;
    document.getElementById('deleteModal').classList.remove('active');
}

function confirmDelete() {
    if (!caseToDelete) return;
    
    cases = cases.filter(c => c.id !== caseToDelete);
    saveCases();
    renderCases();
    closeDeleteModal();
    showToast('Case deleted successfully', 'success');
}

function closeModal() {
    document.getElementById('caseModal').classList.remove('active');
    document.getElementById('deleteModal').classList.remove('active');
}

function resetForm() {
    document.getElementById('clientName').value = '';
    document.getElementById('indictment').value = '';
    document.getElementById('courtDate').value = '';
    document.getElementById('part').value = '';
    document.getElementById('onFor').value = '';
    document.getElementById('status').value = 'active';
    document.getElementById('arraignmentDate').value = '';
    document.getElementById('warrantDate').value = '';
    document.getElementById('readinessStated').checked = false;
    document.getElementById('readinessDate').value = '';
    document.getElementById('chargesInput').value = '';
    document.getElementById('caseNotes').value = '';
    document.getElementById('addressInput').value = '';
    document.getElementById('noteInput').value = '';
    document.getElementById('todoInput').value = '';
    document.getElementById('todoDueDate').value = '';
    document.getElementById('phoneInput').value = '';
    document.getElementById('phoneNoteInput').value = '';
    document.getElementById('emailInput').value = '';
    document.getElementById('emailNoteInput').value = '';
    
    document.getElementById('notesList').innerHTML = '';
    document.getElementById('todosList').innerHTML = '';
    document.getElementById('phonesList').innerHTML = '';
    document.getElementById('emailsList').innerHTML = '';
    
    handleStatusChange();
    handleReadinessChange();
}

function emailTodaysCases() {
    const today = new Date().toISOString().split('T')[0];
    const todaysCases = cases.filter(c => c.courtDate === today && c.status !== 'closed');
    
    if (todaysCases.length === 0) {
        showToast('No cases scheduled for today', 'error');
        return;
    }
    
    let emailBody = `TODAY'S CASES - ${formatDate(today)}\n\n`;
    emailBody += '='.repeat(60) + '\n\n';
    
    todaysCases.forEach((caseData, index) => {
        emailBody += `${index + 1}. ${caseData.clientName}\n`;
        emailBody += `   Indictment: ${caseData.indictment}\n`;
        emailBody += `   Part: ${caseData.part || 'N/A'}\n`;
        emailBody += `   On For: ${caseData.onFor || 'N/A'}\n`;
        
        const deadline = caseData.arraignmentDate ? calculate3030Deadline(caseData) : 'N/A';
        emailBody += `   30.30 Deadline: ${deadline}\n`;
        
        if (caseData.phones && caseData.phones.length > 0) {
            emailBody += `   Contact:\n`;
            caseData.phones.forEach(phone => {
                emailBody += `     Phone: ${phone.value}`;
                if (phone.note) emailBody += ` (${phone.note})`;
                emailBody += '\n';
            });
        }
        
        if (caseData.emails && caseData.emails.length > 0) {
            caseData.emails.forEach(email => {
                emailBody += `     Email: ${email.value}`;
                if (email.note) emailBody += ` (${email.note})`;
                emailBody += '\n';
            });
        }
        
        emailBody += '\n';
    });
    
    const mailtoLink = `mailto:?subject=Today's Cases - ${formatDate(today)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
}

function printTodaysCases() {
    const today = new Date().toISOString().split('T')[0];
    const todaysCases = cases.filter(c => c.courtDate === today && c.status !== 'closed');
    
    if (todaysCases.length === 0) {
        showToast('No cases scheduled for today', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Today's Cases - ${formatDate(today)}</title>
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
            <h1>TODAY'S CASES - ${formatDate(today)}</h1>
    `;
    
    todaysCases.forEach((caseData, index) => {
        const deadline = caseData.arraignmentDate ? calculate3030Deadline(caseData) : 'N/A';
        
        html += `
            <div class="case">
                <div class="case-header">${index + 1}. ${escapeHtml(caseData.clientName)}</div>
                <div class="case-detail"><span class="label">Indictment:</span>${escapeHtml(caseData.indictment)}</div>
                <div class="case-detail"><span class="label">Part:</span>${escapeHtml(caseData.part || 'N/A')}</div>
                <div class="case-detail"><span class="label">On For:</span>${escapeHtml(caseData.onFor || 'N/A')}</div>
                <div class="case-detail"><span class="label">30.30 Deadline:</span>${deadline}</div>
        `;
        
        if (caseData.phones && caseData.phones.length > 0) {
            html += `<div class="case-detail"><span class="label">Contact:</span></div>`;
            caseData.phones.forEach(phone => {
                html += `<div class="case-detail" style="margin-left: 150px;">Phone: ${escapeHtml(phone.value)}`;
                if (phone.note) html += ` (${escapeHtml(phone.note)})`;
                html += `</div>`;
            });
        }
        
        if (caseData.emails && caseData.emails.length > 0) {
            caseData.emails.forEach(email => {
                html += `<div class="case-detail" style="margin-left: 150px;">Email: ${escapeHtml(email.value)}`;
                if (email.note) html += ` (${escapeHtml(email.note)})`;
                html += `</div>`;
            });
        }
        
        if (caseData.charges && caseData.charges.length > 0) {
            html += `<div class="charges"><div class="charges-title">Charges:</div>`;
            caseData.charges.forEach(charge => {
                html += `<div>• ${escapeHtml(charge)}</div>`;
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
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
