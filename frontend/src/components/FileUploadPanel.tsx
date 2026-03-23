"use client";

import { useCallback, useState } from "react";
import {
  Box,
  Button,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Typography,
  InputAdornment,
} from "@mui/material";
import {
  FiFileText,
  FiMail,
  FiSend,
  FiTrash2,
  FiUploadCloud,
  FiGrid,
} from "react-icons/fi";
import { RiFileExcelLine } from "react-icons/ri";
import { api } from "@/lib/api";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
};

const SUCCESS_TOAST_MS = 9000;

/** Compact drop zone; list area scrolls below */
const DROP_ZONE_MIN = 112;
const FILE_LIST_MIN = 80;
const FILE_LIST_MAX = 200;

function fileIcon(mime: string) {
  if (mime === "application/pdf") return <FiFileText size={18} />;
  if (mime.includes("spreadsheet")) return <RiFileExcelLine size={18} />;
  return <FiGrid size={18} />;
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function FileUploadPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [snack, setSnack] = useState<{
    msg: string;
    sev: "success" | "error";
  } | null>(null);

  const emailError =
    emailTouched && notificationEmail.trim() && !isValidEmail(notificationEmail)
      ? "Enter a valid email"
      : emailTouched && !notificationEmail.trim()
        ? "Required"
        : "";

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const allowed = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]);
    const next: File[] = [];
    const rejected: string[] = [];
    arr.forEach((f) => {
      if (allowed.has(f.type)) next.push(f);
      else rejected.push(f.name);
    });
    if (rejected.length) {
      setSnack({
        msg: `Only PDF and Excel allowed: skipped ${rejected.join(", ")}`,
        sev: "error",
      });
    }
    setFiles((prev) => [...prev, ...next]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const onUpload = async () => {
    setEmailTouched(true);
    if (!files.length) {
      setSnack({ msg: "Add at least one file first.", sev: "error" });
      return;
    }
    if (!notificationEmail.trim() || !isValidEmail(notificationEmail)) {
      setSnack({ msg: "Enter a valid email for results.", sev: "error" });
      return;
    }
    const fd = new FormData();
    fd.append("notificationEmail", notificationEmail.trim().toLowerCase());
    files.forEach((f) => fd.append("files", f));
    setUploading(true);
    setProgress(0);
    try {
      await api.post("/upload", fd, {
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100));
        },
      });
      setFiles([]);
      setSnack({
        msg: "Data processing started. You will receive your result PDF file in your email.",
        sev: "success",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Upload failed";
      setSnack({ msg, sev: "error" });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Paper
      sx={{
        p: { xs: 1.5, sm: 2 },
        flex: 1,
        width: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Grid
        container
        spacing={2}
        alignItems="stretch"
        sx={{
          flex: 1,
          minHeight: 0,
          height: "100%",
          width: "100%",
        }}
      >
        {/* Left: upload area only */}
        <Grid
          item
          xs={12}
          md={7}
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.25, flexShrink: 0 }}>
            Files
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, flexShrink: 0, display: "block" }}>
            PDF and Excel (.xlsx) only.
          </Typography>
          <Box
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            sx={{
              border: "1px dashed",
              borderColor: dragOver ? "primary.main" : "divider",
              borderRadius: 1,
              p: 1.5,
              flexShrink: 0,
              minHeight: DROP_ZONE_MIN,
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: dragOver ? "action.selected" : "action.hover",
              transition: "border-color 0.15s, background-color 0.15s",
            }}
          >
            <Stack spacing={0.75} alignItems="center">
              <FiUploadCloud size={22} style={{ opacity: 0.75 }} />
              <Typography variant="caption" color="text.secondary">
                Drop here or
              </Typography>
              <Button
                variant="outlined"
                component="label"
                disabled={uploading}
                size="small"
                sx={{ py: 0.25, px: 1, fontSize: "0.8125rem" }}
              >
                Choose files
                <input
                  type="file"
                  hidden
                  multiple
                  accept={Object.keys(ACCEPT).join(",")}
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
              </Button>
            </Stack>
          </Box>

          <Box sx={{ mt: 1.25, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5 }}>
              Selected files {files.length ? `(${files.length})` : ""}
            </Typography>
            <Box
              sx={{
                minHeight: FILE_LIST_MIN,
                maxHeight: FILE_LIST_MAX,
                overflow: "auto",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "action.hover",
                px: 0.5,
              }}
            >
              {files.length === 0 ? (
                <Box
                  sx={{
                    minHeight: FILE_LIST_MIN,
                    px: 1.5,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ lineHeight: 1.5 }}>
                    No files chosen. Add PDF or Excel files above.
                  </Typography>
                </Box>
              ) : (
                <List dense disablePadding sx={{ py: 0.25 }}>
                  {files.map((f, i) => (
                    <ListItem
                      key={`${f.name}-${i}`}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          aria-label={`Remove ${f.name}`}
                          onClick={() =>
                            setFiles((prev) => prev.filter((_, j) => j !== i))
                          }
                        >
                          <FiTrash2 size={16} />
                        </IconButton>
                      }
                      sx={{ py: 0.5, px: 0.5, alignItems: "flex-start" }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: "text.secondary", mt: 0.25 }}>
                        {fileIcon(f.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={f.name}
                        secondary={formatSize(f.size)}
                        primaryTypographyProps={{
                          variant: "body2",
                          title: f.name,
                          sx: {
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            lineHeight: 1.35,
                            pr: 1,
                          },
                        }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Right: email + send */}
        <Grid
          item
          xs={12}
          md={5}
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: { xs: "auto", md: 0 },
              p: { xs: 0, md: 2 },
              borderLeft: { md: 1 },
              borderTop: { xs: 1, md: 0 },
              borderColor: "divider",
              pt: { xs: 2, md: 0 },
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, flexShrink: 0 }}>
              Delivery
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 0, lineHeight: 1.6, flexShrink: 0 }}
            >
              We use this address to send your screening result (PDF) when
              processing finishes.
            </Typography>

            <Box
              sx={{
                flex: { xs: "none", md: 1 },
                minHeight: { md: 0 },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: { xs: 2, md: 1.5 },
              }}
            >
              <Stack alignItems="center" spacing={1} sx={{ maxWidth: 200 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    bgcolor: "action.selected",
                    border: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "primary.main",
                  }}
                  aria-hidden
                >
                  <FiSend size={22} strokeWidth={2} />
                </Box>
                <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ lineHeight: 1.4 }}>
                  PDF summary sent to this inbox when ready
                </Typography>
              </Stack>
            </Box>

            <Stack spacing={2} sx={{ flexShrink: 0 }}>
              <TextField
                fullWidth
                type="email"
                autoComplete="email"
                label="Recipient email"
                placeholder="you@company.com"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                error={Boolean(emailError)}
                helperText={emailError || "Required for every upload."}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FiMail />
                    </InputAdornment>
                  ),
                }}
              />
              {uploading && (
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ borderRadius: 1 }}
                />
              )}
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={onUpload}
                disabled={
                  uploading || !files.length || !isValidEmail(notificationEmail)
                }
              >
                {uploading ? `Sending… ${progress}%` : "Send"}
              </Button>
            </Stack>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={!!snack}
        autoHideDuration={snack?.sev === "success" ? SUCCESS_TOAST_MS : 5000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack?.sev}
          onClose={() => setSnack(null)}
          variant="filled"
          sx={{ maxWidth: { xs: "100%", sm: 480 } }}
        >
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
