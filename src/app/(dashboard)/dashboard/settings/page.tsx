import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GitHubConnectButton } from "@/components/auth/github-connect-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // Check Supabase Auth for GitHub identity (source of truth)
  const githubIdentity = user.identities?.find(
    (identity) => identity.provider === "github"
  );
  const isGitHubLinkedInAuth = !!githubIdentity;
  const githubUsername = githubIdentity?.identity_data?.user_name as string | undefined;

  // If GitHub is linked in Auth but not synced to users table, sync it now
  if (isGitHubLinkedInAuth && !profile?.github_username && githubUsername) {
    await supabase
      .from("users")
      .update({
        github_username: githubUsername,
        github_id: githubIdentity.identity_data?.provider_id || null,
        avatar_url: githubIdentity.identity_data?.avatar_url || null,
      })
      .eq("id", user.id);
  }

  // Use Auth as source of truth, fall back to profile data
  const isGitHubConnected = isGitHubLinkedInAuth;
  const displayUsername = githubUsername || profile?.github_username;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and integrations.
        </p>
      </div>

      <Separator />

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-sm">{user.email}</p>
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p className="text-sm">{profile?.name || "Not set"}</p>
          </div>
        </CardContent>
      </Card>

      {/* GitHub Integration */}
      <Card>
        <CardHeader>
          <CardTitle>GitHub Integration</CardTitle>
          <CardDescription>
            Connect your GitHub account to track repositories, commits, and pull requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">GitHub Account</p>
              <p className="text-sm text-muted-foreground">
                {isGitHubConnected
                  ? `Connected as @${displayUsername || "unknown"}`
                  : "Not connected. Connect to track your repositories."}
              </p>
            </div>
            <GitHubConnectButton
              isConnected={isGitHubConnected}
              username={displayUsername}
            />
          </div>

          {!isGitHubConnected && (
            <div className="rounded-md border border-dashed p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Why connect GitHub?</strong>
                <br />
                Connecting your GitHub account allows you to:
              </p>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                <li>Track commits and pull requests from your repositories</li>
                <li>Generate activity reports and changelogs</li>
                <li>View team contributions across projects</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
