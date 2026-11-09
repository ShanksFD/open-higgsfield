import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Site-wide HTTP Basic Auth. Active only when SITE_USER and SITE_PASSWORD are
    both set, so local dev without them stays open. Returns a 401 challenge when
    the request lacks valid credentials, or null to let it through. */
export function requireBasicAuth(request: NextRequest): NextResponse | null {
  const user = process.env.SITE_USER;
  const password = process.env.SITE_PASSWORD;
  if (!user || !password) return null;

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {}
    const sep = decoded.indexOf(":");
    if (sep !== -1 && safeEqual(decoded.slice(0, sep), user) && safeEqual(decoded.slice(sep + 1), password)) {
      return null;
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="OpenHiggsfield", charset="UTF-8"' },
  });
}

function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
