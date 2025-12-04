"use client";

import { TickettoClientProvider } from "../../providers/TickettoClientProvider.tsx";
import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTickettoConfig } from "../../hooks/config.ts";
import { webAuthnService } from "../../lib/webauthn/handler.ts";

export default function UnauthenticatedTickettoClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const user = webAuthnService.getCurrentUser();
    if (user) {
      return router.push("/events");
    }
  }, [router]);

  // Create the Polkadot client (same as authenticated version)
  const config = useTickettoConfig();
  const client = createClient(
    getWsProvider(
      process.env.NEXT_PUBLIC_CHAIN_ENDPOINT ?? "wss://kreivo.kippu.rocks"
    )
  );

  // If user is authenticated, component will redirect in useEffect
  // If user is not authenticated, render with undefined signer
  return (
    <TickettoClientProvider signer={undefined} config={config} client={client}>
      {children}
    </TickettoClientProvider>
  );
}
