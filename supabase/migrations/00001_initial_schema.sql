-- GhostDoc Initial Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE member_role AS ENUM ('owner', 'manager', 'member', 'viewer');
CREATE TYPE invitation_role AS ENUM ('manager', 'member', 'viewer');
CREATE TYPE pr_status AS ENUM ('open', 'merged', 'closed');
CREATE TYPE activity_type AS ENUM ('feature', 'fix', 'refactor', 'docs', 'chore');
CREATE TYPE report_type AS ENUM ('executive', 'developer', 'technical', 'changelog');
CREATE TYPE report_format AS ENUM ('markdown', 'html', 'json');
CREATE TYPE webhook_type AS ENUM ('wordpress', 'custom');

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    github_id TEXT UNIQUE,
    github_username TEXT,
    github_access_token TEXT, -- Encrypted in production
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allowed_email_domain TEXT, -- e.g., '@company.com'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Project members (user-project relationships)
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(project_id, user_id)
);

-- Project invitations (pending invites)
CREATE TABLE project_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role invitation_role NOT NULL DEFAULT 'member',
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(project_id, email)
);

-- Repositories (connected GitHub repos)
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    github_repo_id BIGINT NOT NULL,
    github_full_name TEXT NOT NULL, -- e.g., 'org/repo'
    is_private BOOLEAN DEFAULT FALSE NOT NULL,
    default_branch TEXT DEFAULT 'main' NOT NULL,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(project_id, github_repo_id)
);

-- Commits (synced from GitHub)
CREATE TABLE commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha TEXT NOT NULL,
    message TEXT NOT NULL,
    author_github_username TEXT NOT NULL,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    committed_at TIMESTAMPTZ NOT NULL,
    additions INTEGER DEFAULT 0 NOT NULL,
    deletions INTEGER DEFAULT 0 NOT NULL,
    files_changed JSONB DEFAULT '[]'::jsonb NOT NULL,
    ai_summary TEXT,
    activity_type activity_type,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(repository_id, sha)
);

-- Pull Requests (synced from GitHub)
CREATE TABLE pull_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    github_pr_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    author_github_username TEXT NOT NULL,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status pr_status DEFAULT 'open' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    merged_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    reviewers JSONB DEFAULT '[]'::jsonb NOT NULL,
    ai_summary TEXT,
    activity_type activity_type,
    UNIQUE(repository_id, github_pr_number)
);

-- Reports (generated reports and changelogs)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type report_type NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    content TEXT NOT NULL,
    format report_format DEFAULT 'markdown' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Webhooks (publishing destinations)
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type webhook_type NOT NULL,
    credentials JSONB DEFAULT '{}'::jsonb NOT NULL, -- Encrypted in production
    headers JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_github_username ON users(github_username);

-- Projects
CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- Project members
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- Project invitations
CREATE INDEX idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX idx_project_invitations_email ON project_invitations(email);
CREATE INDEX idx_project_invitations_token ON project_invitations(token);

-- Repositories
CREATE INDEX idx_repositories_project_id ON repositories(project_id);
CREATE INDEX idx_repositories_github_repo_id ON repositories(github_repo_id);

-- Commits
CREATE INDEX idx_commits_repository_id ON commits(repository_id);
CREATE INDEX idx_commits_author_user_id ON commits(author_user_id);
CREATE INDEX idx_commits_committed_at ON commits(committed_at);
CREATE INDEX idx_commits_activity_type ON commits(activity_type);

-- Pull requests
CREATE INDEX idx_pull_requests_repository_id ON pull_requests(repository_id);
CREATE INDEX idx_pull_requests_author_user_id ON pull_requests(author_user_id);
CREATE INDEX idx_pull_requests_status ON pull_requests(status);
CREATE INDEX idx_pull_requests_created_at ON pull_requests(created_at);

-- Reports
CREATE INDEX idx_reports_project_id ON reports(project_id);
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_date_range ON reports(date_from, date_to);

-- Webhooks
CREATE INDEX idx_webhooks_project_id ON webhooks(project_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is project member with specific roles
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID, p_user_id UUID, p_roles member_role[] DEFAULT ARRAY['owner', 'manager', 'member', 'viewer']::member_role[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = p_project_id
        AND user_id = p_user_id
        AND role = ANY(p_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can manage project (owner or manager)
CREATE OR REPLACE FUNCTION can_manage_project(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_project_member(p_project_id, p_user_id, ARRAY['owner', 'manager']::member_role[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is project owner
CREATE OR REPLACE FUNCTION is_project_owner(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_project_member(p_project_id, p_user_id, ARRAY['owner']::member_role[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: Users
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can read profiles of project members they share a project with
CREATE POLICY "Users can read project member profiles"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_members pm1
            JOIN project_members pm2 ON pm1.project_id = pm2.project_id
            WHERE pm1.user_id = auth.uid()
            AND pm2.user_id = users.id
        )
    );

-- ============================================
-- RLS POLICIES: Projects
-- ============================================

-- Project members can read their projects
CREATE POLICY "Members can read projects"
    ON projects FOR SELECT
    USING (is_project_member(id, auth.uid()));

-- Authenticated users can create projects
CREATE POLICY "Authenticated users can create projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Owners and managers can update projects
CREATE POLICY "Owners and managers can update projects"
    ON projects FOR UPDATE
    USING (can_manage_project(id, auth.uid()));

-- Only owners can delete projects
CREATE POLICY "Owners can delete projects"
    ON projects FOR DELETE
    USING (is_project_owner(id, auth.uid()));

-- ============================================
-- RLS POLICIES: Project Members
-- ============================================

-- Members can read project membership
CREATE POLICY "Members can read project members"
    ON project_members FOR SELECT
    USING (is_project_member(project_id, auth.uid()));

-- Owners and managers can add members
CREATE POLICY "Managers can add members"
    ON project_members FOR INSERT
    WITH CHECK (can_manage_project(project_id, auth.uid()));

-- Owners and managers can update member roles (except making someone owner)
CREATE POLICY "Managers can update members"
    ON project_members FOR UPDATE
    USING (can_manage_project(project_id, auth.uid()));

-- Owners can remove members, members can remove themselves
CREATE POLICY "Owners can remove members or self-remove"
    ON project_members FOR DELETE
    USING (
        is_project_owner(project_id, auth.uid())
        OR user_id = auth.uid()
    );

-- ============================================
-- RLS POLICIES: Project Invitations
-- ============================================

-- Members can read invitations for their projects
CREATE POLICY "Members can read invitations"
    ON project_invitations FOR SELECT
    USING (is_project_member(project_id, auth.uid()));

-- Owners and managers can create invitations
CREATE POLICY "Managers can create invitations"
    ON project_invitations FOR INSERT
    WITH CHECK (can_manage_project(project_id, auth.uid()));

-- Owners and managers can update/revoke invitations
CREATE POLICY "Managers can update invitations"
    ON project_invitations FOR UPDATE
    USING (can_manage_project(project_id, auth.uid()));

-- Owners and managers can delete invitations
CREATE POLICY "Managers can delete invitations"
    ON project_invitations FOR DELETE
    USING (can_manage_project(project_id, auth.uid()));

-- ============================================
-- RLS POLICIES: Repositories
-- ============================================

-- Members can read repositories
CREATE POLICY "Members can read repositories"
    ON repositories FOR SELECT
    USING (is_project_member(project_id, auth.uid()));

-- Owners and managers can add repositories
CREATE POLICY "Managers can add repositories"
    ON repositories FOR INSERT
    WITH CHECK (can_manage_project(project_id, auth.uid()));

-- Owners and managers can update repositories
CREATE POLICY "Managers can update repositories"
    ON repositories FOR UPDATE
    USING (can_manage_project(project_id, auth.uid()));

-- Owners and managers can remove repositories
CREATE POLICY "Managers can remove repositories"
    ON repositories FOR DELETE
    USING (can_manage_project(project_id, auth.uid()));

-- ============================================
-- RLS POLICIES: Commits
-- ============================================

-- Members can read commits through repository access
CREATE POLICY "Members can read commits"
    ON commits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM repositories r
            WHERE r.id = commits.repository_id
            AND is_project_member(r.project_id, auth.uid())
        )
    );

-- Managers can insert commits (for sync)
CREATE POLICY "Managers can insert commits"
    ON commits FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM repositories r
            WHERE r.id = commits.repository_id
            AND can_manage_project(r.project_id, auth.uid())
        )
    );

-- Managers can update commits (for AI summaries)
CREATE POLICY "Managers can update commits"
    ON commits FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM repositories r
            WHERE r.id = commits.repository_id
            AND can_manage_project(r.project_id, auth.uid())
        )
    );

-- ============================================
-- RLS POLICIES: Pull Requests
-- ============================================

-- Members can read pull requests
CREATE POLICY "Members can read pull requests"
    ON pull_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM repositories r
            WHERE r.id = pull_requests.repository_id
            AND is_project_member(r.project_id, auth.uid())
        )
    );

-- Managers can insert pull requests (for sync)
CREATE POLICY "Managers can insert pull requests"
    ON pull_requests FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM repositories r
            WHERE r.id = pull_requests.repository_id
            AND can_manage_project(r.project_id, auth.uid())
        )
    );

-- Managers can update pull requests
CREATE POLICY "Managers can update pull requests"
    ON pull_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM repositories r
            WHERE r.id = pull_requests.repository_id
            AND can_manage_project(r.project_id, auth.uid())
        )
    );

-- ============================================
-- RLS POLICIES: Reports
-- ============================================

-- Members can read reports
CREATE POLICY "Members can read reports"
    ON reports FOR SELECT
    USING (is_project_member(project_id, auth.uid()));

-- Members (except viewers) can create reports
CREATE POLICY "Non-viewers can create reports"
    ON reports FOR INSERT
    WITH CHECK (
        is_project_member(project_id, auth.uid(), ARRAY['owner', 'manager', 'member']::member_role[])
    );

-- Report creators and managers can update reports
CREATE POLICY "Creators and managers can update reports"
    ON reports FOR UPDATE
    USING (
        created_by = auth.uid()
        OR can_manage_project(project_id, auth.uid())
    );

-- Report creators and managers can delete reports
CREATE POLICY "Creators and managers can delete reports"
    ON reports FOR DELETE
    USING (
        created_by = auth.uid()
        OR can_manage_project(project_id, auth.uid())
    );

-- ============================================
-- RLS POLICIES: Webhooks
-- ============================================

-- Members can read webhooks
CREATE POLICY "Members can read webhooks"
    ON webhooks FOR SELECT
    USING (is_project_member(project_id, auth.uid()));

-- Owners and managers can create webhooks
CREATE POLICY "Managers can create webhooks"
    ON webhooks FOR INSERT
    WITH CHECK (can_manage_project(project_id, auth.uid()));

-- Owners and managers can update webhooks
CREATE POLICY "Managers can update webhooks"
    ON webhooks FOR UPDATE
    USING (can_manage_project(project_id, auth.uid()));

-- Owners and managers can delete webhooks
CREATE POLICY "Managers can delete webhooks"
    ON webhooks FOR DELETE
    USING (can_manage_project(project_id, auth.uid()));

-- ============================================
-- TRIGGER: Auto-create user profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, avatar_url, github_id, github_username, github_access_token)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'provider_id',
        NEW.raw_user_meta_data->>'user_name',
        NEW.raw_user_meta_data->>'provider_token'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- TRIGGER: Auto-add owner as project member
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_project();
