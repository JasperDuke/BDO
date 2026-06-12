"use client";

import {
  Box,
  Button,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import { FiRefreshCw, FiFileText } from "react-icons/fi";
import { RiFileExcelLine } from "react-icons/ri";
import type { ProcessingJob } from "@/types/processingJob";

const PDF_VIEW_MIN = 360;

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
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<FiFileText />}
            sx={{ flex: { sm: 1 } }}
          >
            Open PDF
          </Button>
        )}
        {job.resultXlsxUrl && (
          <Button
            variant="outlined"
            component="a"
            href={job.resultXlsxUrl}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<RiFileExcelLine />}
            sx={{ flex: { sm: 1 } }}
          >
            Open Excel
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
