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
import type { UploadResponse } from "@/types/processingJob";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "text/markdown": [".md"],
};

const ACCEPT_ATTR = Object.values(ACCEPT)
  .flat()
  .join(",");

const ACCEPT_EXTS = new Set(
  Object.values(ACCEPT)
    .flat()
    .map((e) => e.toLowerCase()),
);

function fileExt(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

const DROP_ZONE_MIN = 100;
const FILE_LIST_PANEL_MIN = 140;
const FILE_LIST_MAX_CSS = "min(50vh, 240px)";

function fileIcon(mime: string) {
  if (mime === "application/pdf" || mime === "text/markdown") return <FiFileText size={18} />;
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

type Props = {
  onSubmitted?: (jobId: string, eventId: string) => void;
};

export function FileUploadPanel({ onSubmitted }: Props) {
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
      "text/markdown",
    ]);
    const next: File[] = [];
    const rejected: string[] = [];
    arr.forEach((f) => {
      const byMime = allowed.has(f.type);
      const byExt = ACCEPT_EXTS.has(fileExt(f.name));
      if (byMime || byExt) next.push(f);
      else rejected.push(f.name);
    });
    if (rejected.length) {
      setSnack({
        msg: `Only PDF, Excel and Markdown allowed: skipped ${rejected.join(", ")}`,
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
      const response = await api.post<UploadResponse>("/upload", fd, {
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100));
        },
      });

      const { id, eventId } = response.data.job;
      console.log("[FileUpload] submitted", { jobId: id, eventId });
      setFiles([]);
      onSubmitted?.(id, eventId);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string; job?: { id: string; eventId: string } } } })
        ?.response?.data;
      const msg = res?.message || "Upload failed";
      setSnack({ msg, sev: "error" });
      if (res?.job?.id) {
        onSubmitted?.(res.job.id, res.job.eventId);
      }
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
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.25 }}>
        {uploading ? (
          <Stack spacing={2} sx={{ py: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Uploading…
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Sending files to the server ({progress}%)
            </Typography>
          </Stack>
        ) : (
          <Grid
            container
            columnSpacing={0}
            rowSpacing={2}
            alignItems="stretch"
            sx={{ width: "100%" }}
          >
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
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", minHeight: 0 }}>
                <Box sx={{ mb: 2, flexShrink: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                    Upload & send
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.6 }}>
                    PDF, Excel (.xlsx) and Markdown (.md) only. After submit you are taken to History to track progress.
                  </Typography>
                </Box>

                <Stack spacing={2.5} sx={{ flexShrink: 0, width: "100%" }}>
                  <Box
                    onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
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
                      <Typography variant="caption" color="text.secondary">Drop here or</Typography>
                      <Button variant="outlined" component="label" disabled={uploading} size="small" sx={{ py: 0.5, px: 1.25, fontSize: "0.8125rem" }}>
                        Choose files
                        <input type="file" hidden multiple accept={ACCEPT_ATTR} onChange={(e) => e.target.files && addFiles(e.target.files)} />
                      </Button>
                    </Stack>
                  </Box>

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
                  <Button
                    variant="contained"
                    fullWidth
                    size="medium"
                    onClick={onUpload}
                    disabled={uploading || !files.length || !isValidEmail(notificationEmail)}
                    startIcon={<FiSend />}
                  >
                    Send
                  </Button>
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12} md={6} sx={{ display: "flex", flexDirection: "column", alignSelf: "stretch", minHeight: 0, pl: { xs: 0, md: 3 } }}>
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", minHeight: 0 }}>
                <Box sx={{ mb: 2, flexShrink: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Files to send</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.6 }}>
                    {files.length
                      ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
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
                  }}
                >
                  {files.length === 0 ? (
                    <Box sx={{ flex: 1, minHeight: FILE_LIST_PANEL_MIN, px: 2, py: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 1 }}>
                      <FiFileText size={36} style={{ opacity: 0.35 }} aria-hidden />
                      <Typography variant="overline" sx={{ letterSpacing: "0.12em", fontWeight: 800, color: "text.disabled" }}>
                        NO FILE SELECTED
                      </Typography>
                    </Box>
                  ) : (
                    <List dense disablePadding sx={{ py: 0.25 }}>
                      {files.map((f, i) => (
                        <ListItem
                          key={`${f.name}-${i}`}
                          secondaryAction={
                            <IconButton edge="end" size="small" aria-label={`Remove ${f.name}`} onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                              <FiTrash2 size={16} />
                            </IconButton>
                          }
                          sx={{ py: 0.5, px: 0.5 }}
                        >
                          <ListItemIcon sx={{ minWidth: 32, color: "text.secondary" }}>{fileIcon(f.type)}</ListItemIcon>
                          <ListItemText primary={f.name} secondary={formatSize(f.size)} primaryTypographyProps={{ variant: "body2", title: f.name }} secondaryTypographyProps={{ variant: "caption" }} />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}
      </Box>

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.sev} onClose={() => setSnack(null)} variant="filled">{snack?.msg}</Alert>
      </Snackbar>
    </Paper>
  );
}
