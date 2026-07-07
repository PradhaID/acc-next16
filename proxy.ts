import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const publicAccountPaths = ["/account/signin", "/account/signup", "/account/verify-otp"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  const isPublicAccountPath = publicAccountPaths.some((p) => pathname.startsWith(p));

  if (isPublicAccountPath) {
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/account/")) {
    if (!token) {
      return NextResponse.redirect(new URL("/account/signin", request.url));
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL("/account/signin", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/accounting") || pathname.startsWith("/system")) {
    if (!token) {
      return NextResponse.redirect(new URL("/account/signin", request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL("/account/signin", request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/accounting/:path*", "/system/:path*", "/account/:path*"],
};
