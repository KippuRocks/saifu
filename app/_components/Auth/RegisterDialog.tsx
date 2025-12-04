"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { webAuthnService } from "../../lib/webauthn/handler.ts";

interface RegisterData {
  username: string;
  displayName: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface RegisterDialogProps {
  open: boolean;
  onClose: () => void;
  initialUsername?: string;
  onSuccess?: (username: string) => void;
}

export function RegisterDialog({
  open,
  onClose,
  initialUsername = "",
  onSuccess,
}: RegisterDialogProps) {
  const t = useTranslations("auth.register");
  const [registerData, setRegisterData] = useState<RegisterData>({
    username: initialUsername,
    displayName: "",
    email: "",
    firstName: "",
    lastName: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!registerData.username.trim()) {
      setError(t("usernameRequired"));
      return;
    }

    // Generate display name from first/last name or username
    const displayName =
      registerData.firstName || registerData.lastName
        ? `${registerData.firstName} ${registerData.lastName}`.trim()
        : registerData.username;

    const dataToRegister = {
      ...registerData,
      displayName,
    };

    setIsLoading(true);
    setError("");

    try {
      console.log(
        "🚀 Starting registration process for:",
        registerData.username
      );

      // Use WebAuthn service for registration
      const result = await webAuthnService.registerUser(dataToRegister);

      if (result.success) {
        console.log("✅ Registration successful");
        // Registration successful
        onClose();
        setRegisterData({
          username: "",
          displayName: "",
          email: "",
          firstName: "",
          lastName: "",
        });
        setError("");

        // Optional: call success callback
        if (onSuccess) {
          onSuccess(registerData.username);
        }
      } else {
        setError(result.error || t("failed"));
      }
    } catch (err) {
      setError(t("failedWithMessage", { message: (err as Error).message }));
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    if (!isLoading) {
      onClose();
      setError("");
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("title")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t("title")}
            value={registerData.username}
            onChange={(e) =>
              setRegisterData({ ...registerData, username: e.target.value })
            }
            fullWidth
            required
            disabled={isLoading}
          />
          <TextField
            label={t("email")}
            type="email"
            value={registerData.email}
            onChange={(e) =>
              setRegisterData({ ...registerData, email: e.target.value })
            }
            fullWidth
            disabled={isLoading}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label={t("firstName")}
              value={registerData.firstName}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  firstName: e.target.value,
                })
              }
              fullWidth
              disabled={isLoading}
            />
            <TextField
              label={t("lastName")}
              value={registerData.lastName}
              onChange={(e) =>
                setRegisterData({ ...registerData, lastName: e.target.value })
              }
              fullWidth
              disabled={isLoading}
            />
          </Stack>
          {error && (
            <TextField
              value={error}
              disabled
              fullWidth
              sx={{
                "& .MuiInputBase-input.Mui-disabled": {
                  color: "error.main",
                },
              }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          {t("cancel")}
        </Button>
        <Button
          onClick={handleRegister}
          variant="contained"
          disabled={isLoading || !registerData.username.trim()}
        >
          {isLoading ? t("registering") : t("button")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
