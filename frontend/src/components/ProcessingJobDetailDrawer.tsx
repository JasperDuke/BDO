"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { FiDownload, FiX } from "react-icons/fi";
import { RiFileExcelLine } from "react-icons/ri";
import type { ProcessingJob, UploadedFileMeta } from "@/types/processingJob";

function isPdfFile(file: UploadedFileMeta) {
  return (
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf")
  );
}

function isXlsxFile(file: UploadedFileMeta) {
  return (
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.originalname.toLowerCase().endsWith(".xlsx")
  );
}

type Props = {
  job: ProcessingJob | null;
  open: boolean;
  onClose: () => void;
};

export function ProcessingJobDetailDrawer({ job, open, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const [selectedUploadIdx, setSelectedUploadIdx] = useState(0);

  useEffect(() => {
    setTab(0);
    setSelectedUploadIdx(0);
  }, [job?.id]);

  const selectedUpload = job?.uploadedFiles[selectedUploadIdx] ?? null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 640, md: 720 } } }}
    >
      {job && (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
          >
            <Box sx={{ minWidth: 0, pr: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Job details
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap title={job.eventId}>
                {job.eventId}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <FiX />
            </IconButton>
          </Stack>

          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="fullWidth"
            sx={{ flexShrink: 0, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Uploaded files" />
            <Tab label="Results" />
          </Tabs>

          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", p: 2 }}>
            {tab === 0 && (
              <>
                {job.uploadedFiles.length === 0 ? (
                  <Alert severity="info">No uploaded files recorded for this job.</Alert>
                ) : (
                  <>
                    <List dense disablePadding sx={{ mb: 1.5, flexShrink: 0 }}>
                      {job.uploadedFiles.map((file, idx) => (
                        <ListItemButton
                          key={`${file.filename}-${idx}`}
                          selected={idx === selectedUploadIdx}
                          onClick={() => setSelectedUploadIdx(idx)}
                          sx={{ borderRadius: 1, mb: 0.5 }}
                        >
                          <ListItemText
                            primary={file.originalname}
                            secondary={
                              isPdfFile(file)
                                ? "PDF — click to preview"
                                : isXlsxFile(file)
                                  ? "Excel — preview not available"
                                  : "Click to open"
                            }
                            primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                            secondaryTypographyProps={{ variant: "caption" }}
                          />
                        </ListItemButton>
                      ))}
                    </List>

                    {selectedUpload ? (
                      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                        {isPdfFile(selectedUpload) && selectedUpload.url ? (
                          <Box
                            component="iframe"
                            src={selectedUpload.url}
                            title={selectedUpload.originalname}
                            sx={{
                              flex: 1,
                              width: "100%",
                              minHeight: 360,
                              border: 1,
                              borderColor: "divider",
                              borderRadius: 1,
                            }}
                          />
                        ) : (
                          <Alert severity="info" sx={{ mb: 1.5 }}>
                            {isXlsxFile(selectedUpload)
                              ? "Excel files cannot be previewed in the browser. Use download below."
                              : "Preview is not available for this file type."}
                          </Alert>
                        )}

                        {selectedUpload.url && (
                          <Button
                            sx={{ mt: 1.5, flexShrink: 0 }}
                            fullWidth
                            variant="outlined"
                            component="a"
                            href={selectedUpload.url}
                            download={selectedUpload.originalname}
                            startIcon={<FiDownload />}
                          >
                            Download {selectedUpload.originalname}
                          </Button>
                        )}
                      </Box>
                    ) : null}
                  </>
                )}
              </>
            )}

            {tab === 1 && (
              <>
                {job.status === "processing" && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Processing is still in progress. Results will appear here when ready.
                  </Alert>
                )}

                {job.status === "failed" && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {job.errorMessage || "Processing did not complete successfully."}
                  </Alert>
                )}

                {job.status === "completed" && job.resultPdfUrl ? (
                  <Box
                    component="iframe"
                    src={job.resultPdfUrl}
                    title="Result PDF"
                    sx={{
                      flex: 1,
                      width: "100%",
                      minHeight: 360,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      mb: 1.5,
                    }}
                  />
                ) : job.status === "completed" ? (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    No result PDF available.
                  </Alert>
                ) : null}

                {job.status === "completed" && (
                  <Stack spacing={1} sx={{ flexShrink: 0 }}>
                    {job.resultPdfUrl && (
                      <Button
                        fullWidth
                        variant="outlined"
                        component="a"
                        href={job.resultPdfUrl}
                        download
                        startIcon={<FiDownload />}
                      >
                        Download PDF
                      </Button>
                    )}
                    {job.resultXlsxUrl && (
                      <Button
                        fullWidth
                        variant="outlined"
                        component="a"
                        href={job.resultXlsxUrl}
                        download
                        startIcon={<RiFileExcelLine />}
                      >
                        Download XLSX
                      </Button>
                    )}
                  </Stack>
                )}
              </>
            )}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
