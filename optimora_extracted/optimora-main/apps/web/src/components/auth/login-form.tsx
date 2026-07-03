"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type Step = "email" | "sent" | "verifying" | "error";

interface LoginFormProps {
  initialToken?: string;
  nextPath: string;
  demoLoginEnabled?: boolean;
}

export function LoginForm({ initialToken, nextPath, demoLoginEnabled = false }: LoginFormProps) {
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

  async function enterDemoMode() {
    if (busy) return;
    setBusy(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/demo-login", { method: "POST" });
      if (!res.ok) {
        setErrorMsg("Demo login is not enabled for this deployment.");
        setStep("error");
      } else {
        router.replace(nextPath);
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
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
        <p className="mt-0.5 text-xs text-gray-500">Enter your email to receive a sign-in link.</p>
      </div>

      {step === "error" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorMsg}</p>
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

      {demoLoginEnabled && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] font-medium uppercase text-gray-400">Demo</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <button
            type="button"
            onClick={() => void enterDemoMode()}
            disabled={busy}
            className={cn(
              "w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              busy
                ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
            )}
          >
            {busy ? "Opening demo..." : "Continue with Demo Workspace"}
          </button>
          <p className="text-center text-[11px] leading-4 text-gray-500">
            Demo Mode keeps integrations disconnected.
          </p>
        </>
      )}
    </div>
  );
}
