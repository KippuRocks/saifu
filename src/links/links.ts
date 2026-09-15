// The links that open Saifu (T-030-10): Ichiba's checkout handoff and an
// organiser's invitation. Documented in README.md, "Links into Saifu".
//
//   <link base>/checkout#<handoff token>      checkout handoff (AD-19 A, F-022 §5.1)
//   <link base>/invitations#<token>          guest invitation (F-021 §5.6)
//
// The link base is an https origin (SAIFU_LINK_BASE). Its host vouches for the
// app — `applinks` on iOS, verified App Links on Android — so a link opens
// Saifu where it is installed. The token rides in the fragment: a browser never
// sends a fragment to the server, so a token is not written to the link host's
// request logs when a link is opened on a phone without Saifu.
//
// Development builds also accept Saifu's own scheme: `saifu://checkout#<token>`
// and `saifu://invitations#<token>`.

export type SaifuLink =
  | { readonly kind: "checkout"; readonly handoffToken: string }
  | { readonly kind: "invitation"; readonly token: string };

/** kippu-api's tokens: 32 random bytes, base64url without padding. */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

const PATHS = { checkout: "checkout", invitation: "invitations" } as const;

export interface LinkConfig {
  /** An https origin, such as `https://saifu.kippu.example`. */
  readonly linkBase: string;
  /** Saifu's URL scheme, accepted in development builds. */
  readonly scheme?: string;
}

function linkOf(kind: SaifuLink["kind"], token: string): SaifuLink | null {
  if (!TOKEN.test(token)) return null;
  return kind === "checkout" ? { kind, handoffToken: token } : { kind, token };
}

function kindOf(segment: string): SaifuLink["kind"] | null {
  if (segment === PATHS.checkout) return "checkout";
  if (segment === PATHS.invitation) return "invitation";
  return null;
}

/** The link a URL is, or `null` for any URL that is not one of Saifu's links. */
export function parseSaifuLink(url: string, config: LinkConfig): SaifuLink | null {
  const hash = url.indexOf("#");
  if (hash < 0) return null;
  const token = url.slice(hash + 1);
  const target = url.slice(0, hash);

  if (config.scheme !== undefined && target.startsWith(`${config.scheme}://`)) {
    const kind = kindOf(target.slice(config.scheme.length + 3).replace(/\/+$/, ""));
    return kind === null ? null : linkOf(kind, token);
  }

  let parsed: URL;
  let base: URL;
  try {
    parsed = new URL(target);
    base = new URL(config.linkBase);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.host !== base.host || parsed.search !== "") {
    return null;
  }
  const kind = kindOf(parsed.pathname.replace(/^\/+|\/+$/g, ""));
  return kind === null ? null : linkOf(kind, token);
}

/** The https link for a checkout handoff, as Ichiba builds it. */
export function checkoutLink(linkBase: string, handoffToken: string): string {
  if (!TOKEN.test(handoffToken)) throw new TypeError("not a handoff token");
  return `${linkBase.replace(/\/+$/, "")}/${PATHS.checkout}#${handoffToken}`;
}

/** The https link for an invitation, as Ibento builds it. */
export function invitationLink(linkBase: string, token: string): string {
  if (!TOKEN.test(token)) throw new TypeError("not an invitation token");
  return `${linkBase.replace(/\/+$/, "")}/${PATHS.invitation}#${token}`;
}
