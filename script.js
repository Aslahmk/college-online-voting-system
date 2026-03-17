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

        // Get form data
        const formData = {
            collegeName: document.getElementById('collegeName').value,
            collegeCode: document.getElementById('collegeCode').value,
            adminName: document.getElementById('adminName').value,
            officialEmail: document.getElementById('officialEmail').value,
            password: password
        };

        console.log('College Signup Data:', formData);
        
        // Simulate successful signup
        alert('College registered successfully! Redirecting to login...');
        setTimeout(() => {
            window.location.href = 'college_login.html';
        }, 1000);
    });
}

// College Login Form
const collegeLoginForm = document.getElementById('collegeLoginForm');
if (collegeLoginForm) {
    collegeLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const loginData = {
            collegeCode: document.getElementById('collegeCode').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };

        console.log('College Login Data:', loginData);

        // Simulate successful login
        alert('Login successful! Redirecting to admin dashboard...');
        setTimeout(() => {
            window.location.href = 'admin_dashboard.html';
        }, 1000);
    });
}

// Student Login Form
const studentLoginForm = document.getElementById('studentLoginForm');
if (studentLoginForm) {
    studentLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const loginData = {
            identifier: document.getElementById('identifier').value,
            password: document.getElementById('password').value,
            securityCode: document.getElementById('securityCode').value
        };

        console.log('Student Login Data:', loginData);

        // Simulate successful login
        alert('Login successful! Redirecting to student dashboard...');
        setTimeout(() => {
            window.location.href = 'student_dashboard.html';
        }, 1000);
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