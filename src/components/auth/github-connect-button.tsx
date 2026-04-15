"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

interface GitHubConnectButtonProps {
  isConnected: boolean;
  username?: string | null;
}

export function GitHubConnectButton({ isConnected, username }: GitHubConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.linkIdentity({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard/settings`,
        scopes: "read:user user:email repo read:org",
      },
    });

    if (error) {
      console.error("GitHub connect error:", error);
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect GitHub?")) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      // Get current user to find GitHub identity
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      // Clear GitHub data from users table FIRST
      // This ensures consistency even if unlink fails
      await supabase.from("users").update({
        github_access_token: null,
        github_id: null,
        github_username: null,
      }).eq("id", user.id);

      // Then unlink from Auth
      const githubIdentity = user.identities?.find(
        (identity) => identity.provider === "github"
      );

      if (githubIdentity) {
        const { error } = await supabase.auth.unlinkIdentity(githubIdentity);
        if (error) {
          console.error("GitHub unlink error:", error);
          // Don't throw - we already cleared the users table
        }
      }

      window.location.reload();
    } catch (error) {
      console.error("GitHub disconnect error:", error);
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
          <GitHubIcon className="h-4 w-4" />
          <span className="text-sm font-medium">@{username || "Connected"}</span>
          <Check className="h-4 w-4 text-green-500" />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleConnect} disabled={isLoading} className="gap-2">
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GitHubIcon className="h-4 w-4" />
      )}
      Connect GitHub
    </Button>
  );
}
