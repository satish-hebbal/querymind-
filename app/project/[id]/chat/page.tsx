import ChatClient from "@/components/project/ChatClient";

export const dynamic = "force-dynamic";

interface ChatPageProps {
  params: { id: string };
}

export default function ProjectChatPage({ params }: ChatPageProps) {
  return <ChatClient projectId={params.id} />;
}
