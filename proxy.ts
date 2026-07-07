import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const publicAccountPaths = ["/account/signin", "/account/signup", "/account/verify-otp"];

const routeRoleCheck: { prefix: string; roleUrlPrefix: string }[] = [
  { prefix: "/dashboard", roleUrlPrefix: "/dashboard" },
  { prefix: "/accounting", roleUrlPrefix: "/accounting" },
  { prefix: "/system", roleUrlPrefix: "/system" },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Public auth pages — redirect to dashboard if already signed in
  if (publicAccountPaths.some((p) => pathname.startsWith(p))) {
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  const needsAuth = routeRoleCheck.some((r) => pathname.startsWith(r.prefix)) || pathname.startsWith("/account/");

  if (!needsAuth) {
    return NextResponse.next();
  }

  // Authenticate
  if (!token) {
    return NextResponse.redirect(new URL("/error/401", request.url));
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/error/401", request.url));
  }

  // Authorize — check roleUrl for module-level routes
  const matched = routeRoleCheck.find((r) => pathname.startsWith(r.prefix));
  if (matched) {
    const ok = (payload.roleUrls || []).some((url: string) =>
      url.startsWith(matched.roleUrlPrefix)
    );
    if (!ok) {
      return NextResponse.redirect(new URL("/error/403", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/accounting/:path*", "/system/:path*", "/account/:path*"],
};
