// Links into Saifu as they arrive (T-030-10): the URL that launched the app, and
// every URL opened while it runs. The only module that reads URLs; the app
// enters a screen for each Saifu link through the router (`enter`).

import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { type LinkConfig, parseSaifuLink, type SaifuLink } from "../links/links.ts";

export interface IncomingLink {
  readonly link: SaifuLink;
  /** Distinguishes two arrivals of the same link. */
  readonly arrival: number;
}

export function useIncomingLinks(config: LinkConfig): IncomingLink | null {
  const [incoming, setIncoming] = useState<IncomingLink | null>(null);
  const { linkBase, scheme } = config;
  useEffect(() => {
    let arrivals = 0;
    const receive = (url: string | null) => {
      if (url === null) return;
      const link = parseSaifuLink(url, scheme === undefined ? { linkBase } : { linkBase, scheme });
      if (link !== null) setIncoming({ link, arrival: ++arrivals });
    };
    Linking.getInitialURL()
      .then(receive)
      .catch(() => {});
    const subscription = Linking.addEventListener("url", ({ url }) => receive(url));
    return () => subscription.remove();
  }, [linkBase, scheme]);
  return incoming;
}
