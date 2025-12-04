import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import UnauthenticatedTickettoClient from "../_components/Layout/UnauthenticatedTickettoClient.tsx";
import theme from "../theme.ts";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <UnauthenticatedTickettoClient>
            {children}
          </UnauthenticatedTickettoClient>
        </ThemeProvider>
      </body>
    </html>
  );
}
