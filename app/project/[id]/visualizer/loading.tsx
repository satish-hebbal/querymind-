import PixelLoader from "@/components/PixelLoader";

export default function VisualizerLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <PixelLoader size={48} label="Loading visualizer" />
    </div>
  );
}
