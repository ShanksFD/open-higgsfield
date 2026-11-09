import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireBasicAuth } from "./basic-auth";
import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS, resolveDeviceId } from "./generation/device";

export function proxy(request: NextRequest) {
  const denied = requireBasicAuth(request);
  if (denied) return denied;
  // API routes run here only for the auth check; /api/blob handles its own device cookie.
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();

  const { deviceId, minted } = resolveDeviceId(request.cookies.get(DEVICE_COOKIE)?.value);
  if (!minted) return NextResponse.next();
  const response = NextResponse.next();
  response.cookies.set(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTIONS);
  return response;
}

export const config = {
  // The second entry keeps /api/media/*.png etc. behind the login despite the image-extension skip.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    "/api/:path*",
  ],
};
