import AuthenticatedTickettoClient from "../_components/Layout/AuthenticatedTickettoClient";
import { CssBaseline } from "@mui/material";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@mui/material/styles";
import { getMessages } from "next-intl/server";
import theme from "../theme";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <html lang="en">
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthenticatedTickettoClient>
              {children}
            </AuthenticatedTickettoClient>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
