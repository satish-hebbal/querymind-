import { notFound, redirect } from "next/navigation";
import ConfigClient from "@/components/project/ConfigClient";
import { decrypt, mask } from "@/lib/encrypt";
import { createClient } from "@/lib/supabase/server";
import type { ProjectConfig } from "@/types";

export const dynamic = "force-dynamic";

interface ConfigPageProps {
  params: { id: string };
}

export default async function ConfigPage({ params }: ConfigPageProps) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, db_url, db_type, ai_provider, ai_api_key, ai_base_url, ai_model, created_at")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    notFound();
  }

  let dbUrlMasked = "••••••••••";
  try {
    dbUrlMasked = mask(decrypt(data.db_url as string));
  } catch {
    // keep fallback mask if the stored value can't be decrypted
  }

  const config: ProjectConfig = {
    id: data.id,
    name: data.name,
    description: data.description,
    db_type: data.db_type,
    ai_provider: data.ai_provider,
    created_at: data.created_at,
    db_url_masked: dbUrlMasked,
    has_ai_api_key: Boolean(data.ai_api_key),
    ai_base_url: data.ai_base_url,
    ai_model: data.ai_model,
  };

  return <ConfigClient projectId={params.id} config={config} />;
}
