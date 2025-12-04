import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => {
  // Provide a static locale, fetch a user setting,
  // read from `cookies()`, `headers()`, etc.
  const resolvedLocale = locale || "es";

  // Load locale-specific messages
  try {
    const messages = (await import(`./messages/${resolvedLocale}.json`))
      .default;
    return {
      locale: resolvedLocale,
      messages,
    };
  } catch (error) {
    // Fallback to English if locale messages don't exist
    const messages = (await import(`./messages/en.json`)).default;
    return {
      locale: resolvedLocale,
      messages,
    };
  }
});
