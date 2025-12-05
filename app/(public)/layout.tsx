import { CssBaseline } from "@mui/material";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@mui/material/styles";
import UnauthenticatedTickettoClient from "../_components/Layout/UnauthenticatedTickettoClient";
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
            <UnauthenticatedTickettoClient>
              {children}
            </UnauthenticatedTickettoClient>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
