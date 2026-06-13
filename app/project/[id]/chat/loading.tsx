import PixelLoader from "@/components/PixelLoader";

export default function ChatLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <PixelLoader size={48} label="Loading chat" />
    </div>
  );
}
