-- Add team invite link support to projects
-- This allows a shareable link that anyone can use to join the project

-- Add columns for team invite functionality
ALTER TABLE projects
ADD COLUMN team_invite_token TEXT UNIQUE,
ADD COLUMN team_invite_role invitation_role DEFAULT 'member',
ADD COLUMN team_invite_enabled BOOLEAN DEFAULT FALSE;

-- Create index for fast token lookups
CREATE INDEX idx_projects_team_invite_token ON projects(team_invite_token) WHERE team_invite_token IS NOT NULL;

-- RLS policy: Allow anyone to read project by team invite token (for join page)
CREATE POLICY "Anyone can read project by team invite token"
    ON projects FOR SELECT
    USING (
        team_invite_enabled = TRUE
        AND team_invite_token IS NOT NULL
    );
