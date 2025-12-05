"use client";

import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import { PapiSigner, getPapiSigner } from "../../hooks/papi.signer";
import { useEffect, useState } from "react";

import LocalActivityIcon from "@mui/icons-material/LocalActivity";
import LogoutIcon from "@mui/icons-material/Logout";
import { TickettoClientProvider } from "../../providers/TickettoClientProvider";
import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider";
import { useRouter } from "next/navigation";
import { useTickettoConfig } from "../../hooks/config";
import { useTranslations } from "next-intl";
import { webAuthnService } from "../../lib/webauthn/handler";

export default function AuthenticatedTickettoClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const [signer, setSigner] = useState<PapiSigner | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const user = webAuthnService.getCurrentUser();
    if (!user) {
      return router.push("/");
    }

    console.log(`Current user is: ${user.email}`);
    getPapiSigner(user.email).then((account) => setSigner(account));
  }, [router]);

  const handleLogout = () => {
    webAuthnService.logout();
    return router.push("/");
  };

  if (!signer) {
    // Or a loading spinner
    return null;
  }

  // Create the Polkadot client
  const config = useTickettoConfig();
  const client = createClient(
    getWsProvider(
      process.env.NEXT_PUBLIC_CHAIN_ENDPOINT ?? "wss://kreivo.kippu.rocks"
    )
  );

  return (
    <TickettoClientProvider signer={signer} config={config} client={client}>
      {children}
      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
        elevation={3}
      >
        <BottomNavigation showLabels>
          <BottomNavigationAction
            href="/events"
            label={t("events.title")}
            icon={<LocalActivityIcon />}
          />
          <BottomNavigationAction
            onClick={handleLogout}
            label={t("auth.logout")}
            icon={<LogoutIcon />}
          />
        </BottomNavigation>
      </Paper>
    </TickettoClientProvider>
  );
}
