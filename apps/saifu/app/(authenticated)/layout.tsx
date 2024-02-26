import { cookies } from "next/headers";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { ClientSide } from "@/components";
import theme from "../theme";
import {
  BottomNavigation,
  BottomNavigationAction,
  CssBaseline,
  Paper,
} from "@mui/material";

import LocalActivityIcon from "@mui/icons-material/LocalActivity";
import LogoutIcon from "@mui/icons-material/Logout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const accountId = cookies().get("accountId")?.value;

  return (
    <html lang="en">
      <body>
        {/**  style={{ backgroundColor: "#111421" }} */}
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ClientSide accountId={accountId}>
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
            </ClientSide>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
