import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { decrypt } from "@/lib/encrypt";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

interface TestResult {
  success: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  responsePreview?: string;
  error?: string;
}

async function testNvidia(apiKey: string): Promise<TestResult> {
  const client = new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });
  const start = Date.now();

  try {
    const res = await client.chat.completions.create({
      model: "meta/llama-3.3-70b-instruct",
      messages: [{ role: "user", content: "Say 'ok' in one word." }],
      max_tokens: 10,
      temperature: 0,
    });

    const text = res.choices?.[0]?.message?.content?.trim() ?? "";
    return {
      success: true,
      provider: "nvidia",
      model: "meta/llama-3.3-70b-instruct",
      latencyMs: Date.now() - start,
      responsePreview: text,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      provider: "nvidia",
      model: "meta/llama-3.3-70b-instruct",
      latencyMs: Date.now() - start,
      error: msg,
    };
  }
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

  const { provider, projectId } = body as { provider?: string; projectId?: string };

  if (provider === "nvidia" || !provider) {
    // Try project-specific key first, then fallback to env
    let apiKey = process.env.NVIDIA_API_KEY ?? "";

    if (projectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("ai_api_key")
        .eq("id", projectId)
        .single();

      if (project?.ai_api_key) {
        try {
          apiKey = decrypt(project.ai_api_key as string);
        } catch {
          // fall back to env key
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json<TestResult>({
        success: false,
        provider: "nvidia",
        model: "meta/llama-3.3-70b-instruct",
        latencyMs: 0,
        error: "No API key configured. Set NVIDIA_API_KEY in .env.local or add a key in project settings.",
      });
    }

    const result = await testNvidia(apiKey);
    return NextResponse.json<TestResult>(result);
  }

  return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
}
