import { NextResponse, NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const headers = request.headers;
  headers.set("x-url", url.pathname);

  if (request.cookies.has("accountId")) {
    return url.pathname !== "/"
      ? NextResponse.next({
          request: {
            headers,
          },
        })
      : NextResponse.redirect(new URL("/events", url));
  }

  // Redirect to login page if not authenticated
  return url.pathname === "/"
    ? NextResponse.next({
        request: {
          headers,
        },
      })
    : NextResponse.redirect(new URL("/", url));
}

export const config = {
  matcher: ["/", "/events/:path*", "/tickets/:path*"],
};
