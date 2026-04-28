# Student Login Implementation Plan

## Steps:
- [x] 1. Create `api/get_current_student.php` — Returns current logged-in student profile (with department name JOIN), 401 if not logged in.
- [x] 2. Update `student.js` — Add auth guard on page load (fetch current student, redirect to login if 401), populate UI dynamically, fix logout to call backend API.
- [x] 3. Update `student_profile.html` — Adjust element IDs so `student.js` can inject live data (`fullName`, `registerNumber`, `emailAddress`, `deptName`, `studyLevel`, `gender`).
- [x] 4. Update `student_login.html` — Remove dead "Forgot password?" link.
- [x] 5. Add `studentName` / `studentAvatar` IDs to remaining student pages for consistent topbar updates.
- [x] 6. Test flow: login → dashboard shows real data → logout → redirect to login → unauthenticated access blocked.

**Progress: Complete**


