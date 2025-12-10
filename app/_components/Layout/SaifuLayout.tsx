"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthenticationContext } from "../../hooks/useAuthentication";
import { ClientAccountProvider } from "@ticketto/protocol";
import { TickettoClientProvider } from "../../providers/TickettoClientProvider";
import { VirtoWebAuthnService } from "../../lib/virto-connect";
import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider";
import { useRouter } from "next/navigation";
import { useTickettoConfig } from "../../hooks/config";

interface SaifuLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  redirectToAuthenticated?: string;
  redirectToUnauthenticated?: string;
}

export default function SaifuLayout({
  children,
  showNavigation = false,
  redirectToAuthenticated = "/events",
  redirectToUnauthenticated = "/",
}: SaifuLayoutProps) {
  const [accountProvider, setAccountProvider] = useState<
    ClientAccountProvider | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Create the Polkadot client (common for both authenticated and unauthenticated)
  const config = useTickettoConfig();
  const client = createClient(
    getWsProvider(
      process.env.NEXT_PUBLIC_CHAIN_ENDPOINT ?? "wss://kreivo.kippu.rocks"
    )
  );

  const authService = useMemo(() => new VirtoWebAuthnService(client), [client]);

  // Common authentication and client setup logic
  useEffect(() => {
    const user = authService.getCurrentUser();

    // Handle routing based on authentication state
    if (user && redirectToAuthenticated) {
      // User is authenticated but we shouldn't redirect in authenticated mode
      if (showNavigation) {
        // This is authenticated mode - setup signer
        console.log(`Current user is: ${user.login.email}`);
        authService
          .getAccountProvider()
          .then((provider) => setAccountProvider(provider))
          .catch((err) => console.error("Failed to get account provider", err))
          .finally(() => setIsLoading(false));
      } else {
        // This is unauthenticated mode - redirect to authenticated area
        router.push(redirectToAuthenticated);
        setIsLoading(false);
      }
    } else if (!user && redirectToUnauthenticated) {
      // User is not authenticated
      if (showNavigation) {
        // This should be authenticated mode but user is not authenticated
        router.push(redirectToUnauthenticated);
        setIsLoading(false);
      } else {
        // This is unauthenticated mode - no redirect needed
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [
    router,
    showNavigation,
    redirectToAuthenticated,
    redirectToUnauthenticated,
  ]);

  // Show loading state while determining authentication
  if (isLoading) {
    return null;
  }

  return (
    <AuthenticationContext.Provider value={authService}>
      <TickettoClientProvider
        accountProvider={showNavigation ? accountProvider : undefined}
        config={config}
        client={client}
      >
        {children}
      </TickettoClientProvider>
    </AuthenticationContext.Provider>
  );
}
