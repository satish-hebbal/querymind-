import { NextRequest, NextResponse } from "next/server";
import { decrypt, encrypt, mask } from "@/lib/encrypt";
import { clearProjectSchemaCache } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";
import type { AiProvider, DbType, ProjectConfig } from "@/types";

export const dynamic = "force-dynamic";

const DB_TYPES: DbType[] = ["postgresql", "mysql", "sqlite"];
const AI_PROVIDERS: AiProvider[] = ["gemini", "openai", "claude", "custom"];

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, db_url, db_type, ai_provider, ai_api_key, ai_base_url, ai_model, created_at")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let dbUrlMasked = "";
  try {
    dbUrlMasked = mask(decrypt(data.db_url as string));
  } catch {
    dbUrlMasked = "••••••••••";
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

  return NextResponse.json({ project: config });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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
  const updates: Record<string, unknown> = {};

  if (typeof input.name === "string" && input.name.trim()) {
    updates.name = input.name.trim();
  }

  if (typeof input.description === "string") {
    updates.description = input.description.trim() || null;
  }

  if (typeof input.dbType === "string" && DB_TYPES.includes(input.dbType as DbType)) {
    updates.db_type = input.dbType;
  }

  if (typeof input.aiProvider === "string" && AI_PROVIDERS.includes(input.aiProvider as AiProvider)) {
    updates.ai_provider = input.aiProvider;
  }

  if (typeof input.dbUrl === "string" && input.dbUrl.trim()) {
    updates.db_url = encrypt(input.dbUrl.trim());
  }

  if (typeof input.aiApiKey === "string") {
    const trimmed = input.aiApiKey.trim();
    updates.ai_api_key = trimmed ? encrypt(trimmed) : null;
  }

  if (typeof input.aiBaseUrl === "string") {
    const trimmed = input.aiBaseUrl.trim();

    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      return NextResponse.json({ error: "The custom provider base URL must start with http:// or https://." }, { status: 400 });
    }

    updates.ai_base_url = trimmed || null;
  }

  if (typeof input.aiModel === "string") {
    updates.ai_model = input.aiModel.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { error } = await supabase.from("projects").update(updates).eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (updates.db_url) {
    clearProjectSchemaCache(params.id);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("projects").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  clearProjectSchemaCache(params.id);

  return NextResponse.json({ success: true });
}
