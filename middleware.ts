import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/db/supabase/middleware";

/**
 * Session refresh and route protection.
 *
 * BR-1.6: every screen except sign-in and registration requires a session.
 *
 * The session refresh has to happen here because Server Components cannot write cookies -
 * without it a session would silently expire mid-visit.
 */

const PUBLIC_PATHS = ["/sign-in", "/register"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/search";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
