/* ===================================
   ADMIN PANEL JAVASCRIPT
   =================================== */

// Sample Data (In production, this would come from backend)
let studentsData = [];
let candidatesData = [];
let electionConfig = {};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    setupEventListeners();
});

function loadDashboardData() {
    // Simulate loading data
    updateStats();
    loadRecentActivity();
}

function updateStats() {
    const stats = {
        totalStudents: 234,
        totalCandidates: 12,
        activeElections: 1,
        votingPercentage: 65.3
    };

    const totalStudentsEl = document.getElementById('totalStudents');
    const totalCandidatesEl = document.getElementById('totalCandidates');
    const activeElectionsEl = document.getElementById('activeElections');
    const votingPercentageEl = document.getElementById('votingPercentage');

    if (totalStudentsEl) totalStudentsEl.textContent = stats.totalStudents;
    if (totalCandidatesEl) totalCandidatesEl.textContent = stats.totalCandidates;
    if (activeElectionsEl) activeElectionsEl.textContent = stats.activeElections;
    if (votingPercentageEl) votingPercentageEl.textContent = stats.votingPercentage + '%';
}

function loadRecentActivity() {
    // Activity data would be loaded from backend
    console.log('Recent activity loaded');
}

function setupEventListeners() {
    // Filter buttons for candidates
    const filterBtns = document.querySelectorAll('.filter-btn');
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

function openUploadCSVModal() {
    const modal = document.getElementById('uploadCSVModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
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

        const formData = new FormData(this);
        const studentData = {
            name: formData.get('name'),
            registerNo: formData.get('registerNo'),
            email: formData.get('email'),
            department: formData.get('department'),
            level: formData.get('level'),
            gender: formData.get('gender')
        };

        console.log('Adding student:', studentData);
        alert('Student added successfully!');
        closeAddStudentModal();
        this.reset();

        // In production, would refresh table data
    });
}

function editStudent(registerNo) {
    console.log('Editing student:', registerNo);
    alert('Edit student functionality - would open edit modal');
}

function deleteStudent(registerNo) {
    if (confirm('Are you sure you want to delete this student?')) {
        console.log('Deleting student:', registerNo);
        alert('Student deleted successfully!');
        // In production, would remove from table
    }
}

// ===================================
// DEPARTMENT MANAGEMENT
// ===================================

// Department data storage
let departmentsData = [
    { code: 'CS', name: 'Computer Science', ugPrograms: ['B.Tech', 'B.E.', 'BSc'], pgPrograms: ['M.Tech', 'M.Sc', 'MCA'], students: 156 },
    { code: 'EC', name: 'Electronics', ugPrograms: ['B.Tech', 'B.E.'], pgPrograms: ['M.Tech', 'M.Sc'], students: 98 },
    { code: 'ME', name: 'Mechanical Engineering', ugPrograms: ['B.Tech', 'B.E.'], pgPrograms: ['M.Tech'], students: 87 }
];

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

        const formData = new FormData(this);
        const newDept = {
            code: formData.get('deptCode').toUpperCase(),
            name: formData.get('deptName'),
            ugPrograms: formData.get('ugPrograms') ? formData.get('ugPrograms').split(',').map(p => p.trim()) : [],
            pgPrograms: formData.get('pgPrograms') ? formData.get('pgPrograms').split(',').map(p => p.trim()) : [],
            students: 0
        };

        // Check if department code already exists
        const exists = departmentsData.some(d => d.code === newDept.code);
        if (exists) {
            alert('Department with this code already exists!');
            return;
        }

        departmentsData.push(newDept);
        console.log('Adding department:', newDept);
        alert('Department added successfully!');
        closeAddDepartmentModal();
        this.reset();
        renderDepartments();
    });
}

// Edit Department
function editDepartment(deptCode) {
    const dept = departmentsData.find(d => d.code === deptCode);
    if (!dept) return;

    document.getElementById('editDeptCode').value = dept.code;
    document.getElementById('editDeptCodeDisplay').value = dept.code;
    document.getElementById('editDeptName').value = dept.name;
    document.getElementById('editUgPrograms').value = dept.ugPrograms.join(', ');
    document.getElementById('editPgPrograms').value = dept.pgPrograms.join(', ');

    openEditDepartmentModal();
}

// Edit Department Form Submission
const editDepartmentForm = document.getElementById('editDepartmentForm');
if (editDepartmentForm) {
    editDepartmentForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const deptCode = document.getElementById('editDeptCode').value;
        
        const deptIndex = departmentsData.findIndex(d => d.code === deptCode);
        if (deptIndex === -1) {
            alert('Department not found!');
            return;
        }

        departmentsData[deptIndex] = {
            code: deptCode,
            name: formData.get('deptName'),
            ugPrograms: formData.get('ugPrograms') ? formData.get('ugPrograms').split(',').map(p => p.trim()) : [],
            pgPrograms: formData.get('pgPrograms') ? formData.get('pgPrograms').split(',').map(p => p.trim()) : [],
            students: departmentsData[deptIndex].students
        };

        console.log('Updating department:', departmentsData[deptIndex]);
        alert('Department updated successfully!');
        closeEditDepartmentModal();
        renderDepartments();
    });
}

// Delete Department
function deleteDepartment(deptCode) {
    if (confirm(`Are you sure you want to delete the ${deptCode} department? This will also affect all students in this department.`)) {
        const deptIndex = departmentsData.findIndex(d => d.code === deptCode);
        if (deptIndex !== -1) {
            departmentsData.splice(deptIndex, 1);
            console.log('Deleting department:', deptCode);
            alert('Department deleted successfully!');
            renderDepartments();
        }
    }
}

// Render Departments Grid
function renderDepartments() {
    const grid = document.getElementById('departmentsGrid');
    if (!grid) return;

    let html = '';
    departmentsData.forEach(dept => {
        html += `
            <div class="candidate-card">
                <div class="candidate-status-badge success">Active</div>
                <h3 style="margin-bottom: 0.5rem;">${dept.name}</h3>
                <p class="candidate-dept" style="margin-bottom: 1rem;">Code: ${dept.code}</p>
                <div class="candidate-details">
                    <div class="detail-item">
                        <span class="detail-label">UG Programs:</span>
                        <span>${dept.ugPrograms.length} courses</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">PG Programs:</span>
                        <span>${dept.pgPrograms.length} courses</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Students:</span>
                        <span>${dept.students}</span>
                    </div>
                </div>
                <div class="candidate-actions">
                    <button class="btn-approve" onclick="editDepartment('${dept.code}')">Edit</button>
                    <button class="btn-reject" onclick="deleteDepartment('${dept.code}')">Delete</button>
                </div>
            </div>
        `;
    });

    // Add "Add New" card
    html += `
        <div class="candidate-card">
            <button class="btn-primary" style="width: 100%; margin-top: 1rem;" onclick="openAddDepartmentModal()">➕ Add New Department</button>
        </div>
    `;

    grid.innerHTML = html;
}

// Initialize departments on page load
document.addEventListener('DOMContentLoaded', function() {
    renderDepartments();
});

function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a CSV file first!');
        return;
    }

    console.log('Uploading CSV:', file.name);
    alert('CSV uploaded successfully! 25 students added.');
    closeUploadCSVModal();
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
        // In production, would load actual manifesto data
        document.getElementById('candidateName').textContent = 'Candidate Name';
        document.getElementById('candidatePosition').textContent = 'Position';
        document.getElementById('manifestoText').innerHTML = '<p>Full manifesto content would be displayed here...</p>';

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
        alert('Candidate approved successfully!');
        // In production, would update card status
        location.reload();
    }
}

function rejectCandidate(candidateId) {
    const reason = prompt('Enter reason for rejection (optional):');
    console.log('Rejecting candidate:', candidateId, 'Reason:', reason);
    alert('Candidate application rejected.');
    // In production, would update card status
    location.reload();
}

function revokeApproval(candidateId) {
    if (confirm('Revoke approval for this candidate?')) {
        console.log('Revoking approval:', candidateId);
        alert('Approval revoked.');
        location.reload();
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
    console.log('Publishing election results');
    alert('Results published successfully! Students can now view the results.');

    const publishBtn = document.getElementById('publishResultsBtn');
    if (publishBtn) {
        publishBtn.textContent = '✅ Results Published';
        publishBtn.disabled = true;
        publishBtn.style.background = '#10b981';
    }

    const resultsStatus = document.getElementById('resultsStatus');
    if (resultsStatus) {
        resultsStatus.textContent = 'Published';
    }

    closePublishModal();
}

function exportResults() {
    console.log('Exporting results report');
    alert('Results report exported successfully!');
    // In production, would generate and download PDF/Excel
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
            alert('✅ Candidates are now visible to students on their dashboard!');
        } else {
            statusElement.innerHTML = 'Currently: <span class="status-hidden">Hidden from Students</span>';
            alert('Candidates are now hidden from students.');
        }
    }
    
    localStorage.setItem('candidatesPublic', candidatesPublic);
    console.log('Candidates public status:', candidatesPublic);
}
