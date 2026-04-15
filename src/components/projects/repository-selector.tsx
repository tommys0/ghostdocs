"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { GitBranch, Lock, Globe, RefreshCw, Check, Search } from "lucide-react";

interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  default_branch: string;
  updated_at: string;
  description: string | null;
}

interface RepositorySelectorProps {
  projectId: string;
  onSuccess?: () => void;
}

export function RepositorySelector({ projectId, onSuccess }: RepositorySelectorProps) {
  const router = useRouter();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "updated">("updated");

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/github/repos");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch repositories");
      }

      setRepos(data.repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch repositories");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRepo = (repoId: number) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  const handleConnect = async () => {
    if (selectedRepos.size === 0) {
      toast.error("Please select at least one repository");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      const selectedRepoData = repos.filter((r) => selectedRepos.has(r.id));

      const { error } = await supabase.from("repositories").insert(
        selectedRepoData.map((repo) => ({
          project_id: projectId,
          github_repo_id: repo.id,
          github_full_name: repo.full_name,
          is_private: repo.private,
          default_branch: repo.default_branch,
        }))
      );

      if (error) throw error;

      toast.success(`Connected ${selectedRepos.size} repository(s)`);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      console.error("Error connecting repos:", err);
      toast.error("Failed to connect repositories");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-5 w-5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={fetchRepos}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          No repositories found. Make sure you have access to repositories on GitHub.
        </p>
        <Button variant="outline" onClick={fetchRepos}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
    );
  }

  // Filter and sort repos
  const filteredRepos = repos
    .filter((repo) =>
      repo.full_name.toLowerCase().includes(search.toLowerCase()) ||
      repo.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.full_name.localeCompare(b.full_name);
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "updated")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filteredRepos.length} of {repos.length} repositories</span>
        <Button variant="ghost" size="sm" onClick={fetchRepos} className="h-auto py-1 px-2">
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </div>

      <div className="max-h-72 overflow-y-auto overflow-x-hidden border rounded-lg divide-y">
        {filteredRepos.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No repositories match your search
          </div>
        ) : filteredRepos.map((repo) => {
          const isSelected = selectedRepos.has(repo.id);
          return (
            <div
              key={repo.id}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent ${
                isSelected ? "bg-accent" : ""
              }`}
              onClick={() => toggleRepo(repo.id)}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/50"
                }`}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate max-w-[200px]">{repo.full_name}</span>
                  <Badge variant={repo.private ? "secondary" : "outline"} className="shrink-0 gap-1 text-xs">
                    {repo.private ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    {repo.private ? "Private" : "Public"}
                  </Badge>
                </div>
                {repo.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {repo.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {selectedRepos.size} selected
        </p>
        <Button onClick={handleConnect} disabled={isSaving || selectedRepos.size === 0}>
          {isSaving ? "Connecting..." : `Connect ${selectedRepos.size > 0 ? selectedRepos.size : ""} Repository${selectedRepos.size !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
