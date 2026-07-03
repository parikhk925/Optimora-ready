/**
 * Next.js edge middleware - protects /dashboard/* routes.
 *
 * Checks for the access cookie. If missing, redirects to /login.
 * Full token validation happens in Server Components via getServerSession()
 * (edge middleware cannot call the platform API reliably in all deployments).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocalDevStubEnabled } from "@/lib/auth-mode";

const ACCESS_COOKIE = "optimora_access";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard dashboard routes
  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  // Local development without platform auth can render the dashboard with a stub session.
  if (isLocalDevStubEnabled()) return NextResponse.next();

  const hasAccessCookie = req.cookies.has(ACCESS_COOKIE);
  const hasRefreshCookie = req.cookies.has("optimora_refresh");

  // If neither cookie present, redirect to login
  if (!hasAccessCookie && !hasRefreshCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
