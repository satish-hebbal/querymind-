import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import ProjectShell from "@/components/project/ProjectShell";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types";

export const dynamic = "force-dynamic";

interface ProjectLayoutProps {
  children: ReactNode;
  params: { id: string };
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, db_type, ai_provider, created_at")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    notFound();
  }

  return <ProjectShell project={data as Project}>{children}</ProjectShell>;
}
