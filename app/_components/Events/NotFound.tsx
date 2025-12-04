import { Stack, Typography } from "@mui/material";

import { useTranslations } from "next-intl";

export function EventNotFound() {
  const t = useTranslations("events");

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{ width: "100%", height: "100dvh" }}
    >
      <Typography variant="body1" color="white" textAlign="center">
        {t("notFound")}
      </Typography>
    </Stack>
  );
}
