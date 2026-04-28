USE college_voting;

ALTER TABLE votes
  ADD COLUMN voter_ref CHAR(64) NULL AFTER candidate_id;

UPDATE votes
SET voter_ref = SHA2(CONCAT('change-this-vote-anon-salt', ':', election_id, ':', voter_student_id), 256)
WHERE voter_ref IS NULL;

ALTER TABLE votes
  MODIFY voter_ref CHAR(64) NOT NULL;

ALTER TABLE votes
  DROP INDEX uq_one_vote_per_position;

ALTER TABLE votes
  ADD UNIQUE KEY uq_one_vote_per_position (election_id, position_id, voter_ref);

ALTER TABLE votes
  DROP FOREIGN KEY fk_votes_student;

ALTER TABLE votes
  DROP COLUMN voter_student_id;
