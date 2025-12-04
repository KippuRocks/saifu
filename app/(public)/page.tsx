"use client";

import { Container, Paper, Stack, Typography } from "@mui/material";
import { LoginForm, RegisterDialog } from "../_components/index.ts";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function RootPage() {
  const t = useTranslations("auth.login");
  const [username, setUsername] = useState("");
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);

  function handleRegisterDialogOpen() {
    setIsRegisterDialogOpen(true);
  }

  function handleRegistrationSuccess(registeredUsername: string) {
    setUsername(registeredUsername);
  }

  return (
    <Container
      sx={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: "100%" }}>
        <Stack spacing={3}>
          <Typography variant="h4" component="h1" textAlign="center">
            {t("appName")}
          </Typography>

          <Typography variant="body1" textAlign="center" color="text.secondary">
            {t("subtitle")}
          </Typography>

          <LoginForm />

          <Typography
            variant="body2"
            textAlign="center"
            color="text.secondary"
            sx={{ cursor: "pointer" }}
            onClick={handleRegisterDialogOpen}
          >
            {t("registerPrompt")}
          </Typography>
        </Stack>
      </Paper>

      <RegisterDialog
        open={isRegisterDialogOpen}
        onClose={() => setIsRegisterDialogOpen(false)}
        initialUsername={username}
        onSuccess={handleRegistrationSuccess}
      />
    </Container>
  );
}
