import { NextResponse } from "next/server";

export function proxy(request) {
  if (process.env.VERCEL === "1" && request.nextUrl.pathname === "/queue-admin.html") {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/queue-admin.html"],
};
