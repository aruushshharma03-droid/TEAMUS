import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/bounties/new", "/wallet", "/test", "/triage", "/inbox", "/onboarding", "/dashboard"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get("testr_session")?.value;
  if (protectedPaths.some((p) => pathname.startsWith(p)) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/bounties/:path*", "/wallet", "/test/:path*", "/triage/:path*", "/inbox", "/onboarding/:path*", "/dashboard"],
};
