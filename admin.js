/* ===================================
   ADMIN PANEL JAVASCRIPT
   =================================== */

// Runtime data loaded from backend/API only.
let studentsData = [];
let candidatesData = [];
let electionConfig = {};

function getAppBasePath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts.length ? `/${parts[0]}` : '/SecondSemPro';
}

function getApiBase() {
    return `${window.location.origin}${getAppBasePath()}/api`;
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    clearLegacyDemoStorage();
    clearStaticDemoMarkup();
    loadDashboardData();
    setupEventListeners();
});

function loadDashboardData() {
    updateStats();
    loadRecentActivity();
}

function updateStats() {
    const totalStudentsEl = document.getElementById('totalStudents');
    const totalCandidatesEl = document.getElementById('totalCandidates');
    const activeElectionsEl = document.getElementById('activeElections');
    const votingPercentageEl = document.getElementById('votingPercentage');
    const electionStatusEl = document.getElementById('electionStatus');

    // Only run dashboard stat fetch on dashboard page.
    if (!totalStudentsEl || !totalCandidatesEl || !activeElectionsEl || !votingPercentageEl || !electionStatusEl) {
        return;
    }

    const API_BASE = getApiBase();
    fetch(`${API_BASE}/get_admin_dashboard.php`, {
        credentials: 'include'
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load dashboard stats.');
            }

            const stats = data.stats || {};
            totalStudentsEl.textContent = String(stats.total_students ?? 0);
            totalCandidatesEl.textContent = String(stats.total_candidates ?? 0);
            activeElectionsEl.textContent = String(stats.active_elections ?? 0);
            votingPercentageEl.textContent = `${Number(stats.turnout_percentage ?? 0).toFixed(2)}%`;

            const pendingTrend = document.querySelector('.stat-card.secondary .stat-trend');
            if (pendingTrend) {
                pendingTrend.textContent = `+${Number(stats.pending_candidates ?? 0)} pending`;
            }

            applyDashboardElectionStatus(data.latest_election || null);
        })
        .catch((error) => {
            console.error('Error loading dashboard stats:', error);
        });
}

function loadRecentActivity() {
    console.log('Recent activity is empty until backend integration.');
}

function applyDashboardElectionStatus(election) {
    const statusText = document.getElementById('electionStatus');
    const dateInfo = document.getElementById('electionDateInfo');
    const dot = document.querySelector('.status-dot');
    const timelineItems = document.querySelectorAll('.election-timeline .timeline-item');
    if (!statusText || !dateInfo) return;

    timelineItems.forEach((item) => item.classList.remove('active'));

    if (!election) {
        statusText.textContent = 'No Election Configured';
        dateInfo.textContent = 'Not scheduled yet';
        if (dot) dot.className = 'status-dot';
        return;
    }

    const status = String(election.status || '').toLowerCase();
    const isPublished = Number(election.published_results || 0) === 1;

    if (status === 'active') {
        statusText.textContent = 'Election Live';
        dateInfo.textContent = election.start_time
            ? `Started ${new Date(election.start_time).toLocaleString()}`
            : 'Live now';
        if (dot) dot.className = 'status-dot live';
        if (timelineItems[1]) timelineItems[1].classList.add('active');
        return;
    }

    if (status === 'ended' && isPublished) {
        statusText.textContent = 'Results Published';
        dateInfo.textContent = election.end_time
            ? `Ended ${new Date(election.end_time).toLocaleString()}`
            : 'Election completed';
        if (dot) dot.className = 'status-dot';
        if (timelineItems[3]) timelineItems[3].classList.add('active');
        return;
    }

    if (status === 'ended') {
        statusText.textContent = 'Voting Closed';
        dateInfo.textContent = election.end_time
            ? `Closed ${new Date(election.end_time).toLocaleString()}`
            : 'Voting closed';
        if (dot) dot.className = 'status-dot';
        if (timelineItems[2]) timelineItems[2].classList.add('active');
        return;
    }

    statusText.textContent = 'Election Not Started';
    dateInfo.textContent = election.start_time
        ? `Scheduled ${new Date(election.start_time).toLocaleString()}`
        : 'Not scheduled yet';
    if (dot) dot.className = 'status-dot';
    if (timelineItems[0]) timelineItems[0].classList.add('active');
}

let dashboardRefreshTimer = null;

function startDashboardAutoRefresh() {
    const totalStudentsEl = document.getElementById('totalStudents');
    const electionStatusEl = document.getElementById('electionStatus');
    if (!totalStudentsEl || !electionStatusEl) return;

    if (dashboardRefreshTimer) {
        clearInterval(dashboardRefreshTimer);
    }

    updateStats();
    dashboardRefreshTimer = window.setInterval(() => {
        updateStats();
    }, 15000);
}

function setupEventListeners() {
    // Filter buttons for candidates
    const filterBtns = document.querySelectorAll('.filter-btn, .filter-btn-modern');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const status = this.dataset.status;
            filterCandidates(status);
        });
    });
}

// ===================================
// STUDENT MANAGEMENT
// ===================================

function openAddStudentModal() {
    const modal = document.getElementById('addStudentModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeAddStudentModal() {
    const modal = document.getElementById('addStudentModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function loadStudents() {
    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    fetch(`${API_BASE}/get_students.php`, {
        credentials: 'include'
    })
        .then(async (response) => {
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to load students');
            }
            studentsData = Array.isArray(data.students) ? data.students : [];
            renderStudentsTable(studentsData);
        })
        .catch((error) => {
            console.error('Error loading students:', error);
        });
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#6b7280;">No students added yet.</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.register_number}</td>
            <td>${student.name}</td>
            <td>${student.email || '-'}</td>
            <td>${student.department || '-'}</td>
            <td>${student.program || '-'}</td>
            <td>${student.level || '-'}</td>
            <td>${student.gender || '-'}</td>
            <td><span class="status-badge ${student.is_active ? 'active' : 'inactive'}">${student.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-action" onclick="editStudent(${Number(student.id)})">Edit</button>
                <button class="btn-action btn-danger" onclick="deleteStudent(${Number(student.id)})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openUploadCSVModal() {
    const modal = document.getElementById('uploadCSVModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function showCredentialsModal(registerNo, password) {
    const modal = document.getElementById('credentialsModal');
    const regNoEl = document.getElementById('credRegisterNo');
    const passEl = document.getElementById('credPassword');

    if (regNoEl) regNoEl.textContent = registerNo;
    if (passEl) passEl.textContent = password;

    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeCredentialsModal() {
    const modal = document.getElementById('credentialsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function copyPassword() {
    const passEl = document.getElementById('credPassword');
    if (passEl) {
        navigator.clipboard.writeText(passEl.textContent).then(() => {
            alert('Password copied to clipboard!');
        });
    }
}

function closeUploadCSVModal() {
    const modal = document.getElementById('uploadCSVModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

// Add Student Form Submission
const addStudentForm = document.getElementById('addStudentForm');
if (addStudentForm) {
    addStudentForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const API_BASE = `${window.location.origin}/SecondSemPro/api`;
        const formData = new FormData(this);
        const studentData = {
            name: formData.get('name'),
            register_number: formData.get('registerNo'),
            email: formData.get('email'),
            department_id: parseInt(formData.get('department')),
            level: formData.get('level'),
            gender: formData.get('gender'),
            auto_generate_password: true
        };

        const submitBtn = addStudentForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding...';
        }

        fetch(`${API_BASE}/add_student.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(studentData)
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to add student.');
                }
                showCredentialsModal(data.register_number, data.generated_password);
                closeAddStudentModal();
                addStudentForm.reset();
                loadStudents();
            })
            .catch((error) => {
                alert(error.message || 'Network error. Please try again.');
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText || 'Add Student';
                }
            });
    });
}

function editStudent(studentId) {
    const student = studentsData.find((item) => Number(item.id) === Number(studentId));
    if (!student) {
        alert('Student not found.');
        return;
    }

    const name = prompt('Student name:', student.name || '');
    if (name === null) return;
    const email = prompt('Email:', student.email || '');
    if (email === null) return;
    const levelInput = prompt('Level (UG/PG):', student.level || 'UG');
    if (levelInput === null) return;
    const level = String(levelInput).trim().toUpperCase();
    if (level !== 'UG' && level !== 'PG') {
        alert('Level must be UG or PG.');
        return;
    }
    const gender = prompt('Gender (Male/Female/Other):', student.gender || 'Male');
    if (gender === null) return;
    const statusInput = prompt('Status (active/inactive):', Number(student.is_active) === 1 ? 'active' : 'inactive');
    if (statusInput === null) return;
    const normalizedStatus = String(statusInput).trim().toLowerCase();
    if (normalizedStatus !== 'active' && normalizedStatus !== 'inactive') {
        alert('Status must be active or inactive.');
        return;
    }

    const API_BASE = getApiBase();
    fetch(`${API_BASE}/update_student.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            student_id: Number(student.id),
            name: String(name).trim(),
            email: String(email).trim(),
            department_id: Number(student.department_id),
            level,
            gender: String(gender).trim(),
            is_active: normalizedStatus === 'active' ? 1 : 0
        })
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Could not update student.');
            }
            alert(data.message || 'Student updated successfully.');
            loadStudents();
        })
        .catch((error) => {
            alert(error.message || 'Network error. Please try again.');
        });
}

function deleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student?')) {
        const API_BASE = getApiBase();
        fetch(`${API_BASE}/delete_student.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ student_id: Number(studentId) })
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Could not delete student.');
                }
                alert(data.message || 'Student deleted successfully.');
                loadStudents();
            })
            .catch((error) => {
                alert(error.message || 'Network error. Please try again.');
            });
    }
}

// ===================================
// DEPARTMENT MANAGEMENT
// ===================================

// Backed by API data.
let departmentsData = [];

function resolveDepartmentActiveState(dept) {
    if (typeof dept?.is_active !== 'undefined' && dept?.is_active !== null) {
        return Number(dept.is_active) === 1 || dept.is_active === true || dept.is_active === '1';
    }
    if (typeof dept?.status === 'string') {
        return dept.status.toLowerCase() !== 'inactive';
    }
    // Older minimal schema has no active flag; treat as active by default.
    return true;
}

function openAddDepartmentModal() {
    const modal = document.getElementById('addDepartmentModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeAddDepartmentModal() {
    const modal = document.getElementById('addDepartmentModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function openEditDepartmentModal() {
    const modal = document.getElementById('editDepartmentModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeEditDepartmentModal() {
    const modal = document.getElementById('editDepartmentModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

// Add Department Form Submission
const addDepartmentForm = document.getElementById('addDepartmentForm');
if (addDepartmentForm) {
    addDepartmentForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const API_BASE = getApiBase();
        const formData = new FormData(this);
        const name = (formData.get('deptName') || '').toString().trim();
        if (!name) {
            alert('Department name is required.');
            return;
        }

        const submitBtn = addDepartmentForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding...';
        }

        fetch(`${API_BASE}/add_department.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                dept_code: (formData.get('deptCode') || '').toString().trim(),
                name,
                ug_programs: (formData.get('ugPrograms') || '').toString().trim(),
                pg_programs: (formData.get('pgPrograms') || '').toString().trim(),
                status: (formData.get('status') || 'active').toString().trim()
            })
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to add department.');
                }

                alert('Department added successfully!');
                closeAddDepartmentModal();
                this.reset();
                loadDepartments();
            })
            .catch((error) => {
                alert(error.message || 'Network error. Please try again.');
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText || 'Add Department';
                }
            });
    });
}

// Edit Department
function editDepartment(departmentId) {
    const dept = departmentsData.find(d => Number(d.id) === Number(departmentId));
    if (!dept) return;

    document.getElementById('editDeptCode').value = dept.id;
    document.getElementById('editDeptCodeDisplay').value = dept.dept_code || `DEPT-${dept.id}`;
    document.getElementById('editDeptName').value = dept.name;
    document.getElementById('editUgPrograms').value = dept.ug_programs || '';
    document.getElementById('editPgPrograms').value = dept.pg_programs || '';
    const statusNode = document.getElementById('editStatus');
    if (statusNode) statusNode.value = resolveDepartmentActiveState(dept) ? 'active' : 'inactive';

    openEditDepartmentModal();
}

// Edit Department Form Submission
const editDepartmentForm = document.getElementById('editDepartmentForm');
if (editDepartmentForm) {
    editDepartmentForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const API_BASE = getApiBase();
        const formData = new FormData(this);
        const departmentId = Number(document.getElementById('editDeptCode').value);
        const name = (formData.get('deptName') || '').toString().trim();

        if (!departmentId || !name) {
            alert('Department ID and name are required.');
            return;
        }

        fetch(`${API_BASE}/update_department.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                department_id: departmentId,
                dept_code: (document.getElementById('editDeptCodeDisplay')?.value || '').toString().trim(),
                name,
                ug_programs: (formData.get('ugPrograms') || '').toString().trim(),
                pg_programs: (formData.get('pgPrograms') || '').toString().trim(),
                status: (formData.get('status') || 'active').toString().trim()
            })
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to update department.');
                }
                alert('Department updated successfully!');
                closeEditDepartmentModal();
                loadDepartments();
            })
            .catch((error) => {
                alert(error.message || 'Network error. Please try again.');
            });
    });
}

// Delete Department
function deleteDepartment(departmentId) {
    if (confirm('Are you sure you want to delete this department? This may fail if students or positions are linked.')) {
        const API_BASE = getApiBase();
        fetch(`${API_BASE}/delete_department.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ department_id: Number(departmentId) })
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to delete department.');
                }
                alert('Department deleted successfully!');
                loadDepartments();
            })
            .catch((error) => {
                alert(error.message || 'Network error. Please try again.');
            });
    }
}

// Render Departments Table
function renderDepartments() {
    const tbody = document.getElementById('departmentTableBody');
    if (!tbody) return;
    const paginationInfo = document.querySelector('.pagination-info');

    if (!departmentsData.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#6b7280;">No departments added yet.</td></tr>';
        if (paginationInfo) paginationInfo.textContent = 'Showing 0-0 of 0 departments';
        return;
    }

    tbody.innerHTML = departmentsData.map((dept) => `
        <tr>
            <td>${dept.dept_code ? dept.dept_code : `DEPT-${dept.id}`}</td>
            <td>${dept.name}</td>
            <td>${dept.ug_programs || '-'}</td>
            <td>${dept.pg_programs || '-'}</td>
            <td>${typeof dept.student_count !== 'undefined' ? dept.student_count : '-'}</td>
            <td><span class="status-badge ${resolveDepartmentActiveState(dept) ? 'active' : 'inactive'}">${resolveDepartmentActiveState(dept) ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-action" onclick="editDepartment(${dept.id})">Edit</button>
                <button class="btn-action btn-danger" onclick="deleteDepartment(${dept.id})">Delete</button>
            </td>
        </tr>
    `).join('');

    if (paginationInfo) {
        const total = departmentsData.length;
        paginationInfo.textContent = `Showing 1-${total} of ${total} departments`;
    }
}

function loadDepartments() {
    const API_BASE = getApiBase();
    fetch(`${API_BASE}/get_departments.php`, {
        credentials: 'include'
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load departments.');
            }
            departmentsData = data.departments || [];
            renderDepartments();
        })
        .catch((error) => {
            console.error('Error loading departments:', error);
            const tbody = document.getElementById('departmentTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ef4444;">Failed to load departments.</td></tr>';
            }
            const paginationInfo = document.querySelector('.pagination-info');
            if (paginationInfo) paginationInfo.textContent = 'Showing 0-0 of 0 departments';
        });
}

function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput?.files?.[0];

    if (!file) {
        alert('Please select a CSV/XLSX file first!');
        return;
    }

    const API_BASE = getApiBase();
    const formData = new FormData();
    formData.append('students_file', file);

    const uploadBtn = document.querySelector('#uploadCSVModal .btn-submit[onclick="uploadCSV()"]');
    const originalText = uploadBtn ? uploadBtn.textContent : '';
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
    }

    fetch(`${API_BASE}/upload_students_csv.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Upload failed.');
            }

            const inserted = Number(data.inserted_count || 0);
            const skipped = Number(data.skipped_count || 0);
            const sampleErrors = Array.isArray(data.errors) ? data.errors.slice(0, 5) : [];
            const errorLines = sampleErrors.map((entry) => `- Row ${entry.row}: ${entry.message}`).join('\n');

            let message = `Upload complete.\nAdded: ${inserted}\nSkipped: ${skipped}`;
            if (errorLines) {
                message += `\n\nSome issues:\n${errorLines}`;
            }
            alert(message);

            closeUploadCSVModal();
            if (fileInput) fileInput.value = '';
            loadStudents();
        })
        .catch((error) => {
            alert(error.message || 'Network error. Please try again.');
        })
        .finally(() => {
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = originalText || 'Upload';
            }
        });
}

// Search functionality
const searchStudent = document.getElementById('searchStudent');
if (searchStudent) {
    searchStudent.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        console.log('Searching for:', searchTerm);
        // In production, would filter table rows
    });
}

// ===================================
// CANDIDATE MANAGEMENT
// ===================================

function filterCandidates(status) {
    console.log('Filtering candidates by status:', status);
    const candidateCards = document.querySelectorAll('.candidate-card');

    candidateCards.forEach(card => {
        if (status === 'all') {
            card.style.display = 'block';
        } else if (status === 'pending' && card.classList.contains('pending')) {
            card.style.display = 'block';
        } else if (status === 'approved' && card.classList.contains('approved')) {
            card.style.display = 'block';
        } else if (status === 'rejected' && card.classList.contains('rejected')) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function viewManifesto(candidateId) {
    event.preventDefault();
    console.log('Viewing manifesto for:', candidateId);

    const modal = document.getElementById('manifestoModal');
    if (modal) {
        document.getElementById('candidateName').textContent = 'No candidate selected';
        document.getElementById('candidatePosition').textContent = '-';
        document.getElementById('manifestoText').innerHTML = '<p>No manifesto data available.</p>';

        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeManifestoModal() {
    const modal = document.getElementById('manifestoModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function approveCandidate(candidateId) {
    if (confirm('Approve this candidate application?')) {
        console.log('Approving candidate:', candidateId);
        alert('Approve is disabled until backend approve API is connected.');
    }
}

function rejectCandidate(candidateId) {
    const reason = prompt('Enter reason for rejection (optional):');
    console.log('Rejecting candidate:', candidateId, 'Reason:', reason);
    alert('Reject is disabled until backend approve/reject API is connected.');
}

function revokeApproval(candidateId) {
    if (confirm('Revoke approval for this candidate?')) {
        console.log('Revoking approval:', candidateId);
        alert('Revoke is disabled until backend API is connected.');
    }
}

// ===================================
// ELECTION SETUP
// ===================================

function saveElectionSchedule() {
    const electionDate = document.getElementById('electionDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    if (!electionDate || !startTime || !endTime) {
        alert('Please fill in all required fields!');
        return;
    }

    const scheduleData = {
        date: electionDate,
        startTime: startTime,
        endTime: endTime
    };

    console.log('Saving election schedule:', scheduleData);
    alert('Election schedule saved successfully!');

    // Update preview
    updateDurationPreview(electionDate, startTime, endTime);
}

function updateDurationPreview(date, startTime, endTime) {
    const start = new Date(`${date} ${startTime}`);
    const end = new Date(`${date} ${endTime}`);
    const duration = (end - start) / (1000 * 60 * 60); // hours

    const preview = document.getElementById('durationPreview');
    if (preview) {
        preview.textContent = `Election will run for ${duration} hours on ${date}`;
    }
}

// Election date/time change listeners
const electionDateInput = document.getElementById('electionDate');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');

if (electionDateInput && startTimeInput && endTimeInput) {
    const updatePreview = () => {
        if (electionDateInput.value && startTimeInput.value && endTimeInput.value) {
            updateDurationPreview(electionDateInput.value, startTimeInput.value, endTimeInput.value);
        }
    };

    electionDateInput.addEventListener('change', updatePreview);
    startTimeInput.addEventListener('change', updatePreview);
    endTimeInput.addEventListener('change', updatePreview);
}

function setElectionStatus(status) {
    const confirmMessages = {
        upcoming: 'Set election status to Upcoming?',
        live: 'Start the election now? Students will be able to vote.',
        closed: 'Close the election? No more votes will be accepted.',
        published: 'Publish results? Results will be visible to all students.'
    };

    if (confirm(confirmMessages[status])) {
        console.log('Setting election status to:', status);
        alert(`Election status set to: ${status.toUpperCase()}`);

        // Update status display
        const statusDisplay = document.getElementById('statusConfigDisplay');
        if (statusDisplay) {
            statusDisplay.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            statusDisplay.className = `status-badge ${status}`;
        }
    }
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

// ===================================
// RESULTS MANAGEMENT
// ===================================

function publishResults() {
    const modal = document.getElementById('publishModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closePublishModal() {
    const modal = document.getElementById('publishModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function confirmPublish() {
    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    fetchLatestElection({ assignCurrent: false })
        .then(() => {
            const unpublishedElections = electionsCache
                .filter((item) => Number(item.published_results) !== 1)
                .sort((a, b) => Number(b.id) - Number(a.id));

            if (!unpublishedElections.length) {
                throw new Error('All configured elections are already published. No further publish action is needed.');
            }

            // Try each unpublished election until backend accepts one.
            // This avoids frontend status mismatches (e.g., legacy status labels).
            const tryPublishAt = (index, lastErrorMessage = '') => {
                if (index >= unpublishedElections.length) {
                    throw new Error(lastErrorMessage || 'No publishable election found. End the election first, then publish results.');
                }

                const election = unpublishedElections[index];
                return fetch(`${API_BASE}/publish_results.php`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ election_id: Number(election.id) })
                }).then(async (response) => {
                    const data = await response.json().catch(() => ({}));
                    if (response.ok && data.success) {
                        return data;
                    }
                    const detail = data.error ? ` (${data.error})` : '';
                    const message = (data.message || 'Could not publish results.') + detail;
                    return tryPublishAt(index + 1, message);
                });
            };

            return tryPublishAt(0);
        })
        .then(() => {
            const publishBtn = document.getElementById('publishResultsBtn');
            if (publishBtn) {
                publishBtn.textContent = '✅ Results Published';
                publishBtn.disabled = true;
                publishBtn.style.background = '#10b981';
            }
            const resultsStatus = document.getElementById('resultsStatus');
            if (resultsStatus) resultsStatus.textContent = 'Published';
            const overview = document.querySelector('.results-section p');
            if (overview) overview.textContent = 'Results are published and visible to students.';
            closePublishModal();
        })
        .catch((error) => alert(error.message || 'Network error.'));
}

function loadAdminResultsState() {
    const publishBtn = document.getElementById('publishResultsBtn');
    if (!publishBtn) return;

    fetchLatestElection({ assignCurrent: false })
        .then(() => {
            const publishedElection = electionsCache.find((item) => Number(item.published_results) === 1) || null;
            const hasUnpublished = electionsCache.some((item) => Number(item.published_results) !== 1);
            const resultsStatus = document.getElementById('resultsStatus');
            const overview = document.querySelector('.results-section p');
            const statValues = document.querySelectorAll('.results-stats .stat-card h3');

            if (publishedElection) {
                if (resultsStatus) resultsStatus.textContent = 'Published';
                if (overview) {
                    overview.textContent = `Results are published${publishedElection.title ? ` for "${publishedElection.title}"` : ''} and visible to students.`;
                }
            } else {
                if (resultsStatus) resultsStatus.textContent = 'Not Published';
                if (overview) {
                    overview.textContent = 'No result data available yet. Results will appear after election ends and vote data is processed.';
                }
                if (statValues[0]) statValues[0].textContent = '-';
                if (statValues[1]) statValues[1].textContent = '-';
                if (statValues[2]) statValues[2].textContent = '-';
            }

            if (!hasUnpublished) {
                publishBtn.textContent = '✅ Already Published';
                publishBtn.disabled = true;
                publishBtn.style.background = '#10b981';
            } else {
                publishBtn.textContent = '📢 Publish Results';
                publishBtn.disabled = false;
            }

            if (!publishedElection) return null;

            const API_BASE = `${window.location.origin}/SecondSemPro/api`;
            return fetch(`${API_BASE}/get_results.php?election_id=${publishedElection.id}`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
        })
        .then(async (response) => {
            if (!response) return;
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Could not load result summary.');
            }

            const statValues = document.querySelectorAll('.results-stats .stat-card h3');
            const overview = document.querySelector('.results-section p');

            if (statValues[0]) statValues[0].textContent = String(data.stats?.total_voters ?? 0);
            if (statValues[1]) statValues[1].textContent = String(data.stats?.votes_cast ?? 0);
            if (statValues[2]) statValues[2].textContent = `${Number(data.stats?.turnout_percentage ?? 0).toFixed(2)}%`;

            const rows = Array.isArray(data.results) ? data.results : [];
            if (!rows.length) {
                if (overview) {
                    overview.textContent = 'Results are published, but there are no approved candidates or vote totals for this election yet.';
                }
                return;
            }

            const groupedByPosition = rows.reduce((acc, item) => {
                const key = String(item.position_id);
                if (!acc[key]) {
                    acc[key] = {
                        positionName: item.position_name || 'Position',
                        winner: item
                    };
                }
                if (Number(item.total_votes || 0) > Number(acc[key].winner.total_votes || 0)) {
                    acc[key].winner = item;
                }
                return acc;
            }, {});
            const winners = Object.values(groupedByPosition);
            if (overview) {
                overview.innerHTML = winners.map((entry) =>
                    `<strong>${entry.positionName}:</strong> ${entry.winner.candidate_name} (${entry.winner.total_votes} votes)`
                ).join('<br>');
            }
        })
        .catch(() => {
            // Keep current UI as fallback.
        });
}

function exportResults() {
    const API_BASE = getApiBase();
    fetchLatestElection({ assignCurrent: false })
        .then(() => {
            const publishedElection = electionsCache
                .filter((item) => Number(item.published_results) === 1)
                .sort((a, b) => Number(b.id) - Number(a.id))[0];

            if (!publishedElection) {
                throw new Error('No published election found to export.');
            }

            const exportUrl = `${API_BASE}/export_results.php?election_id=${Number(publishedElection.id)}`;
            return fetch(exportUrl, {
                credentials: 'include',
                headers: { Accept: 'text/csv,application/json' }
            });
        })
        .then(async (response) => {
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Could not export results.');
            }

            const blob = await response.blob();
            const disposition = response.headers.get('Content-Disposition') || '';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            const filename = match && match[1] ? match[1] : 'election_results.csv';

            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
        })
        .catch((error) => {
            alert(error.message || 'Network error. Please try again.');
        });
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        event.target.classList.remove('active');
    }
});

// ESC key to close modals
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('active');
        });
    }
});

// ===================================
// PUBLIC CANDIDATES TOGGLE
// ===================================

let candidatesPublic = false;

function togglePublicView() {
    candidatesPublic = !candidatesPublic;

    const statusElement = document.getElementById('publicStatus');
    if (statusElement) {
        if (candidatesPublic) {
            statusElement.innerHTML = 'Currently: <span class="status-visible">Visible to Students</span>';
        } else {
            statusElement.innerHTML = 'Currently: <span class="status-hidden">Hidden from Students</span>';
        }
    }
    console.log('Candidates public status (session only):', candidatesPublic);
}

function clearLegacyDemoStorage() {
    try {
        localStorage.removeItem('currentStudent');
        localStorage.removeItem('candidatesPublic');
    } catch (error) {
        console.warn('Unable to clear legacy localStorage keys:', error);
    }
}

function clearStaticDemoMarkup() {
    // Admin dashboard: clear hardcoded activity items.
    const activityList = document.querySelector('.activity-list');
    if (activityList) {
        activityList.innerHTML = '<p style="color:#6b7280;">No activity yet. Actions will appear here after real operations.</p>';
    }

    // Admin dashboard: clear hardcoded final candidates preview.
    const finalPreview = document.getElementById('finalCandidatesPreview');
    if (finalPreview) {
        finalPreview.innerHTML = '<p style="color:#6b7280;">No approved candidates yet.</p>';
    }

    // Admin students page: clear static seeded table rows.
    const studentTableBody = document.getElementById('studentTableBody');
    if (studentTableBody) {
        studentTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#6b7280;">No students added yet.</td></tr>';
    }

    // Admin candidates page: clear static candidate cards and show empty state.
    const candidatesGrid = document.querySelector('.candidates-grid-modern');
    if (candidatesGrid) {
        candidatesGrid.innerHTML = '<div class="candidate-card-modern"><p style="color:#6b7280;">No candidate applications yet.</p></div>';
    }

    // Admin candidates page: reset seeded stat cards to zero.
    const statNumbers = document.querySelectorAll('.stat-info-modern h3');
    statNumbers.forEach((node) => {
        node.textContent = '0';
    });
}

let currentElection = null;
let electionsCache = [];

function formatElectionStatusLabel(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'draft') return 'UPCOMING';
    if (normalized === 'active') return 'LIVE';
    if (normalized === 'ended') return 'CLOSED';
    if (!normalized) return 'NOT SET';
    return normalized.toUpperCase();
}

function fetchLatestElection(options = {}) {
    const { assignCurrent = true } = options;
    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    return fetch(`${API_BASE}/get_elections.php`, {
        credentials: 'include'
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load elections.');
            }
            const elections = Array.isArray(data.elections) ? data.elections : [];
            electionsCache = elections;
            const latestElection = elections[0] || null;
            if (assignCurrent) {
                currentElection = latestElection;
            }
            return latestElection;
        });
}

function loadElectionSelector() {
    const select = document.getElementById('configuredElections');
    if (!select) return;
    const previousSelection = Number(select.value || currentElection?.id || 0);

    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    fetch(`${API_BASE}/get_elections.php`, {
        credentials: 'include'
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to load elections.');
            const elections = Array.isArray(data.elections) ? data.elections : [];
            electionsCache = elections;
            select.innerHTML = '<option value="">Create New Election</option>' +
                elections.map((item) => {
                    const startLabel = item.start_time ? new Date(item.start_time).toLocaleString() : 'No schedule';
                    return `<option value="${item.id}">${item.title} (${startLabel})</option>`;
                }).join('');
            const hasPreviousSelection = previousSelection > 0
                && elections.some((item) => Number(item.id) === previousSelection);
            select.value = hasPreviousSelection ? String(previousSelection) : '';
        })
        .catch(() => {
            select.innerHTML = '<option value="">Create New Election</option>';
        });
}

function resetElectionPageToBlank() {
    currentElection = null;

    document.getElementById('electionSetupForm')?.reset();

    const preview = document.getElementById('durationPreview');
    if (preview) preview.textContent = 'Select date and time to see duration';

    const statusDisplay = document.getElementById('statusConfigDisplay');
    if (statusDisplay) statusDisplay.textContent = 'Not Set';

    const topStatus = document.getElementById('currentStatus');
    if (topStatus) topStatus.textContent = 'Not Set';

    const dateNode = document.getElementById('scheduledDateConfig');
    if (dateNode) dateNode.textContent = 'Not scheduled';

    const durationNode = document.getElementById('votingDurationConfig');
    if (durationNode) durationNode.textContent = 'Not set';

    const positionsList = document.querySelector('.positions-list');
    if (positionsList) {
        positionsList.innerHTML = '<p style="color:#6b7280;">No positions configured yet.</p>';
    }
}

function populateElectionForm(electionId) {
    const election = electionsCache.find((item) => Number(item.id) === Number(electionId));
    if (!election) return;

    currentElection = election;
    const electionDateInput = document.getElementById('electionDate');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const reviewInput = document.getElementById('reviewDeadline');
    const titleInput = document.querySelector('input[name="electionTitle"]');
    const descInput = document.querySelector('textarea[name="description"]');

    if (titleInput) titleInput.value = election.title || '';
    if (descInput) descInput.value = election.description || '';

    if (election.start_time) {
        const start = new Date(election.start_time);
        const yyyy = start.getFullYear();
        const mm = String(start.getMonth() + 1).padStart(2, '0');
        const dd = String(start.getDate()).padStart(2, '0');
        const hh = String(start.getHours()).padStart(2, '0');
        const min = String(start.getMinutes()).padStart(2, '0');
        if (electionDateInput) electionDateInput.value = `${yyyy}-${mm}-${dd}`;
        if (startTimeInput) startTimeInput.value = `${hh}:${min}`;
    }

    if (election.end_time) {
        const end = new Date(election.end_time);
        const hh = String(end.getHours()).padStart(2, '0');
        const min = String(end.getMinutes()).padStart(2, '0');
        if (endTimeInput) endTimeInput.value = `${hh}:${min}`;
    }

    if (reviewInput && election.review_deadline_at) {
        const review = new Date(election.review_deadline_at);
        const yyyy = review.getFullYear();
        const mm = String(review.getMonth() + 1).padStart(2, '0');
        const dd = String(review.getDate()).padStart(2, '0');
        const hh = String(review.getHours()).padStart(2, '0');
        const min = String(review.getMinutes()).padStart(2, '0');
        reviewInput.value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }

    if (electionDateInput?.value && startTimeInput?.value && endTimeInput?.value) {
        updateDurationPreview(electionDateInput.value, startTimeInput.value, endTimeInput.value);
    }
    loadPositionsForElection(Number(election.id));
}

function loadCandidateApplications() {
    const container = document.querySelector('.candidates-grid-modern');
    if (!container) return;

    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    fetchLatestElection()
        .then((election) => {
            if (!election) {
                container.innerHTML = '<div class="candidate-card-modern"><p style="color:#6b7280;">No election configured yet.</p></div>';
                return null;
            }
            return fetch(`${API_BASE}/get_candidate_applications.php?election_id=${election.id}`, {
                credentials: 'include'
            });
        })
        .then(async (response) => {
            if (!response) return;
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load applications.');
            }
            candidatesData = data.applications || [];
            renderCandidateApplications('all');
            updateCandidateStats();
        })
        .catch((error) => {
            container.innerHTML = `<div class="candidate-card-modern"><p style="color:#ef4444;">${error.message || 'Failed to load candidate applications.'}</p></div>`;
        });
}

function updateCandidateStats() {
    const pending = candidatesData.filter((item) => item.status === 'pending').length;
    const approved = candidatesData.filter((item) => item.status === 'approved').length;
    const rejected = candidatesData.filter((item) => item.status === 'rejected').length;
    const total = candidatesData.length;

    const statNodes = document.querySelectorAll('.stat-info-modern h3');
    if (statNodes[0]) statNodes[0].textContent = String(pending);
    if (statNodes[1]) statNodes[1].textContent = String(approved);
    if (statNodes[2]) statNodes[2].textContent = String(rejected);
    if (statNodes[3]) statNodes[3].textContent = String(total);

    const filterButtons = document.querySelectorAll('.filter-btn-modern');
    filterButtons.forEach((button) => {
        const status = button.dataset.status;
        const countNode = button.querySelector('.filter-count');
        if (!countNode) return;
        if (status === 'all') countNode.textContent = String(total);
        if (status === 'pending') countNode.textContent = String(pending);
        if (status === 'approved') countNode.textContent = String(approved);
        if (status === 'rejected') countNode.textContent = String(rejected);
    });
}

function renderCandidateApplications(statusFilter) {
    const container = document.querySelector('.candidates-grid-modern');
    if (!container) return;

    const filtered = statusFilter === 'all'
        ? candidatesData
        : candidatesData.filter((item) => item.status === statusFilter);

    if (!filtered.length) {
        container.innerHTML = '<div class="candidate-card-modern"><p style="color:#6b7280;">No candidate applications found.</p></div>';
        return;
    }

    container.innerHTML = filtered.map((item) => {
        const statusClass = item.status === 'approved' ? 'approved' : item.status === 'rejected' ? 'rejected' : 'pending';
        const canReview = item.status === 'pending' && item.review_deadline_at && new Date(item.review_deadline_at) >= new Date();
        const studentLevel = String(item.level || '').toUpperCase() || '-';
        const studentDepartment = item.student_department_name || item.department_name || 'General';
        const studentMeta = `${studentDepartment} • ${studentLevel}`;
        const rejectBtn = canReview
            ? `<button class="btn-action btn-danger" onclick="rejectCandidate(${item.candidate_id})">Reject</button>`
            : '';
        const approveBtn = canReview
            ? `<button class="btn-action" onclick="approveCandidate(${item.candidate_id})">Approve</button>`
            : '';
        const reviewLabel = item.review_deadline_at
            ? `Review deadline: ${new Date(item.review_deadline_at).toLocaleString()}`
            : 'Review deadline not set';

        return `
            <div class="candidate-card-modern ${statusClass}">
                <h3>${item.student_name}</h3>
                <p>${item.register_number || '-'} • ${item.position_name}</p>
                <p style="color:#6b7280;">${studentMeta}</p>
                <p style="color:#6b7280;">${item.status.toUpperCase()}</p>
                <p style="color:#6b7280;font-size:12px;">${reviewLabel}</p>
                <div style="margin-top:12px;display:flex;gap:8px;">
                    <button class="btn-action" onclick="viewManifesto(${item.candidate_id}, event)">Manifesto</button>
                    ${approveBtn}
                    ${rejectBtn}
                </div>
            </div>
        `;
    }).join('');
}

function filterCandidates(status) {
    renderCandidateApplications(status || 'all');
}

function viewManifesto(candidateId, event) {
    if (event) event.preventDefault();
    const item = candidatesData.find((entry) => Number(entry.candidate_id) === Number(candidateId));
    const modal = document.getElementById('manifestoModal');
    if (!modal || !item) return;

    const candidateName = document.getElementById('candidateName');
    const candidatePosition = document.getElementById('candidatePosition');
    const candidateRegno = document.getElementById('candidateRegno');
    const manifestoText = document.getElementById('manifestoText');
    const manifestoPhoto = document.getElementById('manifestoPhoto');
    if (candidateName) candidateName.textContent = item.student_name || 'Candidate';
    if (candidatePosition) candidatePosition.textContent = item.position_name || '-';
    if (candidateRegno) candidateRegno.textContent = item.register_number || '-';
    if (manifestoText) manifestoText.innerHTML = `<p>${item.manifesto || 'No manifesto submitted.'}</p>`;
    if (manifestoPhoto) {
        if (item.photo_path) {
            const normalizedPath = String(item.photo_path).replace(/^\/+/, '');
            manifestoPhoto.src = `${window.location.origin}/SecondSemPro/${normalizedPath}`;
        } else {
            manifestoPhoto.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%234f46e5' width='80' height='80'/%3E%3Ctext x='50%25' y='50%25' font-size='30' fill='white' text-anchor='middle' dy='.3em'%3E?%3C/text%3E%3C/svg%3E";
        }
    }

    modal.style.display = 'flex';
    modal.classList.add('active');
}

function approveCandidate(candidateId) {
    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    fetch(`${API_BASE}/approve_candidate.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: Number(candidateId), action: 'approve' })
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Could not approve candidate.');
            loadCandidateApplications();
        })
        .catch((error) => alert(error.message || 'Network error.'));
}

function rejectCandidate(candidateId) {
    const reason = prompt('Enter reason for rejection (optional):') || '';
    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    fetch(`${API_BASE}/approve_candidate.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: Number(candidateId), action: 'reject', rejection_reason: reason })
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Could not reject candidate.');
            loadCandidateApplications();
        })
        .catch((error) => alert(error.message || 'Network error.'));
}

function publishFinalCandidates() {
    if (!currentElection) {
        alert('Configure an election first.');
        return;
    }

    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    fetch(`${API_BASE}/publish_candidates.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ election_id: Number(currentElection.id) })
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Could not publish final candidate list.');
            alert('Final candidate list published. Students can now view candidates.');
            loadCandidateApplications();
        })
        .catch((error) => alert(error.message || 'Network error.'));
}

function saveElectionSchedule() {
    const electionDate = document.getElementById('electionDate')?.value;
    const startTime = document.getElementById('startTime')?.value;
    const endTime = document.getElementById('endTime')?.value;
    const title = document.querySelector('input[name="electionTitle"]')?.value?.trim() || 'College Union Election';
    const description = document.querySelector('textarea[name="description"]')?.value?.trim() || '';
    const reviewDeadline = document.getElementById('reviewDeadline')?.value;

    if (!electionDate || !startTime || !endTime || !reviewDeadline) {
        alert('Please fill election date, start/end time, and review deadline.');
        return;
    }

    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    const selectedElectionId = Number(document.getElementById('configuredElections')?.value || 0);
    fetch(`${API_BASE}/configure_election.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            election_id: selectedElectionId > 0 ? selectedElectionId : null,
            title,
            description,
            election_date: electionDate,
            start_time: startTime,
            end_time: endTime,
            review_deadline_at: reviewDeadline
        })
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Could not configure election.');
            alert(data.message || 'Election saved successfully.');
            loadElectionPageState();
            loadElectionSelector();
        })
        .catch((error) => alert(error.message || 'Network error.'));
}

function setElectionStatus(status) {
    if (!currentElection) {
        alert('Configure an election first.');
        return;
    }

    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    let endpoint = '';
    if (status === 'upcoming') endpoint = 'set_election_upcoming.php';
    if (status === 'live') endpoint = 'start_election.php';
    if (status === 'closed') endpoint = 'end_election.php';
    if (status === 'published') endpoint = 'publish_results.php';
    if (!endpoint) return;

    fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ election_id: Number(currentElection.id) })
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update election status.');
            alert(data.message || 'Election status updated.');
            loadElectionPageState();
        })
        .catch((error) => alert(error.message || 'Network error.'));
}

function loadElectionPageState() {
    const statusDisplay = document.getElementById('statusConfigDisplay');
    const topStatus = document.getElementById('currentStatus');
    if (!statusDisplay && !topStatus) return;
    const select = document.getElementById('configuredElections');
    const selectedElectionId = Number(select?.value || currentElection?.id || 0);

    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    Promise.all([
        fetchLatestElection({ assignCurrent: false }),
        fetch(`${API_BASE}/get_students.php`, { credentials: 'include' }).then((res) => res.json().catch(() => ({}))),
    ])
        .then(([election, studentsDataResponse]) => {
            const totalStudents = document.getElementById('totalStudentsConfig');
            if (totalStudents) {
                totalStudents.textContent = String((studentsDataResponse.students || []).length || 0);
            }
            if (!selectedElectionId) {
                resetElectionPageToBlank();
                return;
            }

            const selectedElection = electionsCache.find((item) => Number(item.id) === selectedElectionId);
            if (!selectedElection) {
                resetElectionPageToBlank();
                return;
            }

            if (select) select.value = String(selectedElectionId);
            populateElectionForm(selectedElectionId);

            const statusLabel = formatElectionStatusLabel(selectedElection.status);
            if (statusDisplay) statusDisplay.textContent = statusLabel;
            if (topStatus) topStatus.textContent = statusLabel;

            const dateNode = document.getElementById('scheduledDateConfig');
            if (dateNode) {
                dateNode.textContent = selectedElection.start_time
                    ? new Date(selectedElection.start_time).toLocaleString()
                    : 'Not scheduled';
            }

            const durationNode = document.getElementById('votingDurationConfig');
            if (durationNode) {
                if (selectedElection.start_time && selectedElection.end_time) {
                    const diffMs = new Date(selectedElection.end_time) - new Date(selectedElection.start_time);
                    durationNode.textContent = `${Math.max(0, Math.round(diffMs / (1000 * 60 * 60)))} hours`;
                } else {
                    durationNode.textContent = 'Not set';
                }
            }
        })
        .catch(() => {
            // Keep graceful empty state
            resetElectionPageToBlank();
        });
}

function addSeatToElection() {
    if (!currentElection) {
        alert('Configure an election first.');
        return;
    }

    const nameInput = document.getElementById('positionName');
    const scopeSelect = document.getElementById('positionScope');
    const departmentSelect = document.getElementById('positionDepartment');
    const name = nameInput?.value?.trim() || '';
    const scope = scopeSelect?.value || 'general';
    const departmentId = Number(departmentSelect?.value || 0);

    if (!name) {
        alert('Position name is required.');
        return;
    }

    if (scope === 'department' && departmentId <= 0) {
        alert('Please select a department for department seat.');
        return;
    }

    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    fetch(`${API_BASE}/add_position.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            election_id: Number(currentElection.id),
            name,
            scope,
            department_id: scope === 'department' ? departmentId : null
        })
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Could not add seat.');
            if (nameInput) nameInput.value = '';
            loadPositionsForElection(Number(currentElection.id));
        })
        .catch((error) => alert(error.message || 'Network error.'));
}

function addDefaultGeneralSeats() {
    if (!currentElection) {
        alert('Configure an election first.');
        return;
    }

    const defaultSeats = [
        'Chairman',
        'Vice Chairman',
        'Arts Secretary',
        'UCCM Lady Rep',
        'Magazine Editor',
        'Arts Club Secretary'
    ];

    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    Promise.all(defaultSeats.map((seatName) => {
        return fetch(`${API_BASE}/add_position.php`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                election_id: Number(currentElection.id),
                name: seatName,
                scope: 'general'
            })
        })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                return { seatName, success: false, message: data.message || 'Failed to add seat' };
            }
            return { seatName, success: true };
        });
    }))
        .then((results) => {
            const successCount = results.filter((item) => item.success).length;
            const failed = results.filter((item) => !item.success);
            loadPositionsForElection(Number(currentElection.id));
            if (!failed.length) {
                alert(`Added ${successCount} recommended seats.`);
                return;
            }
            alert(`Added ${successCount} seat(s). Some were skipped: ${failed.map((item) => `${item.seatName} (${item.message})`).join(', ')}`);
        })
        .catch((error) => alert(error.message || 'Network error.'));
}

function loadPositionsForElection(electionId) {
    const list = document.querySelector('.positions-list');
    if (!list || !electionId) return;

    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    fetch(`${API_BASE}/get_positions.php?election_id=${electionId}`, {
        credentials: 'include'
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to load seats.');
            const positions = Array.isArray(data.positions) ? data.positions : [];
            if (!positions.length) {
                list.innerHTML = '<p style="color:#6b7280;">No positions configured yet.</p>';
                return;
            }
            list.innerHTML = positions.map((position) => {
                const scopeLabel = position.scope === 'department'
                    ? `Department Seat (${position.department_name || 'Unknown Department'})`
                    : 'General Seat';
                return `<div class="config-item"><span class="config-label">${position.name}</span><span class="config-value">${scopeLabel}</span></div>`;
            }).join('');
        })
        .catch((error) => {
            list.innerHTML = `<p style="color:#ef4444;">${error.message || 'Failed to load positions.'}</p>`;
        });
}

// ===================================
// PAGE INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    // Load students if on student management page
    if (document.getElementById('studentTableBody')) {
        loadStudents();
    }

    // Load departments if on department management page
    if (document.getElementById('departmentTableBody')) {
        loadDepartments();
    }

    // Load departments for dropdowns
    loadDepartmentsForSelect();

    if (document.querySelector('.candidates-grid-modern')) {
        loadCandidateApplications();
    }

    if (document.getElementById('electionSetupForm')) {
        loadElectionPageState();
        loadElectionSelector();
        const scopeSelect = document.getElementById('positionScope');
        const deptSelect = document.getElementById('positionDepartment');
        const electionsSelect = document.getElementById('configuredElections');
        if (scopeSelect && deptSelect) {
            const updateDeptState = () => {
                const isDeptSeat = scopeSelect.value === 'department';
                deptSelect.disabled = !isDeptSeat;
                if (!isDeptSeat) deptSelect.value = '';
            };
            scopeSelect.addEventListener('change', updateDeptState);
            updateDeptState();
        }
        if (electionsSelect) {
            electionsSelect.addEventListener('change', () => {
                const selectedId = Number(electionsSelect.value || 0);
                if (!selectedId) {
                    resetElectionPageToBlank();
                    return;
                }
                populateElectionForm(selectedId);

                const selectedElection = electionsCache.find((item) => Number(item.id) === selectedId);
                const statusLabel = formatElectionStatusLabel(selectedElection?.status);
                const statusDisplay = document.getElementById('statusConfigDisplay');
                const topStatus = document.getElementById('currentStatus');
                if (statusDisplay) statusDisplay.textContent = statusLabel;
                if (topStatus) topStatus.textContent = statusLabel;

                const dateNode = document.getElementById('scheduledDateConfig');
                if (dateNode) {
                    dateNode.textContent = selectedElection?.start_time
                        ? new Date(selectedElection.start_time).toLocaleString()
                        : 'Not scheduled';
                }

                const durationNode = document.getElementById('votingDurationConfig');
                if (durationNode) {
                    if (selectedElection?.start_time && selectedElection?.end_time) {
                        const diffMs = new Date(selectedElection.end_time) - new Date(selectedElection.start_time);
                        durationNode.textContent = `${Math.max(0, Math.round(diffMs / (1000 * 60 * 60)))} hours`;
                    } else {
                        durationNode.textContent = 'Not set';
                    }
                }
            });
        }
    }

    if (document.getElementById('publishResultsBtn')) {
        loadAdminResultsState();
    }

    startDashboardAutoRefresh();
});

function loadDepartmentsForSelect() {
    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    fetch(`${API_BASE}/get_departments.php`, {
        credentials: 'include'
    })
        .then(async (response) => {
            const data = await response.json();
            if (!data.success) return;

            // Update student department dropdown
            const studentDept = document.getElementById('studentDepartment');
            if (studentDept) {
                studentDept.innerHTML = '<option value="">Select Department</option>' +
                    data.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
            }

            // Update filter dropdown
            const filterDept = document.getElementById('departmentFilter');
            if (filterDept) {
                filterDept.innerHTML = '<option value="">All Departments</option>' +
                    data.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
            }

            const positionDept = document.getElementById('positionDepartment');
            if (positionDept) {
                positionDept.innerHTML = '<option value="">Select Department</option>' +
                    data.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
            }
        })
        .catch((error) => {
            console.error('Error loading departments:', error);
        });
}
