/* ===================================
   STUDENT PANEL JAVASCRIPT - Basics
   Referencing admin.js structure
   =================================== */

// Sample Student Data (In production, from backend/login session)
let currentStudent = {
    name: 'Arun',
    registerNo: 'CS001',
    email: 'arun@tkmce.ac.in',
    department: 'Computer Science',
    level: 'UG',
    gender: 'Male',
    hasVoted: false,
    hasApplied: false
};

let electionData = {
    status: 'live',
    startTime: new Date('2024-01-15T09:00:00'),
    endTime: new Date('2024-01-15T17:00:00'),
    countdownElement: null
};

// Initialize Student Dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadStudentData();
    setupStudentListeners();
    startElectionCountdown();
    checkPublicCandidates();
});

// Load student profile and stats data
function loadStudentData() {
    // Update profile elements
    const elements = {
        studentName: currentStudent.name,
        welcomeName: currentStudent.name,
        regNumber: currentStudent.registerNo,
        department: currentStudent.department,
        level: currentStudent.level,
        email: currentStudent.email
    };

    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });

    // Update level badge
    const levelEl = document.getElementById('level');
    if (levelEl) {
        levelEl.textContent = currentStudent.level;
        levelEl.className = `level-badge ${currentStudent.level.toLowerCase()}`;
    }

    // Update voting status
    updateVotingStatus();

    // Update election countdown display (placeholder)
    const countdownEl = document.getElementById('electionCountdown');
    if (countdownEl) {
        countdownEl.textContent = '2 Days Left'; // Mock, real from countdown
    }

    // Update participation (mock)
    const participationEl = document.getElementById('participation');
    if (participationEl) {
        participationEl.textContent = '65%';
    }
}

function updateVotingStatus() {
    const statusEl = document.getElementById('votingStatus');
    const candidateStatusEl = document.getElementById('candidateStatus');
    
    if (statusEl) {
        statusEl.textContent = currentStudent.hasVoted ? 'Voted ✅' : 'Not Voted';
        statusEl.style.color = currentStudent.hasVoted ? '#10b981' : '#ef4444';
    }
    
    if (candidateStatusEl) {
        candidateStatusEl.textContent = currentStudent.hasApplied ? 'Applied ✅' : 'Not Applied';
    }
}

// Real-time election countdown
function startElectionCountdown() {
    const timeRemainingEl = document.getElementById('timeRemaining');
    if (!timeRemainingEl) return;

    electionData.countdownElement = timeRemainingEl;

    function updateCountdown() {
        const now = new Date();
        const endTime = electionData.endTime;
        
        if (now >= endTime) {
            timeRemainingEl.textContent = 'Election Closed';
            timeRemainingEl.style.color = '#6b7280';
            return;
        }

        const diff = endTime - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        timeRemainingEl.textContent = `${hours}h ${minutes}m`;
    }

    updateCountdown();
    setInterval(updateCountdown, 60000); // Update every minute
}

// Check if admin made candidates public
function checkPublicCandidates() {
    const candidatesPublic = localStorage.getItem('candidatesPublic') === 'true';
    const publicSection = document.getElementById('publicCandidatesSection');
    
    if (publicSection) {
        publicSection.style.display = candidatesPublic ? 'block' : 'none';
    }
}

// Setup event listeners
function setupStudentListeners() {
    // Logout button
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('currentStudent');
                window.location.href = 'student_login.html';
            }
        });
    }

    // Profile links (simulate navigation)
    const profileLinks = document.querySelectorAll('a[href=\"student_profile.html\"]');
    profileLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Save current student data to localStorage for profile page
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
        });
    });

    // ESC to close any modals (future-proof)
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modals = document.querySelectorAll('.modal.active');
            modals.forEach(modal => {
                modal.style.display = 'none';
                modal.classList.remove('active');
            });
        }
    });
}

// Simulate voting status toggle (for demo)
function toggleVotingStatus() {
    currentStudent.hasVoted = !currentStudent.hasVoted;
    updateVotingStatus();
    console.log('Voting status toggled:', currentStudent.hasVoted);
}

// Export for other pages if needed
window.StudentUtils = {
    getCurrentStudent: () => currentStudent,
    updateStudentData: (data) => {
        Object.assign(currentStudent, data);
        loadStudentData();
    }
};

console.log('Student.js loaded successfully - Basics initialized');

