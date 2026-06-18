import { NextRequest, NextResponse } from "next/server";
import { generateSessionTitle } from "@/lib/ai";
import { decrypt } from "@/lib/encrypt";
import { createClient } from "@/lib/supabase/server";
import type { AiProvider } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let question = "";
  try {
    const body = (await req.json()) as { question?: string };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("ai_provider, ai_api_key, ai_base_url, ai_model")
    .eq("id", params.id)
    .single();

  let aiApiKey: string | null = null;
  if (project?.ai_api_key) {
    try { aiApiKey = decrypt(project.ai_api_key as string); } catch { /* ignore */ }
  }

  const title = await generateSessionTitle(
    question,
    (project?.ai_provider ?? "nvidia") as AiProvider,
    aiApiKey,
    project?.ai_base_url as string | null,
    project?.ai_model as string | null
  );

  await supabase
    .from("sessions")
    .update({ title })
    .eq("id", params.sessionId)
    .eq("user_id", userData.user.id);

  return NextResponse.json({ title });
}
