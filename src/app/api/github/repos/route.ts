import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's GitHub token from our users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("github_access_token")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.github_access_token) {
      // Try to get token from Supabase session
      const { data: sessionData } = await supabase.auth.getSession();
      const providerToken = sessionData?.session?.provider_token;

      if (providerToken) {
        // Store the token for future use
        await supabase
          .from("users")
          .update({ github_access_token: providerToken })
          .eq("id", user.id);

        return await fetchGitHubRepos(providerToken);
      }

      return NextResponse.json(
        { error: "GitHub token not found. Please sign out and sign in again with GitHub." },
        { status: 400 }
      );
    }

    return await fetchGitHubRepos(userData.github_access_token);
  } catch (error) {
    console.error("Error fetching repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}

type GitHubRepo = {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  default_branch: string;
  updated_at: string;
  description: string | null;
};

async function fetchGitHubRepos(token: string) {
  const perPage = 100;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  // Fetch first page to get data and check total count via Link header
  const firstResponse = await fetch(
    `https://api.github.com/user/repos?per_page=${perPage}&page=1&sort=updated&direction=desc`,
    { headers }
  );

  if (!firstResponse.ok) {
    const error = await firstResponse.json();
    console.error("GitHub API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories from GitHub" },
      { status: firstResponse.status }
    );
  }

  const firstPageData: GitHubRepo[] = await firstResponse.json();

  // If first page has less than perPage, we're done
  if (firstPageData.length < perPage) {
    return NextResponse.json({ repos: mapRepos(firstPageData) });
  }

  // Parse Link header to find last page
  const linkHeader = firstResponse.headers.get("Link");
  const lastPage = parseLinkHeader(linkHeader);
  const maxPages = Math.min(lastPage, 5); // Cap at 500 repos

  // Fetch remaining pages in parallel
  const pagePromises: Promise<GitHubRepo[]>[] = [];
  for (let page = 2; page <= maxPages; page++) {
    pagePromises.push(
      fetch(
        `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc`,
        { headers }
      ).then(res => res.ok ? res.json() : [])
    );
  }

  const remainingPages = await Promise.all(pagePromises);
  const allRepos = [firstPageData, ...remainingPages].flat();

  return NextResponse.json({ repos: mapRepos(allRepos) });
}

function mapRepos(repos: GitHubRepo[]) {
  return repos.map((repo) => ({
    id: repo.id,
    full_name: repo.full_name,
    name: repo.name,
    private: repo.private,
    default_branch: repo.default_branch,
    updated_at: repo.updated_at,
    description: repo.description,
  }));
}

function parseLinkHeader(header: string | null): number {
  if (!header) return 1;

  // Parse Link header to find last page number
  // Format: <url?page=5>; rel="last"
  const lastMatch = header.match(/page=(\d+)>;\s*rel="last"/);
  return lastMatch ? parseInt(lastMatch[1], 10) : 1;
}
