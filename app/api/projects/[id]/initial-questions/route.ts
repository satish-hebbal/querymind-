import { NextResponse } from "next/server";
import { generateInitialQuestions } from "@/lib/ai";
import { describeDbError, validateConnectionString } from "@/lib/db-errors";
import { decrypt } from "@/lib/encrypt";
import { getProjectSchema } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";
import type { AiProvider } from "@/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("db_url, ai_provider, ai_api_key, ai_base_url, ai_model")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const dbUrl = decrypt(data.db_url as string);
    const formatError = validateConnectionString(dbUrl);
    if (formatError) return NextResponse.json({ questions: [] });

    const schema = await getProjectSchema(params.id, dbUrl);
    const aiProvider = data.ai_provider as AiProvider;
    const aiApiKey = data.ai_api_key ? decrypt(data.ai_api_key as string) : null;

    const questions = await generateInitialQuestions(
      schema,
      aiProvider,
      aiApiKey,
      data.ai_base_url as string | null,
      data.ai_model as string | null
    );

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("initial-questions error:", describeDbError(err));
    return NextResponse.json({ questions: [] });
  }
}
