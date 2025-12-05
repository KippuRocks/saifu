"use client";

import { Button, Stack, TextField, Typography } from "@mui/material";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { webAuthnService } from "../../lib/webauthn/handler";

export function LoginForm() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim()) {
      setError(t("emailRequired"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("invalidEmail"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("🚀 Starting login process for:", email);

      // Use WebAuthn service for login
      const result = await webAuthnService.loginWithEmail(email);

      if (result.success) {
        console.log("✅ Login successful, redirecting...");
        // Redirect to authenticated area
        router.push("/events");
        window.location.href = "/events";
      } else {
        setError(result.error || t("failed"));
      }
    } catch (err) {
      setError(t("failedWithMessage", { message: (err as Error).message }));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <TextField
        label={t("email")}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        disabled={isLoading}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            handleLogin();
          }
        }}
      />

      {error && (
        <Typography variant="body2" color="error" textAlign="center">
          {error}
        </Typography>
      )}

      <Button
        variant="contained"
        onClick={handleLogin}
        disabled={isLoading || !email.trim()}
        fullWidth
      >
        {isLoading ? t("loggingIn") : t("button")}
      </Button>
    </>
  );
}
