/* ===================================
   STUDENT PANEL JAVASCRIPT
   =================================== */

const API_BASE = `${window.location.origin}/SecondSemPro/api`;

// Starts blank: values loaded from backend/session only.
let currentStudent = {
    id: null,
    name: '',
    registerNo: '',
    email: '',
    department: '',
    departmentId: null,
    level: '',
    gender: '',
    hasVoted: false,
    hasApplied: false
};

let electionData = {
    status: 'upcoming',
    startTime: null,
    endTime: null,
    countdownElement: null
};
let myApplications = [];
let ballotSelections = {};
let votingCandidates = [];
let activeVotingElection = null;
let canCastVotes = false;
let votingStateLabel = 'Closed';

// Initialize on every student page
document.addEventListener('DOMContentLoaded', function() {
    clearLegacyDemoStorage();
    clearStaticDemoMarkup();
    authenticateAndLoad();
    setupStudentListeners();
    startElectionCountdown();
    checkPublicCandidates();
    initCandidateApplyPage();
    initVotingPage();
    initStudentResultsPage();
});

// ---------- AUTHENTICATION ----------

function authenticateAndLoad() {
    fetch(`${API_BASE}/get_current_student.php`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
    .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || !data.success) {
            window.location.href = 'student_login.html';
            return;
        }

        if (data.student) {
            currentStudent = {
                id: data.student.id,
                name: data.student.name || '',
                registerNo: data.student.register_number || '',
                email: data.student.email || '',
                department: data.student.department_name || '',
                departmentId: data.student.department_id,
                level: data.student.level || '',
                gender: data.student.gender || '',
                hasVoted: false,
                hasApplied: false
            };
            loadStudentData();
        }
    })
    .catch(() => {
        window.location.href = 'student_login.html';
    });
}

// ---------- DATA LOADING ----------

function loadStudentData() {
    // Update common topbar elements (present on dashboard & profile)
    const studentNameEl = document.getElementById('studentName');
    if (studentNameEl) {
        studentNameEl.textContent = currentStudent.name || 'Student';
    }

    const welcomeNameEl = document.getElementById('welcomeName');
    if (welcomeNameEl) {
        welcomeNameEl.textContent = currentStudent.name || 'Student';
    }

    const avatarEl = document.getElementById('studentAvatar');
    if (avatarEl) {
        avatarEl.textContent = getInitials(currentStudent.name) || 'S';
    }

    // Dashboard profile summary
    const regNumberEl = document.getElementById('regNumber');
    if (regNumberEl) {
        regNumberEl.textContent = currentStudent.registerNo || '-';
    }

    const departmentEl = document.getElementById('department');
    if (departmentEl) {
        departmentEl.textContent = currentStudent.department || '-';
    }

    const levelEl = document.getElementById('level');
    if (levelEl) {
        const levelValue = (currentStudent.level || '').toLowerCase();
        levelEl.textContent = currentStudent.level || '-';
        levelEl.className = `level-badge ${levelValue || 'ug'}`;
    }

    const emailEl = document.getElementById('email');
    if (emailEl) {
        emailEl.textContent = currentStudent.email || '-';
    }

    // Profile page fields
    const fullNameEl = document.getElementById('fullName');
    if (fullNameEl) {
        fullNameEl.value = currentStudent.name || '';
    }

    const registerNumberEl = document.getElementById('registerNumber');
    if (registerNumberEl) {
        registerNumberEl.value = currentStudent.registerNo || '';
    }

    const emailAddressEl = document.getElementById('emailAddress');
    if (emailAddressEl) {
        emailAddressEl.value = currentStudent.email || '';
    }

    const deptNameEl = document.getElementById('deptName');
    if (deptNameEl) {
        deptNameEl.value = currentStudent.department || '';
    }

    const studyLevelEl = document.getElementById('studyLevel');
    if (studyLevelEl) {
        studyLevelEl.value = currentStudent.level || 'UG';
    }

    const genderEl = document.getElementById('gender');
    if (genderEl) {
        genderEl.value = currentStudent.gender || 'Male';
    }

    // Update voting status
    updateVotingStatus();
    loadElectionStatus();
    loadMyApplications();

    // Keep empty until schedule is loaded from backend.
    const countdownEl = document.getElementById('electionCountdown');
    if (countdownEl) {
        countdownEl.textContent = 'Not Scheduled';
    }

    // Keep participation at zero until results/votes are loaded.
    const participationEl = document.getElementById('participation');
    if (participationEl) {
        participationEl.textContent = '0%';
    }
}

function loadMyApplications() {
    fetch(`${API_BASE}/get_my_applications.php`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
    .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) return;
        myApplications = Array.isArray(data.applications) ? data.applications : [];
        currentStudent.hasApplied = myApplications.length > 0;
        updateVotingStatus();
        renderApplicationStatusCard();
    })
    .catch(() => {
        // Keep default empty state.
    });
}

function getInitials(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function updateVotingStatus() {
    const statusEl = document.getElementById('votingStatus');
    const candidateStatusEl = document.getElementById('candidateStatus');

    if (statusEl) {
        statusEl.textContent = currentStudent.hasVoted ? 'Voted ✅' : 'Not Voted Yet';
        statusEl.style.color = currentStudent.hasVoted ? '#10b981' : '#6b7280';
    }

    if (candidateStatusEl) {
        const approvedCount = myApplications.filter((item) => item.status === 'approved').length;
        const pendingCount = myApplications.filter((item) => item.status === 'pending').length;
        const rejectedCount = myApplications.filter((item) => item.status === 'rejected').length;
        if (approvedCount > 0) {
            candidateStatusEl.textContent = 'Approved ✅';
            candidateStatusEl.style.color = '#10b981';
        } else if (pendingCount > 0) {
            candidateStatusEl.textContent = 'Under Review ⏳';
            candidateStatusEl.style.color = '#f59e0b';
        } else if (rejectedCount > 0) {
            candidateStatusEl.textContent = 'Rejected ❌';
            candidateStatusEl.style.color = '#ef4444';
        } else {
            candidateStatusEl.textContent = 'Not Applied Yet';
            candidateStatusEl.style.color = '#6b7280';
        }
    }

    const votingHintEl = document.getElementById('votingHint');
    if (votingHintEl) {
        votingHintEl.textContent = currentStudent.hasVoted ? 'Vote completed' : 'Waiting for active election';
    }

    const candidateHintEl = document.getElementById('candidateHint');
    if (candidateHintEl) {
        const latest = myApplications[0];
        if (!latest) {
            candidateHintEl.textContent = 'No active application';
        } else if (latest.status === 'approved') {
            candidateHintEl.textContent = `Approved for ${latest.position_name}`;
        } else if (latest.status === 'rejected') {
            candidateHintEl.textContent = latest.rejection_reason
                ? `Rejected: ${latest.rejection_reason}`
                : `Rejected for ${latest.position_name}`;
        } else {
            candidateHintEl.textContent = `Pending review for ${latest.position_name}`;
        }
    }
}

function renderApplicationStatusCard() {
    const statusCard = document.getElementById('statusCard');
    if (!statusCard) return;

    const latest = myApplications[0];
    if (!latest) {
        statusCard.style.display = 'none';
        return;
    }

    statusCard.style.display = 'block';
    const statusClass = latest.status === 'approved'
        ? 'approved'
        : latest.status === 'rejected'
            ? 'rejected'
            : 'pending';
    const statusLabel = latest.status ? latest.status.toUpperCase() : 'PENDING';
    const appliedAt = latest.applied_at ? new Date(latest.applied_at).toLocaleString() : '-';

    const header = statusCard.querySelector('.status-header-modern');
    const headerNote = statusCard.querySelector('.status-header-modern p');
    const detailValues = statusCard.querySelectorAll('.status-details .value');
    const badge = statusCard.querySelector('.status-details .badge-modern');
    const withdrawBtn = statusCard.querySelector('button');

    if (header) header.className = `status-header-modern ${statusClass}`;
    if (headerNote) {
        if (latest.status === 'approved') {
            headerNote.textContent = `Approved for ${latest.position_name}.`;
        } else if (latest.status === 'rejected') {
            headerNote.textContent = latest.rejection_reason
                ? `Rejected: ${latest.rejection_reason}`
                : 'Your application was rejected.';
        } else {
            headerNote.textContent = `Pending admin review for ${latest.position_name}.`;
        }
    }
    if (detailValues[0]) detailValues[0].textContent = latest.position_name || '-';
    if (detailValues[1]) detailValues[1].textContent = appliedAt;
    if (badge) {
        badge.className = `badge-modern ${statusClass}`;
        badge.textContent = statusLabel;
    }
    if (withdrawBtn) {
        if (latest.status === 'pending') {
            withdrawBtn.style.display = 'inline-block';
            withdrawBtn.disabled = false;
            withdrawBtn.textContent = 'Withdraw Application';
        } else {
            withdrawBtn.style.display = 'none';
        }
    }
}

// ---------- ELECTION COUNTDOWN ----------

function startElectionCountdown() {
    const timeRemainingEl = document.getElementById('timeRemaining');
    if (!timeRemainingEl) return;

    electionData.countdownElement = timeRemainingEl;

    function updateCountdown() {
        if (!electionData.endTime) {
            timeRemainingEl.textContent = 'Not Scheduled';
            timeRemainingEl.style.color = '#6b7280';
            return;
        }

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

function loadElectionStatus() {
    fetch(`${API_BASE}/get_elections.php`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
    .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) return;

        const elections = Array.isArray(data.elections) ? data.elections : [];
        const activeElection = elections.find((e) => e.status === 'active');
        const upcomingElection = elections.find((e) => e.status === 'draft');
        const latestElection = activeElection || upcomingElection || elections[0] || null;

        applyElectionStatus(latestElection);
    })
    .catch(() => {
        applyElectionStatus(null);
    });
}

function applyElectionStatus(election) {
    const electionStatusText = document.getElementById('electionStatusText');
    const electionStatusDescription = document.getElementById('electionStatusDescription');
    const electionStatusDot = document.getElementById('electionStatusDot');
    const electionStartedAt = document.getElementById('electionStartedAt');
    const electionEndsAt = document.getElementById('electionEndsAt');
    const electionCountdown = document.getElementById('electionCountdown');
    const electionBadge = document.getElementById('electionBadge');
    const castVoteBtn = document.getElementById('castVoteBtn');

    if (!election) {
        currentStudent.hasVoted = false;
        updateVotingStatus();
        if (electionStatusText) electionStatusText.textContent = 'No election configured';
        if (electionStatusDescription) electionStatusDescription.textContent = 'Admin has not started an election yet.';
        if (electionStatusDot) electionStatusDot.style.background = '#9ca3af';
        if (electionStartedAt) electionStartedAt.textContent = '-';
        if (electionEndsAt) electionEndsAt.textContent = '-';
        if (electionCountdown) electionCountdown.textContent = 'Not Scheduled';
        if (electionBadge) electionBadge.textContent = 'NO ELECTION';
        if (castVoteBtn) castVoteBtn.style.display = 'none';
        return;
    }

    const start = election.start_time ? new Date(election.start_time) : null;
    const end = election.end_time ? new Date(election.end_time) : null;
    electionData.startTime = start;
    electionData.endTime = end;

    if (electionStartedAt) electionStartedAt.textContent = start ? start.toLocaleString() : '-';
    if (electionEndsAt) electionEndsAt.textContent = end ? end.toLocaleString() : '-';

    if (election.status === 'active') {
        if (electionStatusText) electionStatusText.textContent = `Live: ${election.title}`;
        if (electionStatusDescription) electionStatusDescription.textContent = 'Voting is currently active.';
        if (electionStatusDot) electionStatusDot.style.background = '#ef4444';
        if (electionBadge) electionBadge.textContent = 'LIVE';
        if (castVoteBtn) castVoteBtn.style.display = 'inline-block';
    } else if (election.status === 'draft') {
        if (electionStatusText) electionStatusText.textContent = `Upcoming: ${election.title}`;
        if (electionStatusDescription) electionStatusDescription.textContent = 'Election is created but not started by admin.';
        if (electionStatusDot) electionStatusDot.style.background = '#f59e0b';
        if (electionBadge) electionBadge.textContent = 'UPCOMING';
        if (castVoteBtn) castVoteBtn.style.display = 'none';
    } else {
        if (electionStatusText) electionStatusText.textContent = `Closed: ${election.title}`;
        if (electionStatusDescription) electionStatusDescription.textContent = 'Election has ended.';
        if (electionStatusDot) electionStatusDot.style.background = '#6b7280';
        if (electionBadge) electionBadge.textContent = 'CLOSED';
        if (castVoteBtn) castVoteBtn.style.display = 'none';
    }

    // Sync real vote completion status for the currently visible election.
    fetchMyVoteStatus(Number(election.id));
}

function fetchMyVoteStatus(electionId) {
    if (!electionId) {
        currentStudent.hasVoted = false;
        updateVotingStatus();
        return;
    }

    fetch(`${API_BASE}/get_my_vote_status.php?election_id=${electionId}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
    .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
            currentStudent.hasVoted = false;
            updateVotingStatus();
            return;
        }
        currentStudent.hasVoted = Boolean(data.has_voted);
        updateVotingStatus();
    })
    .catch(() => {
        currentStudent.hasVoted = false;
        updateVotingStatus();
    });
}

// ---------- PUBLIC CANDIDATES ----------

function checkPublicCandidates() {
    // By default keep hidden until backend sends approved candidates.
    const candidatesPublic = false;
    const publicSection = document.getElementById('publicCandidatesSection');

    if (publicSection) {
        publicSection.style.display = candidatesPublic ? 'block' : 'none';
    }
}

// ---------- EVENT LISTENERS ----------

function setupStudentListeners() {
    // Logout button — call backend then redirect
    const logoutBtns = document.querySelectorAll('.btn-logout');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                fetch(`${API_BASE}/student_logout.php`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                })
                .finally(() => {
                    window.location.href = 'student_login.html';
                });
            }
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

// ---------- UTILITIES ----------

function clearLegacyDemoStorage() {
    try {
        localStorage.removeItem('currentStudent');
        localStorage.removeItem('candidatesPublic');
        localStorage.removeItem('studentData');
        localStorage.removeItem('student');
    } catch (error) {
        console.warn('Unable to clear legacy localStorage keys:', error);
    }
}

function clearStaticDemoMarkup() {
    // Hide seeded public candidates until backend provides real list.
    const publicGrid = document.getElementById('publicCandidatesGrid');
    if (publicGrid) {
        publicGrid.innerHTML = '<p style="color:#6b7280;">No approved candidates available yet.</p>';
    }
}

function previewPhoto(event) {
    const input = event?.target;
    const file = input?.files && input.files[0] ? input.files[0] : null;
    const previewImg = document.getElementById('photoImg');
    const previewWrap = document.getElementById('photoPreview');

    if (!file) {
        if (previewImg) previewImg.removeAttribute('src');
        return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        alert('Please upload JPG, PNG, WEBP or GIF image.');
        if (input) input.value = '';
        if (previewImg) previewImg.removeAttribute('src');
        return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('Photo must be 2MB or smaller.');
        if (input) input.value = '';
        if (previewImg) previewImg.removeAttribute('src');
        return;
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
        if (previewImg) previewImg.src = String(fileReader.result || '');
        if (previewWrap) previewWrap.classList.add('has-image');
    };
    fileReader.readAsDataURL(file);
}

function initCandidateApplyPage() {
    const form = document.getElementById('candidateApplicationForm');
    const positionSelect = document.getElementById('positionSelect');
    if (!form || !positionSelect) return;

    const infoBox = document.querySelector('.info-box');
    const submitBtn = form.querySelector('button[type="submit"]');
    let openElection = null;

    const setApplyDisabled = (disabled, message) => {
        positionSelect.disabled = disabled;
        if (submitBtn) submitBtn.disabled = disabled;
        if (message && infoBox) {
            infoBox.innerHTML = `<strong>Application Window:</strong><p style="margin-top:8px;">${message}</p>`;
        }
    };

    const isWomenOnlySeat = (positionName) => {
        const normalized = (positionName || '').toLowerCase();
        return normalized.includes('lady rep');
    };

    fetch(`${API_BASE}/get_elections.php`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to load election.');

            const elections = Array.isArray(data.elections) ? data.elections : [];
            const now = new Date();
            const latestConfigurableElection = elections.find((election) => election.status === 'draft' || election.status === 'active') || elections[0] || null;
            openElection = elections.find((election) => {
                if (!election.application_open_at || !election.review_deadline_at) return false;
                const openAt = new Date(election.application_open_at);
                const reviewDeadline = new Date(election.review_deadline_at);
                return (election.status === 'draft' || election.status === 'active') && now >= openAt && now <= reviewDeadline;
            }) || null;

            if (!latestConfigurableElection) {
                setApplyDisabled(true, 'No election configured yet.');
                positionSelect.innerHTML = '<option value="">No positions available</option>';
                return null;
            }

            if (!openElection) {
                const openAtText = latestConfigurableElection.application_open_at
                    ? new Date(latestConfigurableElection.application_open_at).toLocaleString()
                    : 'Not available';
                const closeAtText = latestConfigurableElection.review_deadline_at
                    ? new Date(latestConfigurableElection.review_deadline_at).toLocaleString()
                    : 'Not available';
                setApplyDisabled(true, `Applications are currently closed. Window: ${openAtText} to ${closeAtText}. Seats are shown below for reference.`);
            } else {
                const openAt = new Date(openElection.application_open_at);
                const reviewDeadline = new Date(openElection.review_deadline_at);
                setApplyDisabled(false, `Open from ${openAt.toLocaleString()} until ${reviewDeadline.toLocaleString()}.`);
            }

            return fetch(`${API_BASE}/get_positions.php?election_id=${latestConfigurableElection.id}`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
        })
        .then(async (response) => {
            if (!response) return;
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to load positions.');
            const positions = Array.isArray(data.positions) ? data.positions : [];
            const eligiblePositions = positions.filter((position) => {
                const isDeptSeat = position.scope === 'department';
                const sameDepartment = Number(position.department_id) === Number(currentStudent.departmentId);
                const isAllowedDept = !isDeptSeat || sameDepartment;

                const womenOnly = isWomenOnlySeat(position.name);
                const gender = (currentStudent.gender || '').toLowerCase();
                const isWomanStudent = gender === 'female' || gender === 'woman';
                const isAllowedGender = !womenOnly || isWomanStudent;

                return isAllowedDept && isAllowedGender;
            });

            if (!eligiblePositions.length) {
                positionSelect.innerHTML = '<option value="">No positions configured for this election</option>';
                setApplyDisabled(true, 'No eligible seats available for your profile (department/gender restrictions apply).');
                return;
            }
            positionSelect.innerHTML = '<option value="">Choose a position</option>' +
                eligiblePositions.map((position) => {
                    const suffix = position.scope === 'department' && position.department_name
                        ? ` (Department: ${position.department_name})`
                        : '';
                    return `<option value="${position.id}">${position.name}${suffix}</option>`;
                }).join('');
        })
        .catch((error) => {
            setApplyDisabled(true, error.message || 'Unable to load application settings.');
            positionSelect.innerHTML = '<option value="">No positions available</option>';
        });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!openElection) {
            alert('Application window is currently closed.');
            return;
        }

        const selectedPositionId = Number(positionSelect.value);
        if (!selectedPositionId) {
            alert('Please select a position.');
            return;
        }

        const manifesto = (document.getElementById('manifestoText')?.value || '').trim();
        const photoInput = document.getElementById('candidatePhoto');
        const photoFile = photoInput && photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;

        const payload = new FormData();
        payload.append('position_id', String(selectedPositionId));
        payload.append('manifesto', manifesto);
        if (photoFile) {
            payload.append('photo', photoFile);
        }
        fetch(`${API_BASE}/apply_candidate.php`, {
            method: 'POST',
            credentials: 'include',
            body: payload
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) throw new Error(data.message || 'Could not submit application.');
                const successModal = document.getElementById('successModal');
                if (successModal) {
                    successModal.style.display = 'flex';
                    successModal.classList.add('active');
                } else {
                    alert('Application submitted successfully.');
                }
                form.reset();
                loadMyApplications();
            })
            .catch((error) => {
                alert(error.message || 'Network error. Please try again.');
            });
    });
}

function withdrawApplication() {
    const latest = myApplications[0];
    if (!latest || Number(latest.candidate_id) <= 0) {
        alert('No application found to withdraw.');
        return;
    }
    if (latest.status !== 'pending') {
        alert('Only pending applications can be withdrawn.');
        return;
    }
    const confirmed = window.confirm(`Withdraw your application for ${latest.position_name}?`);
    if (!confirmed) return;

    fetch(`${API_BASE}/revoke_candidate_application.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: Number(latest.candidate_id) })
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Could not withdraw application.');
            }
            alert(data.message || 'Application withdrawn successfully.');
            loadMyApplications();
        })
        .catch((error) => {
            alert(error.message || 'Network error. Please try again.');
        });
}

function initVotingPage() {
    const votingForm = document.getElementById('votingForm');
    if (!votingForm) return;
    const title = document.querySelector('.admin-topbar-old h1');
    const timer = document.getElementById('votingTimer');

    fetch(`${API_BASE}/get_voting_ballot.php`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to load ballot.');
            activeVotingElection = data.election || null;
            canCastVotes = Boolean(data.can_vote);
            votingStateLabel = data.state_label || getVotingStatusLabel();
            if (title && activeVotingElection?.title) {
                title.textContent = canCastVotes
                    ? `Election Live: ${activeVotingElection.title} 🗳️`
                    : `Candidate List: ${activeVotingElection.title}`;
            }
            if (timer && activeVotingElection) {
                timer.textContent = getVotingStatusLabel();
            }
            votingCandidates = Array.isArray(data.candidates) ? data.candidates : [];
            renderVotingBallot(votingForm, votingCandidates, data.message || '');
            updateVotingTimer();
        })
        .catch((error) => {
            votingForm.innerHTML = `<div class="voting-section general-seats-card"><h3 class="section-title">No active ballot</h3><p class="section-desc">${error.message || 'Unable to load voting ballot.'}</p></div>`;
        });
}

function renderVotingBallot(votingForm, candidates, message) {
    if (!candidates.length) {
        const noBallotTitle = activeVotingElection ? `Election is ${votingStateLabel.toLowerCase()}` : 'No active ballot';
        votingForm.innerHTML = `<div class="voting-section general-seats-card"><h3 class="section-title">${noBallotTitle}</h3><p class="section-desc">${message || 'Voting is active, but there are no approved candidates available for your eligible seats yet.'}</p></div>`;
        const timer = document.getElementById('votingTimer');
        if (timer) timer.textContent = activeVotingElection ? votingStateLabel : 'Closed';
        return;
    }

    const grouped = candidates.reduce((acc, candidate) => {
        const key = `${candidate.position_id}`;
        if (!acc[key]) {
            acc[key] = {
                position_id: candidate.position_id,
                position_name: candidate.position_name,
                items: []
            };
        }
        acc[key].items.push(candidate);
        return acc;
    }, {});
    const groups = Object.values(grouped);
    ballotSelections = {};
    const votingMessage = canCastVotes
        ? '<p class="section-desc" style="color:#059669;margin-bottom:12px;">Voting is open. Select one candidate per position and submit.</p>'
        : '<p class="section-desc" style="color:#6b7280;margin-bottom:12px;">You can view candidates now. Voting will be enabled after admin starts election and within time window.</p>';

    votingForm.innerHTML = votingMessage + groups.map((group) => `
        <div class="voting-section general-seats-card">
            <h3 class="section-title">${group.position_name}</h3>
            <p class="section-desc">${canCastVotes ? 'Select one candidate' : 'Candidate list'}</p>
            ${group.items.map((item) => `
                <label style="display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:10px;cursor:pointer;">
                    <input type="radio" name="position_${group.position_id}" value="${item.candidate_id}" ${canCastVotes ? '' : 'disabled'} onchange="window.selectBallotCandidate(${group.position_id}, ${item.candidate_id})">
                    <div>
                        <strong>${item.candidate_name}</strong>
                        <p style="margin:4px 0;color:#6b7280;">${item.register_number} • ${item.department_name || 'General'}</p>
                        <button type="button" class="btn-secondary" onclick="window.showCandidateManifesto(${item.candidate_id})">View Manifesto</button>
                    </div>
                </label>
            `).join('')}
        </div>
    `).join('') + `
        <div style="margin-top:16px;">
            <button type="button" class="btn-primary btn-large" ${canCastVotes ? '' : 'disabled'} onclick="window.openVoteReviewModal()">Submit Votes</button>
        </div>
    `;

    updateVotingTimer();
}

function updateVotingTimer() {
    const timer = document.getElementById('votingTimer');
    if (!timer || !activeVotingElection) return;

    const update = () => {
        const statusLabel = getVotingStatusLabel();
        if (statusLabel !== 'Live') {
            timer.textContent = statusLabel;
            return;
        }

        if (!activeVotingElection?.end_time) {
            timer.textContent = 'Live';
            return;
        }

        const now = new Date();
        const end = new Date(activeVotingElection.end_time);
        const diff = end - now;
        if (diff <= 0) {
            timer.textContent = 'Closed';
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        timer.textContent = `${hours}h ${mins}m (Live)`;
    };
    update();
    setInterval(update, 60000);
}

function getVotingStatusLabel() {
    if (votingStateLabel && ['Live', 'Upcoming', 'Closed'].includes(votingStateLabel)) {
        return votingStateLabel;
    }
    if (!activeVotingElection) return 'Closed';
    const now = new Date();
    const start = activeVotingElection.start_time ? new Date(activeVotingElection.start_time) : null;
    const end = activeVotingElection.end_time ? new Date(activeVotingElection.end_time) : null;

    if (start && now < start) return 'Upcoming';
    if (end && now > end) return 'Closed';
    if (activeVotingElection.status === 'ended') return 'Closed';
    return canCastVotes ? 'Live' : 'Closed';
}

function initStudentResultsPage() {
    const resultsRoot = document.querySelector('.results-page');
    if (!resultsRoot) return;

    fetch(`${API_BASE}/get_elections.php`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to load elections.');
            const elections = Array.isArray(data.elections) ? data.elections : [];
            const publishedElection = elections.find((item) => Number(item.published_results) === 1);
            if (!publishedElection) {
                renderStudentResults([], null, 'Results are not published yet.');
                return null;
            }
            return fetch(`${API_BASE}/get_results.php?election_id=${publishedElection.id}`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
        })
        .then(async (response) => {
            if (!response) return;
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                renderStudentResults([], null, data.message || 'Results are not published yet.');
                return;
            }
            renderStudentResults(
                Array.isArray(data.results) ? data.results : [],
                data.election,
                '',
                data.stats || null
            );
        })
        .catch((error) => {
            renderStudentResults([], null, error.message || 'Unable to load results.');
        });
}

function renderStudentResults(results, election, message, stats = null) {
    const categoryTitle = document.querySelector('.results-category .category-title');
    const categoryBody = document.querySelector('.results-category .congratulations-box');
    const metaItems = document.querySelectorAll('.results-meta .meta-item');
    const statValues = document.querySelectorAll('.results-stats-student .stat-box h3');
    if (!categoryTitle || !categoryBody) return;

    if (!results.length) {
        categoryTitle.textContent = 'No published results';
        categoryBody.innerHTML = `<p>${message || 'Results will appear here after admin publishes them.'}</p>`;
        if (statValues[0]) statValues[0].textContent = '-';
        if (statValues[1]) statValues[1].textContent = '-';
        if (statValues[2]) statValues[2].textContent = '-';
        if (statValues[3]) statValues[3].textContent = '-';
        return;
    }

    const grouped = results.reduce((acc, item) => {
        const key = `${item.position_id}`;
        if (!acc[key]) {
            acc[key] = { position_name: item.position_name, rows: [] };
        }
        acc[key].rows.push(item);
        return acc;
    }, {});
    const groups = Object.values(grouped);
    const winners = groups.map((group) => {
        const sorted = [...group.rows].sort((a, b) => Number(b.total_votes) - Number(a.total_votes));
        return { position: group.position_name, winner: sorted[0] };
    });
    const totalVotes = results.reduce((sum, item) => sum + Number(item.total_votes || 0), 0);

    categoryTitle.textContent = election?.title ? `Published Results: ${election.title}` : 'Published Results';
    categoryBody.innerHTML = winners.map((entry) =>
        `<p><strong>${entry.position}:</strong> ${entry.winner.candidate_name} (${entry.winner.total_votes} votes)</p>`
    ).join('');

    if (metaItems[0]) metaItems[0].textContent = election?.title ? `📅 ${election.title}` : '📅 Published';
    if (metaItems[1]) metaItems[1].textContent = `🗳️ ${totalVotes} votes`;
    if (metaItems[2]) metaItems[2].textContent = `📊 ${winners.length} winners`;

    if (stats) {
        if (statValues[0]) statValues[0].textContent = String(stats.total_voters ?? 0);
        if (statValues[1]) statValues[1].textContent = String(stats.votes_cast ?? totalVotes);
        if (statValues[2]) statValues[2].textContent = `${Number(stats.turnout_percentage ?? 0).toFixed(2)}%`;
        if (statValues[3]) statValues[3].textContent = String(stats.winner_count ?? winners.length);
    } else {
        if (statValues[0]) statValues[0].textContent = '-';
        if (statValues[1]) statValues[1].textContent = String(totalVotes);
        if (statValues[2]) statValues[2].textContent = '-';
        if (statValues[3]) statValues[3].textContent = String(winners.length);
    }
}

function selectBallotCandidate(positionId, candidateId) {
    ballotSelections[String(positionId)] = Number(candidateId);
}

function openVoteReviewModal() {
    if (!canCastVotes) {
        alert('Voting is not open yet. You can view candidates now.');
        return;
    }
    const requiredPositions = [...new Set(votingCandidates.map((item) => String(item.position_id)))];
    const selectedCount = Object.keys(ballotSelections).length;
    if (selectedCount < requiredPositions.length) {
        alert('Please select one candidate for each position.');
        return;
    }

    const voteReview = document.getElementById('voteReview');
    if (voteReview) {
        voteReview.innerHTML = requiredPositions.map((positionId) => {
            const selectedCandidate = votingCandidates.find((item) =>
                String(item.position_id) === String(positionId) &&
                Number(item.candidate_id) === Number(ballotSelections[positionId])
            );
            return `<p><strong>${selectedCandidate?.position_name || 'Position'}:</strong> ${selectedCandidate?.candidate_name || '-'}</p>`;
        }).join('');
    }

    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function submitVote() {
    if (!canCastVotes) {
        alert('Voting is not open right now.');
        return;
    }
    const selections = Object.values(ballotSelections);
    if (!selections.length) {
        alert('No vote selections found.');
        return;
    }

    Promise.all(selections.map((candidateId) => fetch(`${API_BASE}/vote.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: Number(candidateId) })
    }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to cast vote.');
        }
        return data;
    })))
        .then(() => {
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal) {
                confirmModal.style.display = 'none';
                confirmModal.classList.remove('active');
            }
            const successModal = document.getElementById('successModal');
            if (successModal) {
                successModal.style.display = 'flex';
                successModal.classList.add('active');
            }
            currentStudent.hasVoted = true;
            updateVotingStatus();
            if (activeVotingElection?.id) {
                fetchMyVoteStatus(Number(activeVotingElection.id));
            }
        })
        .catch((error) => {
            alert(error.message || 'Could not submit votes.');
        });
}

function showCandidateManifesto(candidateId) {
    const candidate = votingCandidates.find((item) => Number(item.candidate_id) === Number(candidateId));
    if (!candidate) return;
    const modal = document.getElementById('manifestoModal');
    const photo = document.getElementById('manifestoCandidatePhoto');
    const name = document.getElementById('manifestoCandidateName');
    const reg = document.getElementById('manifestoCandidateReg');
    const dept = document.getElementById('manifestoCandidateDept');
    const content = document.getElementById('manifestoContent');
    if (photo) {
        if (candidate.photo_path) {
            const normalizedPath = String(candidate.photo_path).replace(/^\/+/, '');
            photo.src = `${window.location.origin}/SecondSemPro/${normalizedPath}`;
        } else {
            photo.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%234f46e5' width='80' height='80'/%3E%3Ctext x='50%25' y='50%25' font-size='30' fill='white' text-anchor='middle' dy='.3em'%3E?%3C/text%3E%3C/svg%3E";
        }
    }
    if (name) name.textContent = candidate.candidate_name || 'Candidate';
    if (reg) reg.textContent = candidate.register_number || '-';
    if (dept) dept.textContent = candidate.department_name || 'General';
    if (content) content.innerHTML = `<p>${candidate.manifesto || 'No manifesto submitted.'}</p>`;
    if (modal) {
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

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

window.selectBallotCandidate = selectBallotCandidate;
window.openVoteReviewModal = openVoteReviewModal;
window.submitVote = submitVote;
window.showCandidateManifesto = showCandidateManifesto;
window.closeManifestoModal = closeManifestoModal;
window.closeConfirmModal = closeConfirmModal;
window.previewPhoto = previewPhoto;
window.withdrawApplication = withdrawApplication;

// Export for other pages if needed
window.StudentUtils = {
    getCurrentStudent: () => currentStudent,
    updateStudentData: (data) => {
        Object.assign(currentStudent, data);
        loadStudentData();
    }
};

console.log('Student.js loaded with backend session integration');

