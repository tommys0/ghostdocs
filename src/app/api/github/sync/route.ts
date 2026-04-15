import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
}

interface GitHubPR {
  id: number;
  number: number;
  title: string;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repositoryId } = await request.json();

  if (!repositoryId) {
    return NextResponse.json(
      { error: "Repository ID is required" },
      { status: 400 }
    );
  }

  // Get repository details
  const { data: repo, error: repoError } = await supabase
    .from("repositories")
    .select("*, projects!inner(id)")
    .eq("id", repositoryId)
    .single();

  if (repoError || !repo) {
    return NextResponse.json(
      { error: "Repository not found" },
      { status: 404 }
    );
  }

  // Get user's GitHub token
  const { data: userData } = await supabase
    .from("users")
    .select("github_access_token")
    .eq("id", user.id)
    .single();

  if (!userData?.github_access_token) {
    return NextResponse.json(
      { error: "GitHub token not found. Please reconnect GitHub." },
      { status: 400 }
    );
  }

  const token = userData.github_access_token;
  const repoFullName = repo.github_full_name;

  try {
    // Fetch recent commits
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/commits?per_page=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!commitsResponse.ok) {
      const errorText = await commitsResponse.text();
      console.error("GitHub commits API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch commits from GitHub" },
        { status: commitsResponse.status }
      );
    }

    const commits: GitHubCommit[] = await commitsResponse.json();

    // Fetch recent pull requests
    const prsResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/pulls?state=all&per_page=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!prsResponse.ok) {
      console.error("GitHub PRs API error:", await prsResponse.text());
    }

    const prs: GitHubPR[] = prsResponse.ok ? await prsResponse.json() : [];

    // Upsert commits - using schema columns: sha, message, author_github_username, committed_at
    const commitRecords = commits.map((commit) => ({
      repository_id: repositoryId,
      sha: commit.sha,
      message: commit.commit.message,
      author_github_username: commit.author?.login || commit.commit.author.name || "unknown",
      committed_at: commit.commit.author.date,
      additions: 0,
      deletions: 0,
    }));

    if (commitRecords.length > 0) {
      const { error: commitError } = await supabase
        .from("commits")
        .upsert(commitRecords, { onConflict: "repository_id,sha" });

      if (commitError) {
        console.error("Error upserting commits:", commitError);
      }
    }

    // Upsert pull requests - using schema columns: github_pr_number, title, author_github_username, status
    const prRecords = prs.map((pr) => ({
      repository_id: repositoryId,
      github_pr_number: pr.number,
      title: pr.title,
      description: null,
      author_github_username: pr.user.login,
      status: pr.merged_at ? "merged" : pr.state === "closed" ? "closed" : "open",
      merged_at: pr.merged_at,
      closed_at: pr.state === "closed" ? pr.updated_at : null,
    }));

    if (prRecords.length > 0) {
      const { error: prError } = await supabase
        .from("pull_requests")
        .upsert(prRecords, { onConflict: "repository_id,github_pr_number" });

      if (prError) {
        console.error("Error upserting pull requests:", prError);
      }
    }

    // Update repository last_synced_at
    await supabase
      .from("repositories")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", repositoryId);

    return NextResponse.json({
      success: true,
      synced: {
        commits: commitRecords.length,
        pullRequests: prRecords.length,
      },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync repository" },
      { status: 500 }
    );
  }
}
