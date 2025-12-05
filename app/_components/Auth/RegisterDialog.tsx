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
import { webAuthnService } from "../../lib/webauthn/handler";

interface RegisterData {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
}

interface RegisterDialogProps {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccess?: (email: string) => void;
}

export function RegisterDialog({
  open,
  onClose,
  initialEmail = "",
  onSuccess,
}: RegisterDialogProps) {
  const t = useTranslations("auth.register");
  const [registerData, setRegisterData] = useState<RegisterData>({
    email: initialEmail,
    displayName: "",
    firstName: "",
    lastName: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!registerData.email.trim()) {
      setError(t("emailRequired"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email)) {
      setError(t("invalidEmail"));
      return;
    }

    // Generate display name from first/last name or email
    const displayName =
      registerData.firstName || registerData.lastName
        ? `${registerData.firstName} ${registerData.lastName}`.trim()
        : registerData.email.split("@")[0];

    const dataToRegister = {
      email: registerData.email,
      displayName,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
    };

    setIsLoading(true);
    setError("");

    try {
      console.log("🚀 Starting registration process for:", registerData.email);

      // Use WebAuthn service for registration
      const result = await webAuthnService.registerUser({
        email: registerData.email,
        displayName,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
      });

      if (result.success) {
        console.log("✅ Registration successful");
        // Registration successful
        onClose();
        setRegisterData({
          email: "",
          displayName: "",
          firstName: "",
          lastName: "",
        });
        setError("");

        // Optional: call success callback
        if (onSuccess) {
          onSuccess(registerData.email);
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
            label={t("email")}
            type="email"
            value={registerData.email}
            onChange={(e) =>
              setRegisterData({ ...registerData, email: e.target.value })
            }
            fullWidth
            required
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
          disabled={isLoading || !registerData.email.trim()}
        >
          {isLoading ? t("registering") : t("button")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
