-- Performance indexes for common query patterns

-- Project members lookups (used on every dashboard/project page)
CREATE INDEX IF NOT EXISTS idx_project_members_user_id
  ON project_members(user_id);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id
  ON project_members(project_id);

-- Commits queries (activity feeds, stats)
CREATE INDEX IF NOT EXISTS idx_commits_repository_id
  ON commits(repository_id);

CREATE INDEX IF NOT EXISTS idx_commits_committed_at
  ON commits(committed_at DESC);

CREATE INDEX IF NOT EXISTS idx_commits_repo_date
  ON commits(repository_id, committed_at DESC);

-- Pull requests queries (activity feeds, stats)
CREATE INDEX IF NOT EXISTS idx_pull_requests_repository_id
  ON pull_requests(repository_id);

CREATE INDEX IF NOT EXISTS idx_pull_requests_created_at
  ON pull_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_date
  ON pull_requests(repository_id, created_at DESC);

-- Repositories lookup by project
CREATE INDEX IF NOT EXISTS idx_repositories_project_id
  ON repositories(project_id);

-- Invitations lookup (pending invitations query)
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_accepted
  ON project_invitations(project_id, accepted_at);
