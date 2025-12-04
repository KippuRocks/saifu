"use client";

import { Container, Paper, Stack, Typography } from "@mui/material";
import { LoginForm, RegisterDialog } from "../_components/index.ts";

import { useState } from "react";

export default function RootPage() {
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
            Kippu
          </Typography>

          <Typography variant="body1" textAlign="center" color="text.secondary">
            Login with your username
          </Typography>

          <LoginForm />

          <Typography
            variant="body2"
            textAlign="center"
            color="text.secondary"
            sx={{ cursor: "pointer" }}
            onClick={handleRegisterDialogOpen}
          >
            Don't have an account? Register here
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
