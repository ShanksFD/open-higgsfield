/** App-relative address of a private upload, streamed by /api/media. */
export const MEDIA_PREFIX = "/api/media/";

export function mediaUrl(pathname: string): string {
  return MEDIA_PREFIX + pathname;
}
