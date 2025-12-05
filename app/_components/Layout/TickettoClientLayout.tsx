"use client";

import { PapiSigner, getPapiSigner } from "../../hooks/papi.signer";
import { useEffect, useState } from "react";

import BottomNavigation from "./BottomNavigation";
import { TickettoClientProvider } from "../../providers/TickettoClientProvider";
import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider";
import { useRouter } from "next/navigation";
import { useTickettoConfig } from "../../hooks/config";
import { useTranslations } from "next-intl";
import { webAuthnService } from "../../lib/webauthn/handler";

interface TickettoClientLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  redirectToAuthenticated?: string;
  redirectToUnauthenticated?: string;
}

export default function TickettoClientLayout({
  children,
  showNavigation = false,
  redirectToAuthenticated = "/events",
  redirectToUnauthenticated = "/",
}: TickettoClientLayoutProps) {
  const t = useTranslations();
  const [signer, setSigner] = useState<PapiSigner | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Common authentication and client setup logic
  useEffect(() => {
    const user = webAuthnService.getCurrentUser();

    // Handle routing based on authentication state
    if (user && redirectToAuthenticated) {
      // User is authenticated but we shouldn't redirect in authenticated mode
      if (showNavigation) {
        // This is authenticated mode - setup signer
        console.log(`Current user is: ${user.email}`);
        getPapiSigner(user.email)
          .then((account) => setSigner(account))
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

  // Handle logout
  const handleLogout = () => {
    webAuthnService.logout();
    router.push("/");
  };

  // Show loading state while determining authentication
  if (isLoading) {
    return null;
  }

  // Create the Polkadot client (common for both authenticated and unauthenticated)
  const config = useTickettoConfig();
  const client = createClient(
    getWsProvider(
      process.env.NEXT_PUBLIC_CHAIN_ENDPOINT ?? "wss://kreivo.kippu.rocks"
    )
  );

  return (
    <TickettoClientProvider
      signer={showNavigation ? signer : undefined}
      config={config}
      client={client}
    >
      {children}
      {showNavigation && <BottomNavigation />}
    </TickettoClientProvider>
  );
}
