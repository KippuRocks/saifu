import {
  BottomNavigation,
  BottomNavigationAction,
  CssBaseline,
  Paper,
} from "@mui/material";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ClientSideLayout } from "@/components";
import LocalActivityIcon from "@mui/icons-material/LocalActivity";
import LogoutIcon from "@mui/icons-material/Logout";
import { ThemeProvider } from "@mui/material/styles";
import { cookies } from "next/headers";
import theme from "../theme";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const accountId = (await cookies())?.get("accountId")?.value;

  return (
    <html lang="en">
      <body>
        {/**  style={{ backgroundColor: "#111421" }} */}
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ClientSideLayout accountId={accountId}>
              {children}
              <Paper
                sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
                elevation={3}
              >
                <BottomNavigation showLabels>
                  <BottomNavigationAction
                    href="/events"
                    label="Events"
                    icon={<LocalActivityIcon />}
                  />
                  <BottomNavigationAction
                    href="/auth/logout"
                    label="Logout"
                    icon={<LogoutIcon />}
                  />
                </BottomNavigation>
              </Paper>
            </ClientSideLayout>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
