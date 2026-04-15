import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Use auth metadata directly - no need for extra DB query on every page load
  // GitHub OAuth provides all the data we need in user_metadata
  const userData = {
    name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
    email: authUser.email || "",
    avatar_url: authUser.user_metadata?.avatar_url || null,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={userData} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
