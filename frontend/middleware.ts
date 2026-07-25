import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * The single gate in front of the workspace.
 *
 * Two jobs, in order: refresh the Supabase auth token (which only middleware can
 * do), then decide whether this request is allowed through. Every `/app` route is
 * verified here rather than inside each page, so there is exactly one place to
 * read to know what is protected.
 *
 * The marketing site, `/login` and the style guide stay public on purpose — none
 * of them touch a run, a report or the mailer.
 */
export async function middleware(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // Already signed in? The login form has nothing to offer.
  if (pathname === "/login") {
    if (userId) return NextResponse.redirect(new URL("/app", request.url));
    return response;
  }

  if (!userId) {
    const login = new URL("/login", request.url);
    // Bounce them back to what they actually asked for once they are in.
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
