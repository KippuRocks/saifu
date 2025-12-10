import AppBar from "../_components/Layout/AppBar";
import { CssBaseline } from "@mui/material";
import { NextIntlClientProvider } from "next-intl";
import SaifuLayout from "../_components/Layout/SaifuLayout";
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
            <SaifuLayout showNavigation={true} redirectToUnauthenticated="/">
              <AppBar />
              {children}
            </SaifuLayout>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
