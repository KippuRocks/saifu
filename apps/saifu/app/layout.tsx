"use client";

import "reflect-metadata";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import theme from "./theme";
import TickettoClientProvider from "../components/ticketto-client.provider";
import { useEffect, useState } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClientSide, setIsClientSide] = useState(false);
  useEffect(() => {
    setIsClientSide(true);
  }, []);
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#111421" }}>
        <AppRouterCacheProvider>
          {isClientSide && (
            <TickettoClientProvider>
              <ThemeProvider theme={theme}>{children}</ThemeProvider>
            </TickettoClientProvider>
          )}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
