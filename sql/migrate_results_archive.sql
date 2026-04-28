USE college_voting;

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
