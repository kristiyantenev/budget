import { z } from "zod";

// ADR-36: the one open-redirect check. Route every caller-supplied destination through it,
// and never duplicate it or test the raw string instead.
export function resolveReturnTo(value: FormDataEntryValue | null, baseURL: string) {
  const returnTo = z.string().safeParse(value);
  const appOrigin = new URL(baseURL).origin;

  const destination =
    returnTo.success && returnTo.data.startsWith("/") ? URL.parse(returnTo.data, appOrigin) : null;

  // Keep the origin: a normalized pathname can begin with // and name another host.
  return destination?.origin === appOrigin
    ? `${destination.origin}${destination.pathname}${destination.search}`
    : `${appOrigin}/`;
}
