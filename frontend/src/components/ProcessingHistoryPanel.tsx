"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { FiFileText, FiRefreshCw, FiTrash2, FiX } from "react-icons/fi";
import { RiFileExcelLine } from "react-icons/ri";
import { deleteProcessingJob, fetchProcessingJobs } from "@/lib/processingJobApi";
import type { ProcessingJob, ProcessingJobStatus } from "@/types/processingJob";

const POLL_INTERVAL_MS = 5000;

function statusColor(status: ProcessingJobStatus) {
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  return "info";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function fileListText(job: ProcessingJob) {
  const names = job.uploadedFiles.map((f) => f.originalname);
  return names.length ? names.join(", ") : "—";
}

type Props = {
  focusJobId?: string | null;
};

export function ProcessingHistoryPanel({ focusJobId = null }: Props) {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProcessingJob | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const focusRowRef = useRef<HTMLTableRowElement | null>(null);

  const handleDelete = async (job: ProcessingJob) => {
    const label = fileListText(job);
    const ok = window.confirm(
      `Remove this entry from history?\n\n${label}\n${formatDate(job.createdAt)}`,
    );
    if (!ok) return;

    setDeletingId(job.id);
    try {
      await deleteProcessingJob(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      if (selected?.id === job.id) setSelected(null);
    } catch (err) {
      console.error("[ProcessingHistory] delete failed", err);
    } finally {
      setDeletingId(null);
    }
  };

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const data = await fetchProcessingJobs({ limit: 50 });
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      if (opts?.silent) {
        console.debug("[ProcessingHistory] poll", {
          total: data.total,
          processing: data.jobs.filter((j) => j.status === "processing").length,
        });
      }
    } catch (err) {
      console.error("[ProcessingHistory] load failed", err);
      setJobs([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, focusJobId]);

  const hasProcessing = jobs.some((j) => j.status === "processing");

  useEffect(() => {
    if (!hasProcessing && !focusJobId) return undefined;

    const timer = setInterval(() => load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasProcessing, focusJobId, load]);

  useEffect(() => {
    if (!focusJobId || loading) return;
    const t = setTimeout(() => {
      focusRowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
    return () => clearTimeout(t);
  }, [focusJobId, loading, jobs]);

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
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, flexShrink: 0 }}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Processing history
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {hasProcessing
              ? "Processing in progress — updates every 5 seconds."
              : "All your uploads and their results. Failed entries have no result links."}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => load()} disabled={loading} aria-label="Refresh history">
          <FiRefreshCw />
        </IconButton>
      </Stack>

      {hasProcessing && (
        <LinearProgress sx={{ mb: 2, borderRadius: 1, flexShrink: 0 }} />
      )}

      {loading && (
        <Box flex={1} display="flex" alignItems="center" justifyContent="center">
          <CircularProgress size={28} />
        </Box>
      )}

      {!loading && jobs.length === 0 && (
        <Box
          flex={1}
          display="flex"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          px={2}
        >
          <Typography variant="body2" color="text.secondary">
            No processing history yet. Upload a file to get started.
          </Typography>
        </Box>
      )}

      {!loading && jobs.length > 0 && (
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Files</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Result</TableCell>
                <TableCell align="right" width={48} />
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => {
                const isFocus = focusJobId === job.id;
                return (
                  <TableRow
                    key={job.id}
                    hover
                    ref={isFocus ? focusRowRef : undefined}
                    sx={
                      isFocus
                        ? { bgcolor: "action.selected" }
                        : undefined
                    }
                  >
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(job.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        title={fileListText(job)}
                        sx={{ maxWidth: 220, wordBreak: "break-word" }}
                      >
                        {fileListText(job)}
                      </Typography>
                    </TableCell>
                    <TableCell>{job.notificationEmail}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={job.status}
                        color={statusColor(job.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {job.status === "completed" && job.resultPdfUrl ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setSelected(job)}
                        >
                          View
                        </Button>
                      ) : job.status === "processing" ? (
                        <Typography variant="caption" color="text.secondary">
                          Processing…
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="error.main">
                          {job.errorMessage || "Failed"}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" padding="checkbox">
                      <IconButton
                        size="small"
                        aria-label={`Delete history entry ${fileListText(job)}`}
                        disabled={deletingId === job.id}
                        onClick={() => handleDelete(job)}
                        sx={{ color: "text.secondary" }}
                      >
                        <FiTrash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 480 } } }}
      >
        {selected && (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Results
              </Typography>
              <IconButton size="small" onClick={() => setSelected(null)} aria-label="Close">
                <FiX />
              </IconButton>
            </Stack>
            <Box sx={{ flex: 1, minHeight: 0, p: 2 }}>
              {selected.resultPdfUrl ? (
                <Box
                  component="iframe"
                  src={selected.resultPdfUrl}
                  title="Result PDF"
                  sx={{ width: "100%", height: "100%", minHeight: 400, border: 0 }}
                />
              ) : (
                <Alert severity="warning">No PDF available.</Alert>
              )}
            </Box>
            <Stack spacing={1} sx={{ px: 2, pb: 2 }}>
              {selected.resultPdfUrl && (
                <Button
                  fullWidth
                  variant="outlined"
                  component="a"
                  href={selected.resultPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<FiFileText />}
                >
                  Open PDF
                </Button>
              )}
              {selected.resultXlsxUrl && (
                <Button
                  fullWidth
                  variant="outlined"
                  component="a"
                  href={selected.resultXlsxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<RiFileExcelLine />}
                >
                  Open Excel
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </Drawer>
    </Paper>
  );
}
