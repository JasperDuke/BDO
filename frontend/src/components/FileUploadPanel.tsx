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
const DROP_ZONE_MIN = 100;
/** Right column file list: modest height, scrolls when needed */
const FILE_LIST_PANEL_MIN = 140;
const FILE_LIST_MAX_CSS = "min(50vh, 240px)";

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
      const response = await api.post("/upload", fd, {
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100));
        },
      });
      setFiles([]);
      setSnack({
        msg: "Data processing started. You will receive your result PDF file in your email.",
        sev: "success",
      });
      console.log("response", response);
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
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          pr: 0.25,
        }}
      >
        <Grid
          container
          columnSpacing={0}
          rowSpacing={2}
          alignItems="stretch"
          sx={{ width: "100%" }}
        >
          {/* Left: upload zone + email + send — border on Grid item = full row height */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignSelf: "stretch",
              minHeight: 0,
              borderRight: { md: 1 },
              borderBottom: { xs: 1, md: 0 },
              borderColor: "divider",
              pr: { xs: 0, md: 3 },
              pb: { xs: 2.5, md: 0 },
            }}
          >
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                width: "100%",
                minHeight: 0,
              }}
            >
              <Box sx={{ mb: 2, flexShrink: 0 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ mb: 0.5 }}
                >
                  Upload & send
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", lineHeight: 1.6 }}
                >
                  PDF and Excel (.xlsx) only. Files you add appear in the list
                  on the right.
                </Typography>
              </Box>

              <Stack spacing={2.5} sx={{ flexShrink: 0, width: "100%" }}>
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
                    borderRadius: 1.5,
                    p: 2,
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
                  <Stack spacing={1} alignItems="center">
                    <FiUploadCloud size={24} style={{ opacity: 0.8 }} />
                    <Typography variant="caption" color="text.secondary">
                      Drop here or
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      disabled={uploading}
                      size="small"
                      sx={{ py: 0.5, px: 1.25, fontSize: "0.8125rem" }}
                    >
                      Choose files
                      <input
                        type="file"
                        hidden
                        multiple
                        accept={Object.keys(ACCEPT).join(",")}
                        onChange={(e) =>
                          e.target.files && addFiles(e.target.files)
                        }
                      />
                    </Button>
                  </Stack>
                </Box>

                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{
                    flexShrink: 0,
                    py: 1.25,
                    px: 1.25,
                    borderRadius: 1.5,
                    bgcolor: "action.hover",
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      bgcolor: "action.selected",
                      border: 1,
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "primary.main",
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    <FiSend size={20} strokeWidth={2} />
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ lineHeight: 1.5 }}
                  >
                    Result PDF is emailed when processing finishes.
                  </Typography>
                </Stack>

                <Stack spacing={2} sx={{ flexShrink: 0, width: "100%" }}>
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
                    size="medium"
                    onClick={onUpload}
                    disabled={
                      uploading ||
                      !files.length ||
                      !isValidEmail(notificationEmail)
                    }
                  >
                    {uploading ? `Sending… ${progress}%` : "Send"}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Grid>

          {/* Right: selected files list */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignSelf: "stretch",
              minHeight: 0,
              pl: { xs: 0, md: 3 },
            }}
          >
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                width: "100%",
                minHeight: 0,
                pr: { xs: 0, md: 0.25 },
              }}
            >
              <Box sx={{ mb: 2, flexShrink: 0 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ mb: 0.5, flexShrink: 0 }}
                >
                  Files to send
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ flexShrink: 0, display: "block", lineHeight: 1.6 }}
                >
                  {files.length
                    ? `${files.length} file${files.length === 1 ? "" : "s"} selected — remove with the trash icon if needed.`
                    : "Nothing queued yet."}
                </Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minHeight: FILE_LIST_PANEL_MIN,
                  maxHeight: FILE_LIST_MAX_CSS,
                  overflow: "auto",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "action.hover",
                  px: 0.5,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {files.length === 0 ? (
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: FILE_LIST_PANEL_MIN,
                      px: 2,
                      py: 3,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: 1,
                    }}
                  >
                    <FiFileText
                      size={36}
                      style={{ opacity: 0.35 }}
                      aria-hidden
                    />
                    <Typography
                      variant="overline"
                      sx={{
                        letterSpacing: "0.12em",
                        fontWeight: 800,
                        color: "text.disabled",
                        lineHeight: 1.3,
                      }}
                    >
                      NO FILE SELECTED
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ maxWidth: 280, lineHeight: 1.55 }}
                    >
                      Use <strong>Choose files</strong> or drag and drop on the
                      left. Only PDF and Excel (.xlsx) are accepted.
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
                        <ListItemIcon
                          sx={{
                            minWidth: 32,
                            color: "text.secondary",
                            mt: 0.25,
                          }}
                        >
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
        </Grid>
      </Box>

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
