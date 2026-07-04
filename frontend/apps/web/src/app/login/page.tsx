/**
 * Login page - magic-link flow.
 * Step 1: Enter email -> POST /api/auth/magic-link -> "check your email"
 * Step 2: /login?token=<tok> -> POST /api/auth/magic-link/verify -> redirect to /dashboard
 * Local dev without PLATFORM_API_URL can use the stub session.
 */
import { LoginForm } from "@/components/auth/login-form";
import { isLocalDevStubEnabled } from "@/lib/auth-mode";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

interface LoginPageProps {
  searchParams: Promise<{ token?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Already authenticated - skip to dashboard
  const session = await requireSession();
  if (session) redirect("/dashboard");

  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white text-xl font-bold">
            O
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Optimora</h1>
          <p className="mt-1 text-sm text-gray-500">Agency & AI Agent Portal</p>
        </div>

        <LoginForm
          initialToken={params.token}
          nextPath={params.next ?? "/dashboard"}
          googleOAuthEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_OAUTH_REDIRECT_URI)}
        />

        {isLocalDevStubEnabled() && (
          <p className="text-center text-xs text-amber-600">
            Dev mode - set PLATFORM_API_URL for live auth
          </p>
        )}
      </div>
    </div>
  );
}
