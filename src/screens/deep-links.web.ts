// Links into Saifu Web (T-030-18; features/030-saifu/plan.md §5.1a). On the web
// a link into Saifu is the page's own address: `/checkout#<token>` or
// `/invitations#<token>` on Saifu's origin, which the host serves as the app.
// The address the page opened at is the first link, and a change of fragment
// while it runs — the same page opened with another token — is the next.
//
// Once read, the token is taken out of the address bar, so it is not kept in
// the browser's history and a reload does not act on the link a second time.

import { useEffect, useState } from "react";
import { type LinkConfig, parseSaifuLink, type SaifuLink } from "../links/links.ts";

export interface IncomingLink {
  readonly link: SaifuLink;
  /** Distinguishes two arrivals of the same link. */
  readonly arrival: number;
}

export function useIncomingLinks(config: LinkConfig): IncomingLink | null {
  const [incoming, setIncoming] = useState<IncomingLink | null>(null);
  const { linkBase } = config;
  useEffect(() => {
    let arrivals = 0;
    const receive = () => {
      const link = parseSaifuLink(window.location.href, { linkBase });
      if (link === null) return;
      window.history.replaceState(window.history.state, "", "/");
      setIncoming({ link, arrival: ++arrivals });
    };
    receive();
    window.addEventListener("hashchange", receive);
    return () => window.removeEventListener("hashchange", receive);
  }, [linkBase]);
  return incoming;
}
