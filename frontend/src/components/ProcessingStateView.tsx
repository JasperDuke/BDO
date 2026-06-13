"use client";

import { useState } from "react";
import {
  Box,
  Button,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import { FiDownload, FiRefreshCw } from "react-icons/fi";
import { RiFileExcelLine } from "react-icons/ri";
import type { ProcessingJob, UploadedFileMeta } from "@/types/processingJob";

const PDF_VIEW_MIN = 360;

function isPdfFile(file: UploadedFileMeta) {
  return (
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf")
  );
}

export function ProcessingLoadingView({ fileNames }: { fileNames: string[] }) {
  return (
    <Stack spacing={3} sx={{ py: 1 }}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
          Processing file
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          Your upload is being analyzed. This may take a few minutes — the result
          will appear here when ready.
        </Typography>
      </Box>

      <LinearProgress sx={{ borderRadius: 1 }} />

      <Stack spacing={1}>
        <Skeleton variant="rounded" height={56} />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={80} />
      </Stack>

      {fileNames.length > 0 && (
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            borderRadius: 1.5,
            bgcolor: "action.hover",
            border: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Submitted files
          </Typography>
          {fileNames.map((name) => (
            <Typography key={name} variant="body2" sx={{ lineHeight: 1.5 }}>
              {name}
            </Typography>
          ))}
        </Box>
      )}
    </Stack>
  );
}

export function ProcessingResultView({
  job,
  onTryAgain,
}: {
  job: ProcessingJob;
  onTryAgain: () => void;
}) {
  const fileNames = job.uploadedFiles.map((f) => f.originalname);
  const [previewUpload, setPreviewUpload] = useState<UploadedFileMeta | null>(
    job.uploadedFiles.find(isPdfFile) ?? null,
  );

  return (
    <Stack spacing={2.5} sx={{ py: 0.5, minHeight: 0, flex: 1 }}>
      <Box sx={{ flexShrink: 0 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
          Result ready
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          Results for {fileNames.join(", ") || "your upload"} — PDF and Excel versions.
        </Typography>
      </Box>

      {job.uploadedFiles.length > 0 && (
        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Uploaded files
          </Typography>
          <List dense disablePadding>
            {job.uploadedFiles.map((file, idx) => (
              <ListItemButton
                key={`${file.filename}-${idx}`}
                selected={previewUpload?.filename === file.filename}
                onClick={() => setPreviewUpload(file)}
                sx={{ borderRadius: 1, mb: 0.5, border: 1, borderColor: "divider" }}
              >
                <ListItemText
                  primary={file.originalname}
                  primaryTypographyProps={{ variant: "body2" }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}

      {previewUpload?.url && isPdfFile(previewUpload) ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 200,
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            overflow: "hidden",
            bgcolor: "action.hover",
          }}
        >
          <Box
            component="iframe"
            src={previewUpload.url}
            title={previewUpload.originalname}
            sx={{ width: "100%", height: "100%", minHeight: 200, border: 0, display: "block" }}
          />
        </Box>
      ) : null}

      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
        Generated results
      </Typography>

      {job.resultPdfUrl ? (
        <Box
          sx={{
            flex: 1,
            minHeight: PDF_VIEW_MIN,
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            overflow: "hidden",
            bgcolor: "action.hover",
          }}
        >
          <Box
            component="iframe"
            src={job.resultPdfUrl}
            title="Processing result PDF"
            sx={{
              width: "100%",
              height: "100%",
              minHeight: PDF_VIEW_MIN,
              border: 0,
              display: "block",
            }}
          />
        </Box>
      ) : (
        <Alert severity="warning" variant="outlined">
          Result PDF is not available.
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
        {job.resultPdfUrl && (
          <Button
            variant="outlined"
            component="a"
            href={job.resultPdfUrl}
            download
            startIcon={<FiDownload />}
            sx={{ flex: { sm: 1 } }}
          >
            Download PDF
          </Button>
        )}
        {job.resultXlsxUrl && (
          <Button
            variant="outlined"
            component="a"
            href={job.resultXlsxUrl}
            download
            startIcon={<RiFileExcelLine />}
            sx={{ flex: { sm: 1 } }}
          >
            Download XLSX
          </Button>
        )}
        <Button
          variant="contained"
          onClick={onTryAgain}
          startIcon={<FiRefreshCw />}
          sx={{ flex: { sm: 1 } }}
        >
          Try again
        </Button>
      </Stack>
    </Stack>
  );
}

export function ProcessingFailedView({
  job,
  onTryAgain,
}: {
  job: ProcessingJob;
  onTryAgain: () => void;
}) {
  const fileNames = job.uploadedFiles.map((f) => f.originalname);

  return (
    <Stack spacing={2.5} sx={{ py: 1 }}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
          Processing failed
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          No result links were produced for this submission.
        </Typography>
      </Box>

      <Alert severity="error" variant="outlined">
        {job.errorMessage || "Processing did not complete successfully."}
      </Alert>

      {fileNames.length > 0 && (
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            borderRadius: 1.5,
            bgcolor: "action.hover",
            border: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Uploaded files
          </Typography>
          {fileNames.map((name) => (
            <Typography key={name} variant="body2">
              {name}
            </Typography>
          ))}
        </Box>
      )}

      <Button variant="contained" onClick={onTryAgain} startIcon={<FiRefreshCw />}>
        Try again
      </Button>
    </Stack>
  );
}
