import { get } from "@vercel/blob";
import { cookies } from "next/headers";

import { DEVICE_COOKIE } from "@/generation/device";
import { blobToken, isOwnedPathname } from "@/generation/private-media";

/** Streams a private upload to the device that uploaded it. */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const pathname = (await params).path.join("/");
  const jar = await cookies();
  if (!isOwnedPathname(pathname, jar.get(DEVICE_COOKIE)?.value)) {
    return new Response(null, { status: 404 });
  }

  const result = await get(pathname, { access: "private", token: blobToken() });
  if (!result || result.statusCode !== 200) return new Response(null, { status: 404 });

  return new Response(result.stream, {
    headers: {
      "content-type": result.blob.contentType,
      "content-length": String(result.blob.size),
      "cache-control": "private, max-age=86400, immutable",
    },
  });
}
