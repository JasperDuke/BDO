"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
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
import { FiSearch } from "react-icons/fi";
import { api } from "@/lib/api";
import type { ArtemisRecord } from "@/types/artemis";
import { ArtemisRecordDetailDrawer } from "@/components/ArtemisRecordDetailDrawer";

type Order = "asc" | "desc";

type Summary = {
  pepFlag?: boolean;
  sanctionsFlag?: boolean;
  adverseNewsFlag?: boolean;
  ownRestrictedListFlag?: boolean;
  noHitFlag?: boolean;
};

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

      <ArtemisRecordDetailDrawer
        record={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </Paper>
  );
}
