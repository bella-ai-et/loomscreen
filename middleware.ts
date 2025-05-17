import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "./lib/supabase/server";
import aj, { createMiddleware, detectBot, shield } from "./lib/arcjet";

const publicPaths = [
  "/sign-in",
  "/sign-up",
  "/auth/callback",
  "/api/auth",
  "/_next",
  "/favicon.ico",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  try {
    // First apply Arcjet validation
    const arcjetValidate = createMiddleware(validate);
    const validateResponse = await arcjetValidate(request);
    if (validateResponse !== undefined) {
      return validateResponse;
    }

    // Then check authentication
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      const redirectUrl = new URL("/sign-in", request.url);
      redirectUrl.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
}

const validate = aj
  .withRule(
    shield({
      mode: "LIVE",
    })
  )
  .withRule(
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE", "G00G1E_CRAWLER"],
    })
  );

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up|assets).*)"],
};
