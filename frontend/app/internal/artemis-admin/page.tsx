"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  Snackbar,
} from "@mui/material";
import { FiEdit2, FiFileText, FiPlus, FiTrash2 } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { ArtemisRecordDetailDrawer } from "@/components/ArtemisRecordDetailDrawer";
import { internalArtemisApi } from "@/lib/internalArtemisApi";
import type { ArtemisRecord, EntityType } from "@/types/artemis";

const BLANK_JSON_TEMPLATE = `{
  "Metadata": {
    "entityType": "INDIVIDUAL",
    "caseId": "",
    "customerId": "",
    "caseStatus": "",
    "approvalStatus": "",
    "riskRating": "",
    "nextPeriodicReviewCycle": ""
  },
  "Entity_Information": {
    "General_Details": {
      "isActive": "YES",
      "name": ""
    },
    "Corporate_Specific": null,
    "Individual_Specific": {}
  },
  "Screening_And_Search_Conclusion": {
    "Summary": {
      "pep": "NO",
      "sanctions": "NO",
      "adverseNews": "NO",
      "ownRestrictedList": "NO",
      "noHit": "YES",
      "lastUpdated": ""
    },
    "Match_Details": []
  },
  "Risk_Assessment": {},
  "Approval_History": [],
  "Modification_Details": {}
}`;

function sanitizeImportedPayload(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const o = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  delete o._id;
  delete o.__v;
  delete o._searchText;
  delete o.createdAt;
  delete o.updatedAt;
  return o;
}

function validateImportedRecord(o: Record<string, unknown>): string | null {
  const external =
    o.Metadata != null &&
    typeof o.Metadata === "object" &&
    !Array.isArray(o.Metadata);
  const meta = external ? o.Metadata : o.metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return external
      ? 'Root object must include a "Metadata" object.'
      : 'Root object must include a "metadata" object (or use export format with "Metadata").';
  }
  const et = (meta as Record<string, unknown>).entityType;
  if (et !== "INDIVIDUAL" && et !== "CORPORATE") {
    return external
      ? 'Metadata.entityType must be "INDIVIDUAL" or "CORPORATE".'
      : 'metadata.entityType must be "INDIVIDUAL" or "CORPORATE".';
  }
  return null;
}

type FormState = {
  metadata: {
    entityType: EntityType;
    caseId: string;
    customerId: string;
    caseStatus: string;
    approvalStatus: string;
    riskRating: string;
    nextPeriodicReviewCycleDate: string;
  };
  generalName: string;
  generalAlias: string;
  generalEmail: string;
  generalPhone: string;
  generalAddress: string;
  corpIncorporationNumber: string;
  corpCountryOfIncorporation: string;
  corpPrimaryBusinessActivity: string;
  indIdentificationNumber: string;
  indNationality: string;
  indCountryOfResidence: string;
  indOccupation: string;
  pep: boolean;
  sanctions: boolean;
  adverse: boolean;
  restricted: boolean;
  noHit: boolean;
  officerName: string;
  matchDetailsJson: string;
  riskJson: string;
  approvalHistoryJson: string;
  modificationJson: string;
};

function emptyForm(): FormState {
  return {
    metadata: {
      entityType: "INDIVIDUAL",
      caseId: "",
      customerId: "",
      caseStatus: "",
      approvalStatus: "",
      riskRating: "",
      nextPeriodicReviewCycleDate: "",
    },
    generalName: "",
    generalAlias: "",
    generalEmail: "",
    generalPhone: "",
    generalAddress: "",
    corpIncorporationNumber: "",
    corpCountryOfIncorporation: "",
    corpPrimaryBusinessActivity: "",
    indIdentificationNumber: "",
    indNationality: "",
    indCountryOfResidence: "",
    indOccupation: "",
    pep: false,
    sanctions: false,
    adverse: false,
    restricted: false,
    noHit: false,
    officerName: "",
    matchDetailsJson: "[]",
    riskJson: "{}",
    approvalHistoryJson: "[]",
    modificationJson: "{}",
  };
}

function recordToForm(r: ArtemisRecord): FormState {
  const g = (r.entityInformation?.generalDetails || {}) as Record<
    string,
    string
  >;
  const c = (r.entityInformation?.corporateSpecific || {}) as Record<
    string,
    string
  >;
  const i = (r.entityInformation?.individualSpecific || {}) as Record<
    string,
    string
  >;
  const s = (r.screeningAndSearchConclusion?.summary || {}) as Record<
    string,
    unknown
  >;
  return {
    metadata: {
      entityType: (r.metadata?.entityType as EntityType) || "INDIVIDUAL",
      caseId: r.metadata?.caseId || "",
      customerId: r.metadata?.customerId || "",
      caseStatus: r.metadata?.caseStatus || "",
      approvalStatus: r.metadata?.approvalStatus || "",
      riskRating: r.metadata?.riskRating || "",
      nextPeriodicReviewCycleDate:
        r.metadata?.nextPeriodicReviewCycleDate?.slice?.(0, 10) || "",
    },
    generalName: (g.name as string) || "",
    generalAlias: (g.alias as string) || "",
    generalEmail: (g.emailAddress as string) || "",
    generalPhone: (g.phoneNumber as string) || "",
    generalAddress: (g.address as string) || "",
    corpIncorporationNumber: (c.incorporationNumber as string) || "",
    corpCountryOfIncorporation: (c.countryOfIncorporation as string) || "",
    corpPrimaryBusinessActivity: (c.primaryBusinessActivity as string) || "",
    indIdentificationNumber: (i.identificationNumber as string) || "",
    indNationality: (i.nationality as string) || "",
    indCountryOfResidence: (i.countryOfResidence as string) || "",
    indOccupation: (i.occupation as string) || "",
    pep: Boolean(s.pepFlag),
    sanctions: Boolean(s.sanctionsFlag),
    adverse: Boolean(s.adverseNewsFlag),
    restricted: Boolean(s.ownRestrictedListFlag),
    noHit: Boolean(s.noHitFlag),
    officerName: (s.officerName as string) || "",
    matchDetailsJson: JSON.stringify(
      r.screeningAndSearchConclusion?.matchDetails || [],
      null,
      2,
    ),
    riskJson: JSON.stringify(r.riskAssessment || {}, null, 2),
    approvalHistoryJson: JSON.stringify(r.approvalHistory || [], null, 2),
    modificationJson: JSON.stringify(r.modificationDetails || {}, null, 2),
  };
}

function formToPayload(f: FormState) {
  const metadata = {
    ...f.metadata,
    nextPeriodicReviewCycleDate: f.metadata.nextPeriodicReviewCycleDate
      ? new Date(f.metadata.nextPeriodicReviewCycleDate).toISOString()
      : undefined,
  };
  const generalDetails = {
    name: f.generalName || undefined,
    alias: f.generalAlias || undefined,
    emailAddress: f.generalEmail || undefined,
    phoneNumber: f.generalPhone || undefined,
    address: f.generalAddress || undefined,
  };
  const corporateSpecific =
    f.metadata.entityType === "CORPORATE"
      ? {
          incorporationNumber: f.corpIncorporationNumber || undefined,
          countryOfIncorporation: f.corpCountryOfIncorporation || undefined,
          primaryBusinessActivity: f.corpPrimaryBusinessActivity || undefined,
        }
      : undefined;
  const individualSpecific =
    f.metadata.entityType === "INDIVIDUAL"
      ? {
          identificationNumber: f.indIdentificationNumber || undefined,
          nationality: f.indNationality || undefined,
          countryOfResidence: f.indCountryOfResidence || undefined,
          occupation: f.indOccupation || undefined,
        }
      : undefined;

  let matchDetails: unknown[] = [];
  let riskAssessment: unknown = {};
  let approvalHistory: unknown[] = [];
  let modificationDetails: unknown = {};
  try {
    matchDetails = JSON.parse(f.matchDetailsJson || "[]");
  } catch {
    throw new Error("Match details must be valid JSON array");
  }
  try {
    riskAssessment = JSON.parse(f.riskJson || "{}");
  } catch {
    throw new Error("Risk assessment must be valid JSON object");
  }
  try {
    approvalHistory = JSON.parse(f.approvalHistoryJson || "[]");
  } catch {
    throw new Error("Approval history must be valid JSON array");
  }
  try {
    modificationDetails = JSON.parse(f.modificationJson || "{}");
  } catch {
    throw new Error("Modification details must be valid JSON object");
  }

  return {
    metadata,
    entityInformation: {
      generalDetails,
      corporateSpecific,
      individualSpecific,
    },
    screeningAndSearchConclusion: {
      summary: {
        pepFlag: f.pep,
        sanctionsFlag: f.sanctions,
        adverseNewsFlag: f.adverse,
        ownRestrictedListFlag: f.restricted,
        noHitFlag: f.noHit,
        officerName: f.officerName || undefined,
        lastUpdated: new Date(),
      },
      matchDetails,
    },
    riskAssessment,
    approvalHistory,
    modificationDetails,
  };
}

export default function ArtemisAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ArtemisRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [importDrawerRecord, setImportDrawerRecord] =
    useState<ArtemisRecord | null>(null);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await internalArtemisApi.list({
        q: debouncedQ || undefined,
        limit: 100,
      });
      setItems(data.items);
    } catch {
      setError("Could not load records");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setTab(0);
    setDialogOpen(true);
  }

  function openEdit(row: ArtemisRecord) {
    setEditingId(row._id);
    setForm(recordToForm(row));
    setTab(0);
    setDialogOpen(true);
  }

  async function save() {
    setError(null);
    let payload: ReturnType<typeof formToPayload>;
    try {
      payload = formToPayload(form);
    } catch (err: unknown) {
      setError((err as Error).message);
      return;
    }
    try {
      if (editingId) {
        await internalArtemisApi.update(editingId, payload);
        setSnack("Record updated");
      } else {
        await internalArtemisApi.create(payload);
        setSnack("Record created");
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response
        ?.data?.message;
      setError(msg || "Save failed");
    }
  }

  function openPasteImport() {
    setPasteText("");
    setPasteError(null);
    setPasteOpen(true);
  }

  function fillJsonTemplate() {
    setPasteText(BLANK_JSON_TEMPLATE);
    setPasteError(null);
  }

  async function savePastedJson() {
    setPasteError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(pasteText || "{}");
    } catch {
      setPasteError("Invalid JSON. Check commas and quotes.");
      return;
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      setPasteError("JSON must be a single object (not an array).");
      return;
    }
    const body = sanitizeImportedPayload(parsed as Record<string, unknown>);
    const verr = validateImportedRecord(body);
    if (verr) {
      setPasteError(verr);
      return;
    }
    try {
      const { data } = await internalArtemisApi.create(body);
      setPasteOpen(false);
      setPasteText("");
      setSnack("Record created from JSON");
      setImportDrawerRecord(data as ArtemisRecord);
      setImportDrawerOpen(true);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response
        ?.data?.message;
      setPasteError(msg || "Save failed");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await internalArtemisApi.remove(deleteId);
      setSnack("Record deleted");
      setDeleteId(null);
      load();
    } catch {
      setError("Delete failed");
    }
  }

  if (authLoading || !user) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box minHeight="100vh" py={3} px={2} display="flex" justifyContent="center">
      <Stack sx={{ width: "100%", maxWidth: 1000 }} spacing={2.5}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          gap={2}
        >
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Records (internal)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Edit demo aml records. Not linked from the main app.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<FiFileText />}
              onClick={openPasteImport}
            >
              Import JSON
            </Button>
            <Button
              variant="contained"
              startIcon={<FiPlus />}
              onClick={openCreate}
            >
              New record
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          fullWidth
          helperText="Updates as you type (short delay)"
        />

        <TableContainer component={Paper}>
          {loading ? (
            <Box py={6} display="flex" justifyContent="center">
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Case</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {(row.entityInformation?.generalDetails
                        ?.name as string) || "—"}
                    </TableCell>
                    <TableCell>{row.metadata?.caseId || "—"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={row.metadata?.entityType} />
                    </TableCell>
                    <TableCell>{row.metadata?.caseStatus || "—"}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => openEdit(row)}
                        aria-label="Edit"
                      >
                        <FiEdit2 />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteId(row._id)}
                        aria-label="Delete"
                      >
                        <FiTrash2 />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!items.length && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary" align="center" py={2}>
                        No records
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Stack>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{editingId ? "Edit record" : "Create record"}</DialogTitle>
        <DialogContent dividers>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Core" />
            <Tab label="Entity" />
            <Tab label="Screening" />
            <Tab label="JSON blocks" />
          </Tabs>
          {tab === 0 && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Entity type</InputLabel>
                <Select
                  label="Entity type"
                  value={form.metadata.entityType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      metadata: {
                        ...f.metadata,
                        entityType: e.target.value as EntityType,
                      },
                    }))
                  }
                >
                  <MenuItem value="INDIVIDUAL">Individual</MenuItem>
                  <MenuItem value="CORPORATE">Corporate</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Case ID"
                fullWidth
                value={form.metadata.caseId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    metadata: { ...f.metadata, caseId: e.target.value },
                  }))
                }
              />
              <TextField
                label="Customer ID"
                fullWidth
                value={form.metadata.customerId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    metadata: { ...f.metadata, customerId: e.target.value },
                  }))
                }
              />
              <TextField
                label="Case status"
                fullWidth
                value={form.metadata.caseStatus}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    metadata: { ...f.metadata, caseStatus: e.target.value },
                  }))
                }
              />
              <TextField
                label="Approval status"
                fullWidth
                value={form.metadata.approvalStatus}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    metadata: { ...f.metadata, approvalStatus: e.target.value },
                  }))
                }
              />
              <TextField
                label="Risk rating"
                fullWidth
                value={form.metadata.riskRating}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    metadata: { ...f.metadata, riskRating: e.target.value },
                  }))
                }
              />
              <TextField
                label="Next review (date)"
                type="date"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={form.metadata.nextPeriodicReviewCycleDate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    metadata: {
                      ...f.metadata,
                      nextPeriodicReviewCycleDate: e.target.value,
                    },
                  }))
                }
              />
            </Stack>
          )}
          {tab === 1 && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                General (both entity types)
              </Typography>
              <TextField
                label="Name"
                fullWidth
                required
                value={form.generalName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, generalName: e.target.value }))
                }
              />
              <TextField
                label="Alias"
                fullWidth
                value={form.generalAlias}
                onChange={(e) =>
                  setForm((f) => ({ ...f, generalAlias: e.target.value }))
                }
              />
              <TextField
                label="Email"
                fullWidth
                value={form.generalEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, generalEmail: e.target.value }))
                }
              />
              <TextField
                label="Phone"
                fullWidth
                value={form.generalPhone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, generalPhone: e.target.value }))
                }
              />
              <TextField
                label="Address"
                fullWidth
                multiline
                minRows={2}
                value={form.generalAddress}
                onChange={(e) =>
                  setForm((f) => ({ ...f, generalAddress: e.target.value }))
                }
              />
              {form.metadata.entityType === "CORPORATE" && (
                <>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ pt: 1 }}
                  >
                    Corporate specific
                  </Typography>
                  <TextField
                    label="Incorporation number"
                    fullWidth
                    value={form.corpIncorporationNumber}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        corpIncorporationNumber: e.target.value,
                      }))
                    }
                  />
                  <TextField
                    label="Country of incorporation"
                    fullWidth
                    value={form.corpCountryOfIncorporation}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        corpCountryOfIncorporation: e.target.value,
                      }))
                    }
                  />
                  <TextField
                    label="Primary business activity"
                    fullWidth
                    value={form.corpPrimaryBusinessActivity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        corpPrimaryBusinessActivity: e.target.value,
                      }))
                    }
                  />
                </>
              )}
              {form.metadata.entityType === "INDIVIDUAL" && (
                <>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ pt: 1 }}
                  >
                    Individual specific
                  </Typography>
                  <TextField
                    label="Identification number"
                    fullWidth
                    value={form.indIdentificationNumber}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        indIdentificationNumber: e.target.value,
                      }))
                    }
                  />
                  <TextField
                    label="Nationality"
                    fullWidth
                    value={form.indNationality}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, indNationality: e.target.value }))
                    }
                  />
                  <TextField
                    label="Country of residence"
                    fullWidth
                    value={form.indCountryOfResidence}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        indCountryOfResidence: e.target.value,
                      }))
                    }
                  />
                  <TextField
                    label="Occupation"
                    fullWidth
                    value={form.indOccupation}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, indOccupation: e.target.value }))
                    }
                  />
                </>
              )}
            </Stack>
          )}
          {tab === 2 && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.pep}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pep: e.target.checked }))
                    }
                  />
                }
                label="PEP flag"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.sanctions}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sanctions: e.target.checked }))
                    }
                  />
                }
                label="Sanctions flag"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.adverse}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, adverse: e.target.checked }))
                    }
                  />
                }
                label="Adverse news flag"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.restricted}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, restricted: e.target.checked }))
                    }
                  />
                }
                label="Own restricted list flag"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.noHit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, noHit: e.target.checked }))
                    }
                  />
                }
                label="No-hit flag"
              />
              <TextField
                label="Officer name"
                fullWidth
                value={form.officerName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, officerName: e.target.value }))
                }
              />
            </Stack>
          )}
          {tab === 3 && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Match details (JSON array)"
                fullWidth
                multiline
                minRows={6}
                value={form.matchDetailsJson}
                onChange={(e) =>
                  setForm((f) => ({ ...f, matchDetailsJson: e.target.value }))
                }
              />
              <TextField
                label="Risk assessment (JSON object)"
                fullWidth
                multiline
                minRows={6}
                value={form.riskJson}
                onChange={(e) =>
                  setForm((f) => ({ ...f, riskJson: e.target.value }))
                }
              />
              <TextField
                label="Approval history (JSON array)"
                fullWidth
                multiline
                minRows={4}
                value={form.approvalHistoryJson}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    approvalHistoryJson: e.target.value,
                  }))
                }
              />
              <TextField
                label="Modification details (JSON object)"
                fullWidth
                multiline
                minRows={4}
                value={form.modificationJson}
                onChange={(e) =>
                  setForm((f) => ({ ...f, modificationJson: e.target.value }))
                }
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={!form.generalName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete record?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Paste Artemis record (JSON)</DialogTitle>
        <DialogContent dividers>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1.5, lineHeight: 1.6 }}
          >
            Use the <strong>export format</strong> (PascalCase + underscores):{" "}
            <code>Metadata</code>, <code>Entity_Information</code>,{" "}
            <code>Screening_And_Search_Conclusion</code>,{" "}
            <code>Risk_Assessment</code>, <code>Approval_History</code>,{" "}
            <code>Modification_Details</code>. You can also paste the internal
            API shape (<code>metadata</code>, <code>entityInformation</code>,
            …). <code>_id</code>, <code>__v</code>, <code>_searchText</code>,
            and top-level timestamps are stripped before save; the server maps
            export keys to the database model.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <Button size="small" variant="outlined" onClick={fillJsonTemplate}>
              Insert blank template
            </Button>
          </Stack>
          {pasteError && (
            <Alert
              severity="error"
              sx={{ mb: 1.5 }}
              onClose={() => setPasteError(null)}
            >
              {pasteError}
            </Alert>
          )}
          <TextField
            label="JSON"
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setPasteError(null);
            }}
            fullWidth
            multiline
            minRows={16}
            maxRows={24}
            InputProps={{ sx: { fontFamily: "ui-monospace", fontSize: 13 } }}
            placeholder="{ ... }"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPasteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={savePastedJson}
            disabled={!pasteText.trim()}
          >
            Save and preview
          </Button>
        </DialogActions>
      </Dialog>

      <ArtemisRecordDetailDrawer
        record={importDrawerRecord}
        open={importDrawerOpen && !!importDrawerRecord}
        onClose={() => {
          setImportDrawerOpen(false);
          setImportDrawerRecord(null);
        }}
      />

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        message={snack || ""}
      />
    </Box>
  );
}
