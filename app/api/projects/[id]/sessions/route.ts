import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Session } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .select("id, title, created_at")
    .eq("project_id", params.id)
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: (data ?? []) as Session[] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let title = "New chat";
  try {
    const body = (await req.json()) as { title?: string };
    if (typeof body.title === "string" && body.title.trim()) {
      title = body.title.trim().slice(0, 100);
    }
  } catch {
    // use default title
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({ project_id: params.id, user_id: userData.user.id, title })
    .select("id, title, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Ensure created_at is always a valid ISO string even if Supabase omits it
  const session: Session = {
    id: (data as Session).id,
    title: (data as Session).title,
    created_at: (data as Session).created_at ?? new Date().toISOString(),
  };

  return NextResponse.json(session, { status: 201 });
}
