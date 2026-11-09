import { issueSignedToken, presignUrl } from "@vercel/blob";

import type { GenerationPlane } from "./catalog/types";
import { parseDeviceId } from "./device";
import { MEDIA_PREFIX } from "./media-url";

/* Uploads live in a private Blob store. The app refers to each one by an
   app-relative address, /api/media/<pathname>, which the media route streams
   to the signed-in browser. Higgsfield cannot reach that address, so at submit
   time each one is swapped for a short-lived signed link straight to Blob. */

/** How long the signed link handed to Higgsfield stays valid. Covers time in
    the queue before the platform downloads the file. */
const SIGNED_URL_TTL_MS = 6 * 60 * 60 * 1000;

const PATHNAME_RE = /^[A-Za-z0-9_-]{16,64}\/[A-Za-z0-9._-]+$/;

/** The blob pathname behind an app media address, or null when the address is
    not one, or the file belongs to another device. */
export function ownedPathname(url: string, deviceCookie: string | undefined): string | null {
  if (!url.startsWith(MEDIA_PREFIX)) return null;
  const pathname = url.slice(MEDIA_PREFIX.length);
  return isOwnedPathname(pathname, deviceCookie) ? pathname : null;
}

export function isOwnedPathname(pathname: string, deviceCookie: string | undefined): boolean {
  const deviceId = parseDeviceId(deviceCookie);
  return !!deviceId && PATHNAME_RE.test(pathname) && pathname.startsWith(`${deviceId}/`);
}

export function blobToken(): string {
  const token = process.env.OPEN_HIGGSFIELD_READ_WRITE_TOKEN;
  if (!token) throw new Error("Missing OPEN_HIGGSFIELD_READ_WRITE_TOKEN");
  return token;
}

/** Replaces every app media address in the plane with a signed Blob link. */
export async function signPlaneMedia(
  plane: GenerationPlane,
  deviceCookie: string | undefined,
): Promise<GenerationPlane> {
  const media: GenerationPlane["media"] = {};
  for (const [role, items] of Object.entries(plane.media) as [
    keyof GenerationPlane["media"],
    NonNullable<GenerationPlane["media"][keyof GenerationPlane["media"]]>,
  ][]) {
    media[role] = await Promise.all(
      items.map(async (item) => {
        if (!item.url.startsWith(MEDIA_PREFIX)) return item;
        const pathname = ownedPathname(item.url, deviceCookie);
        if (!pathname) throw new Error("Uploaded file not found for this device. Upload it again.");
        return { ...item, url: await signedUrl(pathname) };
      }),
    );
  }
  return { ...plane, media };
}

async function signedUrl(pathname: string): Promise<string> {
  const validUntil = Date.now() + SIGNED_URL_TTL_MS;
  const signed = await issueSignedToken({
    token: blobToken(),
    pathname,
    operations: ["get"],
    validUntil,
  });
  const { presignedUrl } = await presignUrl(signed, {
    operation: "get",
    pathname,
    validUntil,
    access: "private",
  });
  return presignedUrl;
}
