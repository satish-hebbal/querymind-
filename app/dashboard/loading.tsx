import PixelLoader from "@/components/PixelLoader";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <PixelLoader size={64} label="Loading projects" />
    </div>
  );
}
