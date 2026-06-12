import ChatClient from "@/components/project/ChatClient";
import { createClient } from "@/lib/supabase/server";
import type { ChatHistoryItem } from "@/types";

export const dynamic = "force-dynamic";

interface ChatPageProps {
  params: { id: string };
}

export default async function ProjectChatPage({ params }: ChatPageProps) {
  const supabase = createClient();

  const { data } = await supabase
    .from("chats")
    .select("id, question, sql_generated, result_json, created_at")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return <ChatClient projectId={params.id} initialHistory={(data ?? []) as ChatHistoryItem[]} />;
}
