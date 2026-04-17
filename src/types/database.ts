export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          github_id: string | null;
          github_username: string | null;
          github_access_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          github_id?: string | null;
          github_username?: string | null;
          github_access_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          github_id?: string | null;
          github_username?: string | null;
          github_access_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          allowed_email_domain: string | null;
          team_invite_token: string | null;
          team_invite_role: "manager" | "member" | "viewer";
          team_invite_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          allowed_email_domain?: string | null;
          team_invite_token?: string | null;
          team_invite_role?: "manager" | "member" | "viewer";
          team_invite_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          allowed_email_domain?: string | null;
          team_invite_token?: string | null;
          team_invite_role?: "manager" | "member" | "viewer";
          team_invite_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "owner" | "manager" | "member" | "viewer";
          invited_by: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: "owner" | "manager" | "member" | "viewer";
          invited_by?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: "owner" | "manager" | "member" | "viewer";
          invited_by?: string | null;
          joined_at?: string;
        };
      };
      project_invitations: {
        Row: {
          id: string;
          project_id: string;
          email: string;
          role: "manager" | "member" | "viewer";
          token: string;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          email: string;
          role: "manager" | "member" | "viewer";
          token?: string;
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          email?: string;
          role?: "manager" | "member" | "viewer";
          token?: string;
          invited_by?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
      };
      repositories: {
        Row: {
          id: string;
          project_id: string;
          github_repo_id: number;
          github_full_name: string;
          is_private: boolean;
          default_branch: string;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          github_repo_id: number;
          github_full_name: string;
          is_private?: boolean;
          default_branch?: string;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          github_repo_id?: number;
          github_full_name?: string;
          is_private?: boolean;
          default_branch?: string;
          last_synced_at?: string | null;
          created_at?: string;
        };
      };
      commits: {
        Row: {
          id: string;
          repository_id: string;
          sha: string;
          message: string;
          author_github_username: string;
          author_user_id: string | null;
          committed_at: string;
          additions: number;
          deletions: number;
          files_changed: Json;
          ai_summary: string | null;
          activity_type: "feature" | "fix" | "refactor" | "docs" | "chore" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          sha: string;
          message: string;
          author_github_username: string;
          author_user_id?: string | null;
          committed_at: string;
          additions?: number;
          deletions?: number;
          files_changed?: Json;
          ai_summary?: string | null;
          activity_type?: "feature" | "fix" | "refactor" | "docs" | "chore" | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          sha?: string;
          message?: string;
          author_github_username?: string;
          author_user_id?: string | null;
          committed_at?: string;
          additions?: number;
          deletions?: number;
          files_changed?: Json;
          ai_summary?: string | null;
          activity_type?: "feature" | "fix" | "refactor" | "docs" | "chore" | null;
          created_at?: string;
        };
      };
      pull_requests: {
        Row: {
          id: string;
          repository_id: string;
          github_pr_number: number;
          title: string;
          description: string | null;
          author_github_username: string;
          author_user_id: string | null;
          status: "open" | "merged" | "closed";
          created_at: string;
          merged_at: string | null;
          closed_at: string | null;
          reviewers: Json;
          ai_summary: string | null;
          activity_type: "feature" | "fix" | "refactor" | "docs" | "chore" | null;
        };
        Insert: {
          id?: string;
          repository_id: string;
          github_pr_number: number;
          title: string;
          description?: string | null;
          author_github_username: string;
          author_user_id?: string | null;
          status?: "open" | "merged" | "closed";
          created_at?: string;
          merged_at?: string | null;
          closed_at?: string | null;
          reviewers?: Json;
          ai_summary?: string | null;
          activity_type?: "feature" | "fix" | "refactor" | "docs" | "chore" | null;
        };
        Update: {
          id?: string;
          repository_id?: string;
          github_pr_number?: number;
          title?: string;
          description?: string | null;
          author_github_username?: string;
          author_user_id?: string | null;
          status?: "open" | "merged" | "closed";
          created_at?: string;
          merged_at?: string | null;
          closed_at?: string | null;
          reviewers?: Json;
          ai_summary?: string | null;
          activity_type?: "feature" | "fix" | "refactor" | "docs" | "chore" | null;
        };
      };
      reports: {
        Row: {
          id: string;
          project_id: string;
          created_by: string;
          title: string;
          type: "executive" | "developer" | "technical" | "changelog";
          date_from: string;
          date_to: string;
          content: string;
          format: "markdown" | "html" | "json";
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          created_by: string;
          title: string;
          type: "executive" | "developer" | "technical" | "changelog";
          date_from: string;
          date_to: string;
          content: string;
          format?: "markdown" | "html" | "json";
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          created_by?: string;
          title?: string;
          type?: "executive" | "developer" | "technical" | "changelog";
          date_from?: string;
          date_to?: string;
          content?: string;
          format?: "markdown" | "html" | "json";
          created_at?: string;
        };
      };
      webhooks: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          url: string;
          type: "wordpress" | "custom";
          credentials: Json;
          headers: Json;
          is_active: boolean;
          last_triggered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          url: string;
          type: "wordpress" | "custom";
          credentials?: Json;
          headers?: Json;
          is_active?: boolean;
          last_triggered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          url?: string;
          type?: "wordpress" | "custom";
          credentials?: Json;
          headers?: Json;
          is_active?: boolean;
          last_triggered_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      member_role: "owner" | "manager" | "member" | "viewer";
      invitation_role: "manager" | "member" | "viewer";
      pr_status: "open" | "merged" | "closed";
      activity_type: "feature" | "fix" | "refactor" | "docs" | "chore";
      report_type: "executive" | "developer" | "technical" | "changelog";
      report_format: "markdown" | "html" | "json";
      webhook_type: "wordpress" | "custom";
    };
  };
};

// Helper types for easier usage
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectMember = Database["public"]["Tables"]["project_members"]["Row"];
export type ProjectInvitation = Database["public"]["Tables"]["project_invitations"]["Row"];
export type Repository = Database["public"]["Tables"]["repositories"]["Row"];
export type Commit = Database["public"]["Tables"]["commits"]["Row"];
export type PullRequest = Database["public"]["Tables"]["pull_requests"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type Webhook = Database["public"]["Tables"]["webhooks"]["Row"];

// Insert types
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectMemberInsert = Database["public"]["Tables"]["project_members"]["Insert"];
export type RepositoryInsert = Database["public"]["Tables"]["repositories"]["Insert"];
export type CommitInsert = Database["public"]["Tables"]["commits"]["Insert"];
export type PullRequestInsert = Database["public"]["Tables"]["pull_requests"]["Insert"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type WebhookInsert = Database["public"]["Tables"]["webhooks"]["Insert"];
