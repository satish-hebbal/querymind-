"use client";

import { Lock, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const OPEN_EVENT = "datagini:open-signin-unavailable";

/** Anything that would have led to sign in / sign up opens the notice instead. */
export function SignInUnavailableTrigger({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className={className}>
      {children}
    </button>
  );
}

/** Opens the notice as soon as the page mounts, for people who land on an auth page directly. */
export function OpenSignInUnavailable() {
  useEffect(() => {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }, []);
  return null;
}

export default function SignInUnavailable() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const onAuthPage = pathname?.startsWith("/auth") ?? false;

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    if (onAuthPage) router.push("/");
  };

  return (
    <div className="page-fade fixed inset-0 z-[110] flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-unavailable-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-glow-lg"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition-colors duration-150 hover:bg-elevated hover:text-ink"
        >
          <X size={16} strokeWidth={1.5} />
        </button>

        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-elevated text-ink-secondary">
          <Lock size={20} strokeWidth={1.5} />
        </div>

        <h2 id="signin-unavailable-title" className="text-lg font-semibold text-ink">
          Sign in is switched off
        </h2>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-secondary">
          <p>
            Sorry, you can&apos;t use Datagini anymore. Since the project is archived, the backend that handled accounts is
            no longer running, so signing in or creating an account won&apos;t work.
          </p>
          <p>The rest of this site still shows how it worked, so feel free to look around.</p>
        </div>

        <button
          type="button"
          onClick={close}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-all duration-150 hover:bg-accent-glow active:scale-[0.98]"
        >
          {onAuthPage ? "Back to home" : "Got it"}
        </button>
      </div>
    </div>
  );
}
