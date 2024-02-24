import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import theme from "./theme";
import TickettoClientProvider from "../components/ticketto-client.provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#111421" }}>
        <AppRouterCacheProvider>
          <TickettoClientProvider>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
          </TickettoClientProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
