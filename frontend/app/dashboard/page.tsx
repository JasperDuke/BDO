"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Box,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  CircularProgress,
} from "@mui/material";
import { FiLogOut } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { FileUploadPanel } from "@/components/FileUploadPanel";
import { ArtemisDataViewer } from "@/components/ArtemisDataViewer";

/** Readable width — not full-bleed, not phone-narrow */
const CONTENT_MAX = 1100;

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column">
      <AppBar position="sticky">
        <Toolbar
          sx={{
            justifyContent: "center",
            minHeight: 48,
            py: 0.5,
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: CONTENT_MAX,
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: { xs: 1.5, sm: 0 },
            }}
          >
            <Typography
              variant="subtitle2"
              component="span"
              sx={{ flex: 1, fontWeight: 700 }}
            >
              Artemis
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ maxWidth: 160, display: { xs: "none", sm: "block" } }}
            >
              {user.email}
            </Typography>
            <IconButton
              size="small"
              onClick={logout}
              aria-label="Sign out"
              edge="end"
            >
              <FiLogOut />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          px: 2,
          py: 2.5,
        }}
      >
        <Stack spacing={1} sx={{ width: "100%", maxWidth: CONTENT_MAX }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.75 }}>
              Artemis records
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.65, mb: 0.5 }}
            >
              Upload a file and enter your email. The result is produced by
              comparing your upload with the Artemis records saved in this app.
              Those records live in the Records tab. We check whether your file
              overlaps that data; when it does, you receive a summarized PDF by
              email.
            </Typography>
          </Box>

          <Box>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="fullWidth"
              sx={{
                minHeight: 52,
                "& .MuiTab-root": { minHeight: 52, py: 1.25 },
                "& .MuiTabs-indicator": { height: 2 },
              }}
            >
              <Tab disableRipple label="Upload files" />
              <Tab disableRipple label="Records" />
            </Tabs>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.5, lineHeight: 1.6 }}
            >
              {tab === 0
                ? "Upload your file, then get the result in your email."
                : "Search saved Artemis records—the same data used when your upload is checked."}
            </Typography>
          </Box>

          <Box
            sx={{
              height: "calc(100vh - 295px)",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {tab === 0 ? <FileUploadPanel /> : <ArtemisDataViewer />}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
