import { redirect } from "next/navigation";

export default function ProjectIndexPage({ params }: { params: { id: string } }) {
  redirect(`/project/${params.id}/chat`);
}
