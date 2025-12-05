"use client";

import {
  BottomNavigationAction,
  BottomNavigation as MuiBottomNavigation,
  Paper,
} from "@mui/material";

import LocalActivityIcon from "@mui/icons-material/LocalActivity";
import LogoutIcon from "@mui/icons-material/Logout";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { webAuthnService } from "../../lib/webauthn/handler";

export default function BottomNavigation() {
  const t = useTranslations();
  const router = useRouter();

  const handleLogout = () => {
    webAuthnService.logout();
    router.push("/");
  };

  return (
    <Paper
      sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
      elevation={3}
    >
      <MuiBottomNavigation showLabels>
        <BottomNavigationAction
          href="/events"
          label={t("events.title")}
          icon={<LocalActivityIcon />}
        />
        <BottomNavigationAction
          onClick={handleLogout}
          label={t("auth.logout")}
          icon={<LogoutIcon />}
        />
      </MuiBottomNavigation>
    </Paper>
  );
}
