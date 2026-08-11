import { NextResponse } from "next/server";

function isProtectedAdminRequest(request) {
  const { pathname } = request.nextUrl;
  if (pathname === "/queue-admin.html") return true;
  if (pathname === "/api/queue") return request.method === "GET";
  if (pathname.startsWith("/api/queue/") && pathname !== "/api/queue/availability") return true;
  return false;
}

function safeEqual(actual, expected) {
  const left = String(actual || "");
  const right = String(expected || "");
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return mismatch === 0;
}

function unauthorized(message = "Authentication required") {
  return new NextResponse(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Boom Reading Admin", charset="UTF-8"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function proxy(request) {
  if (process.env.VERCEL !== "1" || !isProtectedAdminRequest(request)) return NextResponse.next();

  const expectedUser = process.env.QUEUE_ADMIN_USER;
  const expectedPassword = process.env.QUEUE_ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    return new NextResponse("Admin authentication is not configured", {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }

  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Basic ")) return unauthorized();

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    if (separator < 0 || !safeEqual(username, expectedUser) || !safeEqual(password, expectedPassword)) return unauthorized("Invalid credentials");
  } catch {
    return unauthorized("Invalid credentials");
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export const config = {
  matcher: ["/queue-admin.html", "/api/queue/:path*"],
};
