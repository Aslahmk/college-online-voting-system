# College Online Voting Backend (PHP + MySQL)

This backend is designed for XAMPP (`Apache + MySQL`) and uses:
- `password_hash()` / `password_verify()` for passwords
- PDO prepared statements for SQL injection prevention
- session-based authentication for admin and student logins

## 1) Folder Structure

```text
SecondSemPro/
├── api/
│   ├── add_department.php
│   ├── add_position.php
│   ├── add_student.php
│   ├── admin_login.php
│   ├── admin_logout.php
│   ├── admin_register.php
│   ├── apply_candidate.php
│   ├── approve_candidate.php
│   ├── create_election.php
│   ├── delete_department.php
│   ├── end_election.php
│   ├── get_candidate_applications.php
│   ├── get_candidates.php
│   ├── get_departments.php
│   ├── get_elections.php
│   ├── get_positions.php
│   ├── get_results.php
│   ├── get_students.php
│   ├── publish_results.php
│   ├── start_election.php
│   ├── student_login.php
│   ├── student_logout.php
│   ├── update_department.php
│   └── vote.php
├── config/
│   ├── bootstrap.php
│   └── database.php
├── middleware/
│   └── auth.php
├── sql/
│   └── schema.sql
└── utils/
    ├── election.php
    └── response.php
```

## 2) Database Setup (XAMPP)

1. Start `Apache` and `MySQL` in XAMPP.
2. Open `phpMyAdmin`.
3. Import `sql/schema.sql`.
4. Update DB credentials in `config/database.php` if required.

Default credentials used:
- host: `127.0.0.1`
- db: `college_voting`
- user: `root`
- password: `` (empty)

## 3) Authentication Flow

- **Admin registration/login** stores admin session keys:
  - `$_SESSION['admin_id']`
- **Student login** stores student session keys:
  - `$_SESSION['student_id']`
  - `$_SESSION['student_department_id']`

Protected endpoints check sessions via `middleware/auth.php`.

## 4) Election and Voting Logic

- Only one election can be `active` at a time.
- Students can apply as candidates only during active election.
- Candidate approval is required before visibility in voting.
- Department positions are restricted by student department.
- Vote insertion uses unique key `(election_id, position_id, voter_ref)` to prevent duplicate voting per position.
- Results API returns aggregated vote counts only (no voter mapping is exposed).

## 5) Core API Endpoints (JSON)

Base URL example: `http://localhost/SecondSemPro/api`

### Admin
- `POST /admin_register.php`
- `POST /admin_login.php`
- `POST /admin_logout.php`

### Departments
- `POST /add_department.php`
- `GET /get_departments.php`
- `POST /update_department.php`
- `POST /delete_department.php`

### Students
- `POST /add_student.php`
- `GET /get_students.php`
- `POST /student_login.php`
- `POST /student_logout.php`

### Elections & Positions
- `POST /create_election.php`
- `POST /start_election.php`
- `POST /end_election.php`
- `GET /get_elections.php`
- `POST /add_position.php`
- `GET /get_positions.php?election_id=1`

### Candidate Workflow
- `POST /apply_candidate.php`
- `POST /approve_candidate.php`
- `GET /get_candidate_applications.php?election_id=1`
- `GET /get_candidates.php`

### Voting & Results
- `POST /vote.php`
- `POST /publish_results.php`
- `GET /get_results.php?election_id=1`

## 6) Example JSON Requests

### Admin Register
`POST /admin_register.php`
```json
{
  "college_name": "ABC Engineering College",
  "admin_name": "Election Officer",
  "email": "admin@abc.edu",
  "password": "Admin@123"
}
```

### Admin Login
`POST /admin_login.php`
```json
{
  "email": "admin@abc.edu",
  "password": "Admin@123"
}
```

### Add Department
`POST /add_department.php`
```json
{
  "name": "Computer Science"
}
```

### Add Student (Auto Password)
`POST /add_student.php`
```json
{
  "name": "Ravi Kumar",
  "register_number": "CSE2026001",
  "department_id": 1,
  "email": "ravi@abc.edu",
  "auto_generate_password": true
}
```

### Student Login
`POST /student_login.php`
```json
{
  "register_number": "CSE2026001",
  "password": "STD123456"
}
```

### Create Election
`POST /create_election.php`
```json
{
  "title": "Student Council Election 2026",
  "description": "General and department representative election"
}
```

### Add Position (General)
`POST /add_position.php`
```json
{
  "election_id": 1,
  "name": "Chairman",
  "scope": "general"
}
```

### Add Position (Department)
`POST /add_position.php`
```json
{
  "election_id": 1,
  "name": "Department Representative",
  "scope": "department",
  "department_id": 1
}
```

### Start Election
`POST /start_election.php`
```json
{
  "election_id": 1
}
```

### Apply Candidate
`POST /apply_candidate.php`
```json
{
  "position_id": 2,
  "manifesto": "I will improve communication and student activities."
}
```

### Approve Candidate
`POST /approve_candidate.php`
```json
{
  "candidate_id": 5,
  "action": "approve"
}
```

### Cast Vote
`POST /vote.php`
```json
{
  "candidate_id": 5
}
```

### Publish Results
`POST /publish_results.php`
```json
{
  "election_id": 1
}
```

### Get Results
`GET /get_results.php?election_id=1`

## 7) Frontend Integration Notes

- Send request body as JSON with header `Content-Type: application/json`.
- Keep cookies/session enabled so login sessions persist.
- Handle `success: false` responses to show error messages.

## 8) Important Privacy Note

The backend stores a one-way hashed `voter_ref` (derived from election + student + server secret) to enforce one vote per position without storing direct voter identity in vote rows. Set `VOTE_ANON_SALT` in the server environment (and avoid keeping the default fallback value in production).  
Result APIs return aggregated counts only; they do not expose who voted for whom.

## 9) Result Archive + Cleanup

When admin publishes results (`publish_results.php`), the backend now:
- archives final per-candidate totals into `election_result_snapshots`,
- archives turnout/statistics into `election_result_stats`,
- then removes old operational election data for that election (`positions`, cascading `candidates` and `votes`, and `election_workflow`).

This keeps student-visible results available while clearing old candidate/vote runtime data.
