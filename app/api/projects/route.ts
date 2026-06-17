import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/encrypt";
import { createClient } from "@/lib/supabase/server";
import type { AiProvider, DbType, Project } from "@/types";

export const dynamic = "force-dynamic";

const DB_TYPES: DbType[] = ["postgresql", "mysql", "sqlite"];
const AI_PROVIDERS: AiProvider[] = ["nvidia", "gemini", "openai", "claude", "custom"];

export async function GET() {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, db_type, ai_provider, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data as Project[] });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const dbUrl = typeof input.dbUrl === "string" ? input.dbUrl.trim() : "";
  const dbType = typeof input.dbType === "string" && DB_TYPES.includes(input.dbType as DbType) ? (input.dbType as DbType) : "postgresql";
  const aiProvider =
    typeof input.aiProvider === "string" && AI_PROVIDERS.includes(input.aiProvider as AiProvider)
      ? (input.aiProvider as AiProvider)
      : "nvidia";
  const aiApiKey = typeof input.aiApiKey === "string" ? input.aiApiKey.trim() : "";
  const aiBaseUrl = typeof input.aiBaseUrl === "string" ? input.aiBaseUrl.trim() : "";
  const aiModel = typeof input.aiModel === "string" ? input.aiModel.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }

  if (!dbUrl) {
    return NextResponse.json({ error: "Database connection URL is required." }, { status: 400 });
  }

  if ((aiProvider === "openai" || aiProvider === "claude") && !aiApiKey) {
    return NextResponse.json({ error: `An API key is required for ${aiProvider === "openai" ? "GPT-4o" : "Claude"}.` }, { status: 400 });
  }

  if (aiProvider === "nvidia" && !process.env.NVIDIA_API_KEY) {
    return NextResponse.json({ error: "NVIDIA_API_KEY is not configured on the server." }, { status: 500 });
  }

  if (aiProvider === "custom") {
    if (!aiBaseUrl || !/^https?:\/\//i.test(aiBaseUrl)) {
      return NextResponse.json({ error: "A base URL (starting with http:// or https://) is required for a custom provider." }, { status: 400 });
    }

    if (!aiModel) {
      return NextResponse.json({ error: "A model name is required for a custom provider." }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userData.user.id,
      name,
      description: description || null,
      db_url: encrypt(dbUrl),
      db_type: dbType,
      ai_provider: aiProvider,
      ai_api_key: aiProvider !== "nvidia" && aiApiKey ? encrypt(aiApiKey) : null,
      ai_base_url: aiProvider === "custom" ? aiBaseUrl : null,
      ai_model: aiProvider === "custom" ? aiModel : null,
    })
    .select("id, name, description, db_type, ai_provider, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data as Project }, { status: 201 });
}
