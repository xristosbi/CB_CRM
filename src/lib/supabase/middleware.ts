import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "./env";

const PUBLIC_PATHS = ["/login"];

// Headers the proxy forwards to the Server Component render once the JWT is
// verified here — lets (dashboard)/layout.tsx read "who is this" without a
// second network round trip to Supabase Auth on every single navigation.
export const USER_ID_HEADER = "x-cb-crm-user-id";
export const USER_EMAIL_HEADER = "x-cb-crm-user-email";

export async function updateSession(request: NextRequest) {
  // Routes under /api (e.g. the Facebook Lead Ads webhook) are called
  // server-to-server by third parties, not a logged-in browser session, and
  // must never be redirected either way — they return JSON/plain text, not
  // HTML pages. Any auth they need is handled inside the route itself.
  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next({ request });
  }

  // Local/dev convenience: without Supabase configured there is no auth to
  // enforce, so let requests through untouched (pages fall back to demo data).
  if (!hasSupabaseEnv()) {
    return NextResponse.next({ request });
  }

  const requestHeaders = new Headers(request.headers);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() verifies the JWT locally against the project's cached JWKS
  // when the project uses asymmetric signing keys — no network call once
  // warm. On a legacy HS256 (shared-secret) project it transparently falls
  // back to getUser() internally, so this is never worse than before and
  // is free to upgrade once the project migrates signing keys.
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims ?? null;

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!claims && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (claims && isPublicPath) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/leads";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  if (claims) {
    const userId = typeof claims.sub === "string" ? claims.sub : "";
    const email = typeof claims.email === "string" ? claims.email : "";
    requestHeaders.set(USER_ID_HEADER, userId);
    requestHeaders.set(USER_EMAIL_HEADER, email);
    // The response object may have already been built (above, inside
    // setAll) with the pre-claims requestHeaders reference — rebuild it
    // once more so the forwarded request actually carries the two headers,
    // while keeping any Set-Cookie headers that refresh already queued.
    const withHeaders = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.getAll().forEach((cookie) => withHeaders.cookies.set(cookie));
    response = withHeaders;
  }

  return response;
}
