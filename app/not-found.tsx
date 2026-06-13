import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-4 text-center">
      <div className="auth-glow -left-40 -top-40 h-[28rem] w-[28rem]" aria-hidden="true" />
      <div className="auth-glow -bottom-40 -right-40 h-[28rem] w-[28rem]" style={{ animationDelay: "-4s" }} aria-hidden="true" />

      <div className="page-fade relative flex flex-col items-center">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/animation-frames/gini-a1-f3.svg"
            alt=""
            width={160}
            height={160}
            draggable={false}
            style={{ imageRendering: "pixelated" }}
            className="select-none object-contain"
          />

          <div className="pointer-events-none absolute right-2 top-4" aria-hidden="true">
            <span className="zzz-letter absolute font-mono text-base font-bold text-ink-tertiary" style={{ animationDelay: "0s" }}>
              Z
            </span>
            <span className="zzz-letter absolute font-mono text-base font-bold text-ink-tertiary" style={{ animationDelay: "0.8s" }}>
              Z
            </span>
            <span className="zzz-letter absolute font-mono text-base font-bold text-ink-tertiary" style={{ animationDelay: "1.6s" }}>
              Z
            </span>
          </div>
        </div>

        <h1 className="mt-6 text-6xl font-bold tracking-tight text-ink">404</h1>
        <p className="mt-2 text-lg font-medium text-ink">This page flew off somewhere</p>
        <p className="mt-1 max-w-sm text-sm text-ink-secondary">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <Link
          href="/dashboard"
          className="mt-6 flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-bg shadow-accent-inset transition-all duration-150 hover:bg-accent-glow active:scale-[0.97]"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
