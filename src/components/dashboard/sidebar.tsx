"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitBranch,
  Home,
  FolderKanban,
  BarChart3,
  FileText,
  ScrollText,
  Settings,
  Users,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const projectNavigation = [
  { name: "Activity", href: "", icon: GitBranch },
  { name: "Team", href: "/team", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Changelog", href: "/changelog", icon: ScrollText },
  { name: "Settings", href: "/settings", icon: Settings },
];

// Extract projectId from pathname like /dashboard/projects/[projectId]/...
function getProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/dashboard\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

export function Sidebar() {
  const pathname = usePathname();
  const [projectName, setProjectName] = useState<string | null>(null);

  // Extract projectId from current URL
  const projectId = getProjectIdFromPath(pathname);

  // Fetch project name when projectId changes
  useEffect(() => {
    if (!projectId) {
      setProjectName(null);
      return;
    }

    const fetchProjectName = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();

      if (data) {
        setProjectName(data.name);
      }
    };

    fetchProjectName();
  }, [projectId]);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <GitBranch className="h-6 w-6" />
        <span className="text-lg font-bold">GhostDoc</span>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {/* Main Navigation */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Project Navigation (when inside a project) */}
        {projectId && (
          <>
            <div className="my-4 border-t" />
            <div className="mb-2 px-3">
              <Link
                href="/dashboard/projects"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
                Back to Projects
              </Link>
              <p className="mt-2 text-sm font-semibold truncate">
                {projectName || "Loading..."}
              </p>
            </div>
            <nav className="space-y-1">
              {projectNavigation.map((item) => {
                const href = `/dashboard/projects/${projectId}${item.href}`;
                const isActive =
                  item.href === ""
                    ? pathname === `/dashboard/projects/${projectId}`
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={item.name}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </ScrollArea>
    </div>
  );
}
