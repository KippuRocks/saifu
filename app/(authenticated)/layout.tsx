import { CssBaseline } from "@mui/material";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@mui/material/styles";
import TickettoClientLayout from "../_components/Layout/TickettoClientLayout";
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
            <TickettoClientLayout
              showNavigation={true}
              redirectToUnauthenticated="/"
            >
              {children}
            </TickettoClientLayout>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
