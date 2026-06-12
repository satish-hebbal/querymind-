import VisualizerClient from "@/components/visualizer/VisualizerClient";

interface VisualizerPageProps {
  params: { id: string };
}

export default function VisualizerPage({ params }: VisualizerPageProps) {
  return <VisualizerClient projectId={params.id} />;
}
