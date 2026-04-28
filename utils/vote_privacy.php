<?php
declare(strict_types=1);

/**
 * Creates a deterministic, one-way voter reference for a given election.
 * The raw student ID is never written to the votes table.
 */
function buildAnonymousVoterRef(int $electionId, int $studentId): string
{
    $secret = (string) getenv('VOTE_ANON_SALT');
    if ($secret === '') {
        // Fallback keeps behavior stable in local setups that do not define env vars.
        $secret = 'change-this-vote-anon-salt';
    }

    return hash('sha256', $secret . ':' . $electionId . ':' . $studentId);
}
