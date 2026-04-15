"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";

interface HeaderProps {
  user: {
    name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div>
        {/* Breadcrumb or page title can go here */}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url || undefined} alt={user.name || user.email} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
            <p className="mt-1 text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
