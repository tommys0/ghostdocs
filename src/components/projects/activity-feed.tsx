"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitCommit, GitPullRequest, ExternalLink, Users, User, GitBranch, ChevronDown } from "lucide-react";

interface Commit {
  id: string;
  sha: string;
  message: string;
  author_github_username: string;
  committed_at: string;
  additions: number;
  deletions: number;
  repository: {
    github_full_name: string;
  };
}

interface PullRequest {
  id: string;
  github_pr_number: number;
  title: string;
  status: "open" | "closed" | "merged";
  author_github_username: string;
  created_at: string;
  merged_at: string | null;
  repository: {
    github_full_name: string;
  };
}

type ActivityItem =
  | { type: "commit"; data: Commit; date: Date }
  | { type: "pr"; data: PullRequest; date: Date };

interface Repository {
  id: string;
  github_full_name: string;
}

interface ActivityFeedProps {
  commits: Commit[];
  pullRequests: PullRequest[];
  repositories: Repository[];
  userRole: "owner" | "manager" | "member";
  currentUserGithubUsername?: string | null;
}

export function ActivityFeed({
  commits,
  pullRequests,
  repositories,
  userRole,
  currentUserGithubUsername
}: ActivityFeedProps) {
  const canViewTeam = userRole === "owner" || userRole === "manager";
  const [viewMode, setViewMode] = useState<"personal" | "team">(
    canViewTeam ? "team" : "personal"
  );

  // Track selected repositories (all selected by default)
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(
    new Set(repositories.map(r => r.github_full_name))
  );

  const toggleRepo = (repoName: string) => {
    setSelectedRepos(prev => {
      const next = new Set(prev);
      if (next.has(repoName)) {
        next.delete(repoName);
      } else {
        next.add(repoName);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedRepos(new Set(repositories.map(r => r.github_full_name)));
  };

  const selectNone = () => {
    setSelectedRepos(new Set());
  };

  // Filter activities based on view mode and selected repos
  const filteredCommits = commits
    .filter(c => selectedRepos.has(c.repository.github_full_name))
    .filter(c => viewMode === "team" || !currentUserGithubUsername ||
      c.author_github_username.toLowerCase() === currentUserGithubUsername.toLowerCase());

  const filteredPRs = pullRequests
    .filter(pr => selectedRepos.has(pr.repository.github_full_name))
    .filter(pr => viewMode === "team" || !currentUserGithubUsername ||
      pr.author_github_username.toLowerCase() === currentUserGithubUsername.toLowerCase());

  // Combine and sort by date
  const activities: ActivityItem[] = [
    ...filteredCommits.map((commit) => ({
      type: "commit" as const,
      data: commit,
      date: new Date(commit.committed_at),
    })),
    ...filteredPRs.map((pr) => ({
      type: "pr" as const,
      data: pr,
      date: new Date(pr.merged_at || pr.created_at),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const repoFilterLabel = selectedRepos.size === repositories.length
    ? "All repositories"
    : selectedRepos.size === 0
      ? "No repositories"
      : `${selectedRepos.size} of ${repositories.length} repos`;

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>
                {viewMode === "personal" ? "Your recent" : "Team"} commits and pull requests.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {repositories.length > 1 && (
                <RepoFilter
                  repositories={repositories}
                  selectedRepos={selectedRepos}
                  toggleRepo={toggleRepo}
                  selectAll={selectAll}
                  selectNone={selectNone}
                  label={repoFilterLabel}
                />
              )}
              {canViewTeam && (
                <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">
            {selectedRepos.size === 0
              ? "Select at least one repository to see activity."
              : viewMode === "personal"
                ? "No personal activity yet. Your commits will appear here after syncing."
                : "No activity yet. Click \"Sync\" on a repository to fetch commits."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>
              {activities.length} {viewMode === "personal" ? "personal" : "team"} activities
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {repositories.length > 1 && (
              <RepoFilter
                repositories={repositories}
                selectedRepos={selectedRepos}
                toggleRepo={toggleRepo}
                selectAll={selectAll}
                selectNone={selectNone}
                label={repoFilterLabel}
              />
            )}
            {canViewTeam && (
              <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 50).map((activity) => (
            <div key={activity.type === "commit" ? activity.data.id : activity.data.id}>
              {activity.type === "commit" ? (
                <CommitItem commit={activity.data} />
              ) : (
                <PullRequestItem pr={activity.data} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ViewModeToggle({
  viewMode,
  onChange
}: {
  viewMode: "personal" | "team";
  onChange: (mode: "personal" | "team") => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      <Button
        variant={viewMode === "personal" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("personal")}
        className="gap-1.5"
      >
        <User className="h-4 w-4" />
        My Activity
      </Button>
      <Button
        variant={viewMode === "team" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("team")}
        className="gap-1.5"
      >
        <Users className="h-4 w-4" />
        Team
      </Button>
    </div>
  );
}

function RepoFilter({
  repositories,
  selectedRepos,
  toggleRepo,
  selectAll,
  selectNone,
  label,
}: {
  repositories: Repository[];
  selectedRepos: Set<string>;
  toggleRepo: (name: string) => void;
  selectAll: () => void;
  selectNone: () => void;
  label: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <GitBranch className="h-4 w-4" />
        {label}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">Filter by repository</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-auto py-0.5 px-1.5 text-xs" onClick={selectAll}>
              All
            </Button>
            <Button variant="ghost" size="sm" className="h-auto py-0.5 px-1.5 text-xs" onClick={selectNone}>
              None
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {repositories.map((repo) => (
            <DropdownMenuCheckboxItem
              key={repo.id}
              checked={selectedRepos.has(repo.github_full_name)}
              onCheckedChange={() => toggleRepo(repo.github_full_name)}
            >
              <span className="truncate">{repo.github_full_name}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CommitItem({ commit }: { commit: Commit }) {
  const initials = commit.author_github_username.slice(0, 2).toUpperCase();

  // Get first line of commit message
  const firstLine = commit.message.split("\n")[0];
  const truncatedMessage =
    firstLine.length > 80 ? firstLine.slice(0, 80) + "..." : firstLine;

  const repoFullName = commit.repository.github_full_name;
  const commitUrl = `https://github.com/${repoFullName}/commit/${commit.sha}`;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <div className="mt-1 p-1.5 rounded bg-muted">
        <GitCommit className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar className="h-5 w-5">
            <AvatarImage src={`https://github.com/${commit.author_github_username}.png`} />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">
            {commit.author_github_username}
          </span>
          <span className="text-xs text-muted-foreground">
            committed to {repoFullName}
          </span>
        </div>
        <a
          href={commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 text-sm hover:underline flex items-center gap-1 group"
        >
          <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
            {commit.sha.slice(0, 7)}
          </code>
          <span className="truncate">{truncatedMessage}</span>
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </a>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(commit.committed_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function PullRequestItem({ pr }: { pr: PullRequest }) {
  const statusColors = {
    open: "bg-green-500/10 text-green-600 border-green-500/20",
    closed: "bg-red-500/10 text-red-600 border-red-500/20",
    merged: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  };

  const repoFullName = pr.repository.github_full_name;
  const prUrl = `https://github.com/${repoFullName}/pull/${pr.github_pr_number}`;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <div className="mt-1 p-1.5 rounded bg-muted">
        <GitPullRequest className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar className="h-5 w-5">
            <AvatarImage src={`https://github.com/${pr.author_github_username}.png`} />
            <AvatarFallback className="text-[10px]">
              {pr.author_github_username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{pr.author_github_username}</span>
          <Badge variant="outline" className={statusColors[pr.status]}>
            {pr.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            in {repoFullName}
          </span>
        </div>
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 text-sm hover:underline flex items-center gap-1 group"
        >
          <span className="text-muted-foreground">#{pr.github_pr_number}</span>
          <span className="truncate">{pr.title}</span>
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </a>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(pr.merged_at || pr.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
    </div>
  );
}
