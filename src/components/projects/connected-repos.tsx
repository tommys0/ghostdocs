"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { GitBranch, Lock, Globe, Plus, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { RepositorySelector } from "./repository-selector";

interface Repository {
  id: string;
  github_repo_id: number;
  github_full_name: string;
  is_private: boolean;
  default_branch: string;
  last_synced_at: string | null;
  created_at: string;
}

interface ConnectedReposProps {
  repositories: Repository[];
  projectId: string;
  canManage: boolean;
}

export function ConnectedRepos({ repositories, projectId, canManage }: ConnectedReposProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleSyncAll = async () => {
    setIsSyncingAll(true);

    // Sync all repos in parallel instead of sequentially
    const results = await Promise.all(
      repositories.map(async (repo) => {
        try {
          const response = await fetch("/api/github/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ repositoryId: repo.id }),
          });
          const data = await response.json();
          return {
            repoName: repo.github_full_name,
            success: response.ok,
            commits: data.synced?.commits || 0,
            pullRequests: data.synced?.pullRequests || 0,
            error: !response.ok ? (data.error || "Unknown error") : null,
          };
        } catch (err) {
          return {
            repoName: repo.github_full_name,
            success: false,
            commits: 0,
            pullRequests: 0,
            error: err instanceof Error ? err.message : "Network error",
          };
        }
      })
    );

    const totalCommits = results.reduce((sum, r) => sum + r.commits, 0);
    const totalPRs = results.reduce((sum, r) => sum + r.pullRequests, 0);
    const failed = results.filter((r) => !r.success);

    setIsSyncingAll(false);

    if (failed.length === 0) {
      toast.success(`Synced all repos: ${totalCommits} commits, ${totalPRs} PRs`);
    } else {
      const successCount = results.length - failed.length;
      const failedNames = failed.map((f) => f.repoName.split("/")[1] || f.repoName).join(", ");

      if (successCount > 0) {
        // Mixed results - some succeeded, some failed
        toast.warning(
          `Synced ${successCount}/${results.length} repos (${totalCommits} commits, ${totalPRs} PRs). Failed: ${failedNames} — ${failed[0].error}`,
          { duration: 6000 }
        );
      } else {
        // All failed
        toast.error(`Failed to sync: ${failedNames} — ${failed[0].error}`, { duration: 6000 });
      }
    }

    router.refresh();
  };

  const handleSync = async (repoId: string, repoName: string) => {
    setIsSyncing(repoId);

    try {
      const response = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: repoId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync");
      }

      toast.success(
        `Synced ${repoName}: ${data.synced.commits} commits, ${data.synced.pullRequests} PRs`
      );
      router.refresh();
    } catch (err) {
      console.error("Error syncing repo:", err);
      toast.error(err instanceof Error ? err.message : "Failed to sync repository");
    } finally {
      setIsSyncing(null);
    }
  };

  const handleRemove = async (repoId: string, repoName: string) => {
    if (!confirm(`Remove ${repoName} from this project?`)) return;

    setIsDeleting(repoId);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("repositories")
        .delete()
        .eq("id", repoId);

      if (error) throw error;

      toast.success(`Removed ${repoName}`);
      router.refresh();
    } catch (err) {
      console.error("Error removing repo:", err);
      toast.error("Failed to remove repository");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Connected Repositories</CardTitle>
          <CardDescription>
            {repositories.length} repository{repositories.length !== 1 ? "s" : ""} connected
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {repositories.length > 1 && (
            <Button
              variant="outline"
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="gap-2 px-3 py-2 h-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncingAll ? "animate-spin" : ""}`} />
              {isSyncingAll ? "Syncing All..." : "Sync All"}
            </Button>
          )}
          {canManage && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Repository
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg overflow-hidden">
              <DialogHeader>
                <DialogTitle>Add Repository</DialogTitle>
                <DialogDescription>
                  Select additional GitHub repositories to track.
                </DialogDescription>
              </DialogHeader>
              <RepositorySelector projectId={projectId} onSuccess={() => setShowAddDialog(false)} />
            </DialogContent>
          </Dialog>
        )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {repositories.map((repo) => (
            <div
              key={repo.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://github.com/${repo.github_full_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline flex items-center gap-1"
                    >
                      {repo.github_full_name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {repo.is_private ? (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Private
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Globe className="h-3 w-3" />
                        Public
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Branch: {repo.default_branch}
                    {repo.last_synced_at && (
                      <> · Last synced: {new Date(repo.last_synced_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync(repo.id, repo.github_full_name)}
                  disabled={isSyncing === repo.id}
                  className="gap-1"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing === repo.id ? "animate-spin" : ""}`} />
                  {isSyncing === repo.id ? "Syncing..." : "Sync"}
                </Button>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(repo.id, repo.github_full_name)}
                    disabled={isDeleting === repo.id}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
