import AuthenticatedTickettoClient from "../_components/Layout/AuthenticatedTickettoClient.tsx";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
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
          <AuthenticatedTickettoClient>{children}</AuthenticatedTickettoClient>
        </ThemeProvider>
      </body>
    </html>
  );
}
