"use client";

import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import GiniMascot from "@/components/GiniMascot";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v2.97h3.86c2.26-2.09 3.56-5.17 3.56-8.79z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.97c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.07C3.24 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.31A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.37-2.31V6.62H1.27A11.96 11.96 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38l4-3.07z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.24 2.7 1.27 6.62l4 3.07C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const supabase = createClient();
  const siteUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL ?? "";

  useEffect(() => {
    if (!window.location.hash) return;

    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const errorCode = hashParams.get("error_code");
    const errorDescription = hashParams.get("error_description");

    if (errorCode === "otp_expired") {
      setError(
        "That confirmation or magic link has expired or already been used. If you already verified your email, sign in below — otherwise request a new link."
      );
    } else if (errorDescription) {
      setError(errorDescription.replace(/\+/g, " "));
    }

    if (errorCode || errorDescription) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  async function handleGoogleSignIn() {
    setError(null);
    setMessage(null);
    setLoading("google");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading("email");

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${siteUrl}/auth/callback` },
      });

      if (error) {
        setError(error.message);
      } else if (data.session) {
        window.location.href = "/dashboard";
        return;
      } else {
        setMessage("Check your email to confirm your account.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
      } else {
        window.location.href = "/dashboard";
        return;
      }
    }

    setLoading(null);
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your email above first.");
      return;
    }

    setError(null);
    setMessage(null);
    setLoading("magic");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email for a magic sign-in link.");
    }

    setLoading(null);
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email above first.");
      return;
    }

    setError(null);
    setMessage(null);
    setLoading("reset");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email for a password reset link.");
    }

    setLoading(null);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-12">
      <div
        className="auth-glow -left-40 -top-40 h-[28rem] w-[28rem]"
        aria-hidden="true"
      />
      <div
        className="auth-glow -bottom-40 -right-40 h-[28rem] w-[28rem]"
        style={{ animationDelay: "-4s" }}
        aria-hidden="true"
      />

      <Link
        href="/"
        className="absolute left-4 top-4 flex items-center gap-1.5 text-sm text-ink-secondary transition-colors duration-150 hover:text-ink sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="page-fade glass relative w-full max-w-[400px] rounded-2xl border border-border p-8 shadow-glow-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center">
            <GiniMascot size={40} />
          </div>
          <h1 className="text-2xl font-semibold text-ink">
            {mode === "signin" ? "Sign in to Datagini" : "Create your Datagini account"}
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">Talk to your database</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-all duration-150 hover:border-border-bright hover:bg-elevated active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wide text-ink-dim">or continue with email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-ink-secondary">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-medium text-ink-secondary">
                Password
              </label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-ink-dim transition-colors duration-150 hover:text-ink"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 pr-10 text-sm text-ink placeholder-ink-dim transition-all duration-150 focus:border-accent focus:outline-none focus:shadow-glow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-dim transition-colors duration-150 hover:text-ink-secondary"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
          {message && (
            <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading !== null}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-all duration-150 hover:bg-accent-glow hover:shadow-glow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "email" && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={loading !== null}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-ink-secondary transition-all duration-150 hover:border-border-bright hover:text-ink active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "magic" && <Loader2 className="h-4 w-4 animate-spin" />}
          Send me a magic link
        </button>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setMessage(null);
            }}
            className="font-medium text-ink transition-colors duration-150 hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
