"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type Step = "email" | "sent" | "verifying" | "error";

interface LoginFormProps {
  initialToken?: string;
  nextPath: string;
  googleOAuthEnabled?: boolean;
}

export function LoginForm({ initialToken, nextPath, googleOAuthEnabled = false }: LoginFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialToken ? "verifying" : "email");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-verify if token present in URL
  useEffect(() => {
    if (!initialToken) return;
    void verifyToken(initialToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  async function requestLink() {
    if (!email.trim() || busy) return;
    setBusy(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setErrorMsg(
          err.error === "invalid_email"
            ? "Please enter a valid email."
            : "Something went wrong. Try again.",
        );
        setStep("error");
      } else {
        setStep("sent");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("error");
    } finally {
      setBusy(false);
    }
  }

  async function verifyToken(token: string) {
    setBusy(true);
    setStep("verifying");
    try {
      const res = await fetch("/api/auth/magic-link/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setErrorMsg(
          err.error === "invalid_token"
            ? "This link is invalid or expired."
            : "Verification failed.",
        );
        setStep("error");
      } else {
        router.replace(nextPath);
      }
    } catch {
      setErrorMsg("Network error during verification.");
      setStep("error");
    } finally {
      setBusy(false);
    }
  }

  if (step === "verifying") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="mb-3 mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Verifying your link...</p>
      </div>
    );
  }

  if (step === "sent") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm space-y-2">
        <p className="text-sm font-medium text-gray-900">Check your email</p>
        <p className="text-sm text-gray-500">
          We sent a sign-in link to <strong>{email}</strong>.<br />
          Click the link to continue.
        </p>
        <button
          type="button"
          onClick={() => setStep("email")}
          className="text-xs text-brand-600 hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Sign in</h2>
        <p className="mt-0.5 text-xs text-gray-500">Continue with Google or your email.</p>
      </div>

      {step === "error" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorMsg}</p>
      )}

      {googleOAuthEnabled && (
        <>
          <a
            href={`/api/auth/oauth/google/start?next=${encodeURIComponent(nextPath)}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
            </svg>
            Continue with Google
          </a>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] font-medium uppercase text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
        </>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void requestLink();
        }}
        className="space-y-3"
      >
        <input
          type="email"
          required
          autoFocus
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className={cn(
            "w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
            busy || !email.trim()
              ? "cursor-not-allowed bg-brand-300"
              : "bg-brand-600 hover:bg-brand-700",
          )}
        >
          {busy ? "Sending..." : "Send sign-in link"}
        </button>
      </form>
    </div>
  );
}
