"use client";

import {
  AppBar,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useAuthentication } from "../../hooks/useAuthentication";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface AppBarComponentProps {
  className?: string;
}

export default function AppBarComponent({ className }: AppBarComponentProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const authService = useAuthentication();

  // Simple check: if not on root page, show back button and title
  const isRootPage = pathname === "/events";
  const isNestedPage = !isRootPage;

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleMenuClose();
    router.push("/profile");
  };

  const handleLogout = () => {
    handleMenuClose();
    authService.logout();
    router.replace("/");
  };

  const handleBack = () => {
    router.back();
  };

  // Get page title for nested routes
  const getPageTitle = () => {
    // Check for event detail pages (handles both /events/[id] and /events/123)
    if (pathname.match(/\/events\/\d+/)) {
      return t("events.details");
    }
    // Check for ticket QR pages (handles dynamic routes)
    if (pathname.includes("/tickets/") && pathname.includes("/qr")) {
      return t("tickets.accessQR");
    }
    // Check for profile page
    if (pathname === "/profile") {
      return t("profile.title");
    }
    return "";
  };

  return (
    <AppBar
      position="static"
      className={className}
      color={isRootPage ? "transparent" : "primary"}
    >
      <Toolbar>
        {/* Back button - show on all nested pages */}
        {isNestedPage && (
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            aria-label="back"
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}

        {/* Page title - show on nested pages */}
        {isNestedPage && (
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {getPageTitle()}
          </Typography>
        )}

        {/* Spacer - takes remaining space on root page */}
        {isRootPage && <div style={{ flexGrow: 1 }} />}

        {/* Menu button - always show */}
        <IconButton
          edge="end"
          color="inherit"
          onClick={handleMenuClick}
          aria-label="menu"
        >
          <MoreVertIcon />
        </IconButton>

        {/* Menu dropdown */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleProfile}>{t("profile.title")}</MenuItem>
          <MenuItem onClick={handleLogout}>{t("auth.logout")}</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
