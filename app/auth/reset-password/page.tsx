"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const supabase = createClient();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-12">
      <div className="auth-glow -left-40 -top-40 h-[28rem] w-[28rem]" aria-hidden="true" />
      <div className="auth-glow -bottom-40 -right-40 h-[28rem] w-[28rem]" style={{ animationDelay: "-4s" }} aria-hidden="true" />

      <div className="page-fade glass relative w-full max-w-[400px] rounded-2xl border border-border p-8 shadow-glow-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-elevated text-ink-secondary">
            <KeyRound size={20} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold text-ink">Set a new password</h1>
          <p className="mt-1 text-sm text-ink-secondary">Choose a new password for your Datagini account</p>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
              Password updated successfully.
            </p>
            <a
              href="/dashboard"
              className="block w-full rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-medium text-bg transition-all duration-150 hover:bg-accent-glow hover:shadow-glow-md active:scale-[0.97]"
            >
              Go to dashboard
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-ink-secondary">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-all duration-150 hover:bg-accent-glow hover:shadow-glow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
