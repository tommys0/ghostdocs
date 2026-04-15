"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getRoleLabel } from "@/lib/roles";

interface TeamMember {
  id: string;
  role: "owner" | "manager" | "member";
  user: {
    id: string;
    name: string | null;
    email: string;
    github_username: string | null;
    avatar_url: string | null;
  };
}

interface ContributorStats {
  username: string;
  commits: number;
  pullRequests: number;
}

interface TeamStatsProps {
  members: TeamMember[];
  contributorStats: ContributorStats[];
}

export function TeamStats({ members, contributorStats }: TeamStatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>{members.length} members in this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const user = Array.isArray(member.user) ? member.user[0] : member.user;
              if (!user) return null;

              const initials = user.name
                ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
                : user.email[0].toUpperCase();

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.avatar_url || (user.github_username ? `https://github.com/${user.github_username}.png` : undefined)}
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {user.name || user.email}
                      </p>
                      {user.github_username && (
                        <p className="text-xs text-muted-foreground">
                          @{user.github_username}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Contributors Card */}
      <Card>
        <CardHeader>
          <CardTitle>Top Contributors</CardTitle>
          <CardDescription>Based on commits and pull requests</CardDescription>
        </CardHeader>
        <CardContent>
          {contributorStats.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No contribution data yet. Sync repositories to see stats.
            </p>
          ) : (
            <div className="space-y-3">
              {contributorStats.slice(0, 5).map((contributor, index) => (
                <div
                  key={contributor.username}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={`https://github.com/${contributor.username}.png`}
                      />
                      <AvatarFallback>
                        {contributor.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      @{contributor.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{contributor.commits} commits</span>
                    <span>{contributor.pullRequests} PRs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
