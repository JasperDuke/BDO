"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { FiChevronDown, FiX } from "react-icons/fi";
import type { ArtemisRecord } from "@/types/artemis";

const SECTIONS: { key: string; label: string }[] = [
  { key: "metadata", label: "Case & metadata" },
  { key: "entityInformation", label: "Entity information" },
  { key: "screeningAndSearchConclusion", label: "Screening & search" },
  { key: "riskAssessment", label: "Risk assessment" },
  { key: "approvalHistory", label: "Approval history" },
  { key: "modificationDetails", label: "Record history" },
];

const SKIP_KEYS = new Set(["__v", "_searchText"]);
const MAX_DEPTH = 12;

function str(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  return String(v);
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function tryFormatDate(s: string): string | null {
  if (typeof s !== "string" || s.length < 8) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(s) && !/^\d{1,2}\s+\w{3}\s+\d{4}/.test(s))
    return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function FieldValue({ value, depth }: { value: unknown; depth: number }) {
  if (depth > MAX_DEPTH) {
    return (
      <Typography
        variant="body2"
        component="pre"
        sx={{
          m: 0,
          fontFamily: "ui-monospace",
          fontSize: 11,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {JSON.stringify(value, null, 2)}
      </Typography>
    );
  }

  if (value === null || value === undefined) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }

  if (typeof value === "boolean") {
    return (
      <Typography variant="body2" fontWeight={500}>
        {value ? "Yes" : "No"}
      </Typography>
    );
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return <Typography variant="body2">{String(value)}</Typography>;
  }

  if (typeof value === "string") {
    const formatted = tryFormatDate(value);
    return (
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
        {(formatted ?? value) || "—"}
      </Typography>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          None
        </Typography>
      );
    }

    const allObjects = value.every(
      (x) => x !== null && typeof x === "object" && !Array.isArray(x),
    );

    if (allObjects) {
      return (
        <Stack spacing={1.25}>
          {value.map((item, i) => (
            <Paper
              key={i}
              variant="outlined"
              sx={{ p: 1.5, bgcolor: "action.hover", borderStyle: "dashed" }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                display="block"
                sx={{ mb: 1 }}
              >
                Item {i + 1}
              </Typography>
              <FieldGrid
                data={item as Record<string, unknown>}
                depth={depth + 1}
              />
            </Paper>
          ))}
        </Stack>
      );
    }

    return (
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
        {value
          .map((x) => (x === null || x === undefined ? "—" : String(x)))
          .join(", ")}
      </Typography>
    );
  }

  if (typeof value === "object") {
    return (
      <FieldGrid data={value as Record<string, unknown>} depth={depth + 1} />
    );
  }

  return <Typography variant="body2">{String(value)}</Typography>;
}

function FieldGrid({
  data,
  depth,
}: {
  data: Record<string, unknown>;
  depth: number;
}) {
  const entries = Object.entries(data).filter(
    ([k]) => !SKIP_KEYS.has(k) && k !== "_id",
  );
  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Empty
      </Typography>
    );
  }

  return (
    <Stack
      spacing={1.25}
      divider={
        <Box sx={{ borderTop: 1, borderColor: "divider", opacity: 0.5 }} />
      }
    >
      {entries.map(([k, val]) => (
        <Box
          key={k}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "minmax(120px, 34%) 1fr" },
            gap: { xs: 0.5, sm: 1.5 },
            alignItems: "start",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, lineHeight: 1.5, pt: 0.25 }}
          >
            {humanizeKey(k)}
          </Typography>
          <Box>
            <FieldValue value={val} depth={depth} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

export function ArtemisRecordDetailDrawer({
  record,
  open,
  onClose,
}: {
  record: ArtemisRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!record) return null;

  const gd = record.entityInformation?.generalDetails as
    | Record<string, unknown>
    | undefined;
  const displayName = str(gd?.name);
  const caseId = str(record.metadata?.caseId);
  const customerId = str(record.metadata?.customerId);
  const entityType = str(record.metadata?.entityType);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: "min(100%, 560px)", md: 620 },
          maxWidth: "100vw",
        },
      }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            px: 2.5,
            pt: 2.5,
            pb: 2,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "action.hover",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ lineHeight: 1.3, mb: 0.5 }}
              >
                {displayName}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.5 }}
              >
                {[
                  caseId !== "—" ? `Case ${caseId}` : null,
                  customerId !== "—" ? `Customer ${customerId}` : null,
                  entityType !== "—" ? entityType : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Artemis record"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1, fontFamily: "ui-monospace" }}
              >
                ID {record._id}
              </Typography>
            </Box>
            <IconButton
              onClick={onClose}
              size="small"
              aria-label="Close"
              sx={{ mt: -0.5 }}
            >
              <FiX />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 2 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.6 }}
          >
            All fields below are grouped by topic. Expand a section to read or
            review values.
          </Typography>

          <Stack spacing={0.5}>
            {SECTIONS.map(({ key, label }, index) => {
              const raw = (record as unknown as Record<string, unknown>)[key];
              if (raw === undefined || raw === null) return null;

              return (
                <Accordion
                  key={key}
                  defaultExpanded={index < 2}
                  disableGutters
                  elevation={0}
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    "&:before": { display: "none" },
                    overflow: "hidden",
                  }}
                >
                  <AccordionSummary
                    expandIcon={<FiChevronDown size={18} />}
                    sx={{
                      px: 2,
                      minHeight: 48,
                      "& .MuiAccordionSummary-content": { my: 1 },
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {label}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails
                    sx={{ px: 2, pb: 2, pt: 0, bgcolor: "background.paper" }}
                  >
                    {Array.isArray(raw) ? (
                      <FieldValue value={raw} depth={0} />
                    ) : typeof raw === "object" ? (
                      <FieldGrid
                        data={raw as Record<string, unknown>}
                        depth={0}
                      />
                    ) : (
                      <FieldValue value={raw} depth={0} />
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
}
