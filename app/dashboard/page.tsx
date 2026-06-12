import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/auth/login");
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, db_type, ai_provider, created_at")
    .order("created_at", { ascending: false });

  return <DashboardClient projects={(projects ?? []) as Project[]} userEmail={userData.user.email ?? ""} />;
}
