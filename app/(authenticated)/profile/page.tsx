"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAuthentication } from "../../hooks/useAuthentication";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface ProfileData {
  username: string;
  firstName?: string;
  lastName?: string;
  registeredAt: string;
}

export default function ProfilePage() {
  const t = useTranslations("profile");
  const authService = useAuthentication();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ firstName: "", lastName: "" });
  const [blockchainAddress, setBlockchainAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      router.push("/");
      return;
    }

    const loadProfile = async () => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      try {
        const username = `ticketto::kippu:${currentUser.login.email}`;
        const response = await fetch(
          `/api/auth/profile?username=${encodeURIComponent(username)}`
        );
        if (response.ok) {
          const data = await response.json();
          data.username = (data.username as string).replace(
            "ticketto::kippu:",
            ""
          );

          setProfile(data);
          setEditData({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
          });
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };

    const loadBlockchainAddress = async () => {
      try {
        const accountProvider = await authService.getAccountProvider();
        const address = accountProvider.getAccountId();
        setBlockchainAddress(address);
      } catch (error) {
        console.error("Failed to load blockchain address:", error);
      }
    };

    loadProfile();
    loadBlockchainAddress();
  }, [authService, router]);

  const handleSave = async () => {
    if (!profile) return;

    setIsLoading(true);
    setError("");

    try {
      const username = `ticketto::kippu:${profile.username}`;
      const response = await fetch(
        `/api/auth/profile?username=${encodeURIComponent(username)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editData,
            username,
          }),
        }
      );

      if (response.ok) {
        setProfile({
          ...profile,
          firstName: editData.firstName,
          lastName: editData.lastName,
        });
        setIsEditing(false);
      } else {
        setError("Failed to update profile");
      }
    } catch (error) {
      setError("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = async () => {
    if (blockchainAddress) {
      await navigator.clipboard.writeText(blockchainAddress);
      // Could add a toast notification here
    }
  };

  if (!profile) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Typography variant="h4">{t("title")}</Typography>

      <Card>
        <CardHeader>
          <Typography variant="h6">{t("personalInfo")}</Typography>
        </CardHeader>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              label={t("email")}
              value={profile.username}
              disabled
              fullWidth
            />
            <TextField
              label={t("firstName")}
              value={isEditing ? editData.firstName : profile.firstName || ""}
              onChange={(e) =>
                setEditData({ ...editData, firstName: e.target.value })
              }
              disabled={!isEditing}
              fullWidth
            />
            <TextField
              label={t("lastName")}
              value={isEditing ? editData.lastName : profile.lastName || ""}
              onChange={(e) =>
                setEditData({ ...editData, lastName: e.target.value })
              }
              disabled={!isEditing}
              fullWidth
            />
            <TextField
              label={t("registeredAt")}
              value={new Date(profile.registeredAt).toLocaleDateString()}
              disabled
              fullWidth
            />
            {error && <Typography color="error">{error}</Typography>}
            <Stack direction="row" spacing={2}>
              {isEditing ? (
                <>
                  <Button
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    {isLoading ? t("saving") : t("save")}
                  </Button>
                </>
              ) : (
                <Button variant="outlined" onClick={() => setIsEditing(true)}>
                  {t("edit")}
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Typography variant="h6">{t("blockchainInfo")}</Typography>
        </CardHeader>
        <CardContent>
          <Stack spacing={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <TextField
                label={t("address")}
                value={blockchainAddress}
                disabled
                fullWidth
              />
              <IconButton onClick={handleCopyAddress} color="primary">
                <ContentCopyIcon />
              </IconButton>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
