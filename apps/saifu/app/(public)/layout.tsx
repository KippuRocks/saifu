import { cookies } from "next/headers";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { ClientSide } from "@/components";
import theme from "../theme";
import { CssBaseline } from "@mui/material";

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
            <ClientSide accountId={accountId}>{children}</ClientSide>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
