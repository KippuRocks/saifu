"use client";

import { Button, Stack, TextField, Typography } from "@mui/material";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { webAuthnService } from "../../lib/webauthn/handler.ts";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("🚀 Starting login process for:", username);

      // Use WebAuthn service for login
      const result = await webAuthnService.loginWithUsername(username);

      if (result.success) {
        console.log("✅ Login successful, redirecting...");
        // Redirect to authenticated area
        router.push("/events");
        window.location.href = "/events";
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("Login failed: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <TextField
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
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
        disabled={isLoading || !username.trim()}
        fullWidth
      >
        {isLoading ? "Logging in..." : "Login"}
      </Button>
    </>
  );
}
