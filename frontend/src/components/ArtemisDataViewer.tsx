"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Drawer,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { FiChevronDown, FiSearch, FiX } from "react-icons/fi";
import { api } from "@/lib/api";
import type { ArtemisRecord } from "@/types/artemis";

type Order = "asc" | "desc";

type Summary = {
  pepFlag?: boolean;
  sanctionsFlag?: boolean;
  adverseNewsFlag?: boolean;
  ownRestrictedListFlag?: boolean;
  noHitFlag?: boolean;
};

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

function ellip(s: string, max: number) {
  if (s === "—") return s;
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function screeningLine(s: Summary | undefined): string {
  if (!s) return "—";
  const parts: string[] = [];
  if (s.pepFlag) parts.push("PEP");
  if (s.sanctionsFlag) parts.push("Sanctions");
  if (s.adverseNewsFlag) parts.push("Adverse");
  if (s.ownRestrictedListFlag) parts.push("Restricted");
  if (s.noHitFlag) parts.push("No hit");
  return parts.length ? parts.join(" · ") : "No flags";
}

function riskScore(row: ArtemisRecord): string {
  const v = (row.riskAssessment as Record<string, unknown> | undefined)
    ?.totalRiskScorePercentage;
  if (v === undefined || v === null) return "—";
  return typeof v === "number" ? v.toFixed(1) : String(v);
}

function matchCount(row: ArtemisRecord): number {
  const m = row.screeningAndSearchConclusion?.matchDetails;
  return Array.isArray(m) ? m.length : 0;
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

function RecordDetailDrawer({
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
                  .join(" · ") || "Watchlist record"}
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

const COLS = 9;

export function ArtemisDataViewer() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState<Order>("desc");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<ArtemisRecord[]>([]);
  const [selected, setSelected] = useState<ArtemisRecord | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/artemis", {
        params: {
          q: debounced || undefined,
          page: page + 1,
          limit: rowsPerPage,
          sortField,
          sortDir,
        },
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debounced, page, rowsPerPage, sortField, sortDir]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return (
    <Paper sx={{ overflow: "hidden", height: "100%" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <TextField
          placeholder="Search…"
          value={q}
          fullWidth
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FiSearch />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer>
        {loading ? (
          <Box py={5} display="flex" justifyContent="center">
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={
                      sortField === "entityInformation.generalDetails.name"
                    }
                    direction={
                      sortField === "entityInformation.generalDetails.name"
                        ? sortDir
                        : "asc"
                    }
                    onClick={() =>
                      onSort("entityInformation.generalDetails.name")
                    }
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "metadata.caseId"}
                    direction={
                      sortField === "metadata.caseId" ? sortDir : "asc"
                    }
                    onClick={() => onSort("metadata.caseId")}
                  >
                    Case ID
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "metadata.customerId"}
                    direction={
                      sortField === "metadata.customerId" ? sortDir : "asc"
                    }
                    onClick={() => onSort("metadata.customerId")}
                  >
                    Customer
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "metadata.entityType"}
                    direction={
                      sortField === "metadata.entityType" ? sortDir : "asc"
                    }
                    onClick={() => onSort("metadata.entityType")}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "metadata.caseStatus"}
                    direction={
                      sortField === "metadata.caseStatus" ? sortDir : "asc"
                    }
                    onClick={() => onSort("metadata.caseStatus")}
                  >
                    Case status
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === "metadata.riskRating"}
                    direction={
                      sortField === "metadata.riskRating" ? sortDir : "asc"
                    }
                    onClick={() => onSort("metadata.riskRating")}
                  >
                    Risk
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={
                      sortField === "riskAssessment.totalRiskScorePercentage"
                    }
                    direction={
                      sortField === "riskAssessment.totalRiskScorePercentage"
                        ? sortDir
                        : "asc"
                    }
                    onClick={() =>
                      onSort("riskAssessment.totalRiskScorePercentage")
                    }
                  >
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Matches</TableCell>
                <TableCell>Screening</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => {
                const name = str(
                  (
                    row.entityInformation?.generalDetails as Record<
                      string,
                      unknown
                    >
                  )?.name,
                );
                const summary = row.screeningAndSearchConclusion?.summary as
                  | Summary
                  | undefined;
                const line = screeningLine(summary);
                return (
                  <TableRow
                    key={row._id}
                    hover
                    onClick={() => setSelected(row)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        noWrap
                        sx={{ maxWidth: 220 }}
                      >
                        {ellip(name, 36)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                        {ellip(str(row.metadata?.caseId), 16)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                        {ellip(str(row.metadata?.customerId), 16)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {str(row.metadata?.entityType)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                        {ellip(str(row.metadata?.caseStatus), 20)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {str(row.metadata?.riskRating)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="primary.light"
                      >
                        {riskScore(row)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{matchCount(row)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={line} placement="top">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                          sx={{ maxWidth: 160 }}
                        >
                          {ellip(line, 24)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!items.length && (
                <TableRow>
                  <TableCell colSpan={COLS}>
                    <Typography color="text.secondary" align="center" py={3}>
                      No records found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25]}
        sx={{ borderTop: 1, borderColor: "divider" }}
      />

      <RecordDetailDrawer
        record={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </Paper>
  );
}
