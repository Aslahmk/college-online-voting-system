CREATE DATABASE IF NOT EXISTS college_voting
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE college_voting;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  college_name VARCHAR(150) NOT NULL,
  admin_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  register_number VARCHAR(30) NOT NULL UNIQUE,
  department_id INT NOT NULL,
  email VARCHAR(150) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  security_code VARCHAR(100) NULL,
  level VARCHAR(10) NULL,
  gender VARCHAR(10) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS elections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  status ENUM('draft', 'active', 'ended') NOT NULL DEFAULT 'draft',
  start_time DATETIME NULL,
  end_time DATETIME NULL,
  published_results TINYINT(1) DEFAULT 0,
  created_by_admin_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_elections_admin
    FOREIGN KEY (created_by_admin_id) REFERENCES admins(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS election_workflow (
  election_id INT PRIMARY KEY,
  application_open_at DATETIME NOT NULL,
  review_deadline_at DATETIME NOT NULL,
  candidates_published TINYINT(1) DEFAULT 0,
  candidates_published_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_election
    FOREIGN KEY (election_id) REFERENCES elections(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  scope ENUM('general', 'department') NOT NULL,
  department_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_positions_election
    FOREIGN KEY (election_id) REFERENCES elections(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_positions_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  UNIQUE KEY uq_position_unique (election_id, name, department_id)
);

CREATE TABLE IF NOT EXISTS candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  student_id INT NOT NULL,
  position_id INT NOT NULL,
  manifesto TEXT NULL,
  photo_path VARCHAR(255) NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(255) NULL,
  reviewed_by_admin_id INT NULL,
  reviewed_at DATETIME NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_candidates_election
    FOREIGN KEY (election_id) REFERENCES elections(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_candidates_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_candidates_position
    FOREIGN KEY (position_id) REFERENCES positions(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_candidates_admin
    FOREIGN KEY (reviewed_by_admin_id) REFERENCES admins(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  UNIQUE KEY uq_student_one_application (election_id, student_id, position_id)
);

CREATE TABLE IF NOT EXISTS votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  position_id INT NOT NULL,
  candidate_id INT NOT NULL,
  voter_ref CHAR(64) NOT NULL,
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_votes_election
    FOREIGN KEY (election_id) REFERENCES elections(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_votes_position
    FOREIGN KEY (position_id) REFERENCES positions(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_votes_candidate
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  UNIQUE KEY uq_one_vote_per_position (election_id, position_id, voter_ref)
);

CREATE TABLE IF NOT EXISTS election_result_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  position_id INT NOT NULL,
  position_name VARCHAR(100) NOT NULL,
  scope ENUM('general', 'department') NOT NULL,
  department_name VARCHAR(100) NULL,
  candidate_id INT NULL,
  candidate_name VARCHAR(100) NOT NULL,
  register_number VARCHAR(30) NOT NULL,
  total_votes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_snapshot_election
    FOREIGN KEY (election_id) REFERENCES elections(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_snapshot_election_position (election_id, position_id),
  INDEX idx_snapshot_election_votes (election_id, total_votes)
);

CREATE TABLE IF NOT EXISTS election_result_stats (
  election_id INT PRIMARY KEY,
  total_voters INT NOT NULL DEFAULT 0,
  votes_cast INT NOT NULL DEFAULT 0,
  unique_voters INT NOT NULL DEFAULT 0,
  turnout_percentage DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  winner_count INT NOT NULL DEFAULT 0,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_result_stats_election
    FOREIGN KEY (election_id) REFERENCES elections(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
