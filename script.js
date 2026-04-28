/* ===================================
   GLOBAL JAVASCRIPT - Public Pages
   =================================== */

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }
});

// College Signup Form
const collegeSignupForm = document.getElementById('collegeSignupForm');
if (collegeSignupForm) {
    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrength = document.getElementById('passwordStrength');

    // Password strength indicator
    if (passwordInput && passwordStrength) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;

            if (password.length >= 8) strength++;
            if (password.match(/[a-z]+/)) strength++;
            if (password.match(/[A-Z]+/)) strength++;
            if (password.match(/[0-9]+/)) strength++;
            if (password.match(/[$@#&!]+/)) strength++;

            const strengthLevels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
            const strengthColors = ['', '#ef4444', '#f59e0b', '#10b981', '#059669'];

            passwordStrength.textContent = strengthLevels[strength] || '';
            passwordStrength.style.background = strengthColors[strength] || '';
            passwordStrength.style.height = strength > 0 ? '4px' : '0';
            passwordStrength.style.width = (strength * 20) + '%';
            passwordStrength.style.transition = 'all 0.3s ease';
        });
    }

    collegeSignupForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validate passwords match
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        // Validate password strength
        if (password.length < 8) {
            alert('Password must be at least 8 characters long!');
            return;
        }

        const submitBtn = collegeSignupForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Registering...';
        }

        // Map frontend fields to backend JSON schema.
        const payload = {
            college_name: document.getElementById('collegeName').value.trim(),
            admin_name: document.getElementById('adminName').value.trim(),
            email: document.getElementById('officialEmail').value.trim(),
            password: password
        };

        fetch(`${API_BASE}/admin_register.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Registration failed.');
                }
                alert('College registered successfully! Redirecting to login...');
                window.location.href = 'college_login.html';
            })
            .catch((error) => {
                alert(error.message || 'Network error. Please try again.');
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText || 'Register College';
                }
            });
    });
}

// College Login Form
const collegeLoginForm = document.getElementById('collegeLoginForm');
if (collegeLoginForm) {
    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    collegeLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const submitBtn = collegeLoginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
        }

        // collegeCode is currently not used in backend auth.
        const payload = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };

        fetch(`${API_BASE}/admin_login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Login failed.');
                }
                alert('Login successful! Redirecting to admin dashboard...');
                window.location.href = 'admin_dashboard.html';
            })
            .catch((error) => {
                alert(error.message || 'Network error. Please try again.');
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText || 'Login to Dashboard';
                }
            });
    });
}

// Student Login Form
const studentLoginForm = document.getElementById('studentLoginForm');
if (studentLoginForm) {
    const API_BASE = `${window.location.origin}/SecondSemPro/api`;
    studentLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const submitBtn = studentLoginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
        }

        // Backend supports identifier + password login.
        const payload = {
            identifier: document.getElementById('identifier').value.trim(),
            password: document.getElementById('password').value
        };

        fetch(`${API_BASE}/student_login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Login failed.');
                }
                alert('Login successful! Redirecting to student dashboard...');
                window.location.href = 'student_dashboard.html';
            })
            .catch((error) => {
                alert(error.message || 'Network error. Please try again.');
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText || 'Login to Dashboard';
                }
            });
    });
}

// Form Validation Helper
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateForm(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.style.borderColor = '#ef4444';
        } else {
            input.style.borderColor = '';
        }
    });

    return isValid;
}

// Smooth Scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});