"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { agentTriggerConfigApi } from "@/lib/agentTriggerConfigApi";

export const DEFAULT_AGENT_TRIGGER_URL =
  "https://backend.atenxion.ai/api/trigger/agent-trigger";

export function TemporalTriggerSetupPanel() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_AGENT_TRIGGER_URL);
  const [triggerToken, setTriggerToken] = useState("");
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await agentTriggerConfigApi.get();
      setApiUrl(data.apiUrl?.trim() || DEFAULT_AGENT_TRIGGER_URL);
      setTokenConfigured(Boolean(data.tokenConfigured));
    } catch {
      setError("Could not load trigger settings.");
      setApiUrl(DEFAULT_AGENT_TRIGGER_URL);
      setTokenConfigured(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: { apiUrl: string; triggerToken?: string } = {
        apiUrl: apiUrl.trim() || DEFAULT_AGENT_TRIGGER_URL,
      };
      if (triggerToken.trim()) {
        body.triggerToken = triggerToken.trim();
      }
      const { data } = await agentTriggerConfigApi.put(body);
      setApiUrl(data.apiUrl || DEFAULT_AGENT_TRIGGER_URL);
      setTokenConfigured(Boolean(data.tokenConfigured));
      setTriggerToken("");
      setSnack("Temporal trigger settings saved.");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Save failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 2.5 },
        flex: 1,
        width: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
        Temporal trigger (agent webhook)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65 }}>
        File uploads call this endpoint with attachment URLs. Values saved here are used first; if
        either URL or token is missing, the server falls back to{" "}
        <code>AGENT_API_URL</code> and <code>AGENT_TRIGGER_TOKEN</code> in environment variables
        (see server logs when fallback runs).
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <TextField
          label="Endpoint URL"
          fullWidth
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          disabled={loading}
          placeholder={DEFAULT_AGENT_TRIGGER_URL}
          helperText="POST target for the agent trigger (JSON body)."
        />
        <TextField
          label="Authorization token"
          type="password"
          fullWidth
          value={triggerToken}
          onChange={(e) => setTriggerToken(e.target.value)}
          disabled={loading}
          autoComplete="off"
          placeholder={
            tokenConfigured
              ? "Leave blank to keep the current token"
              : "Paste trigger token (sent as Authorization header)"
          }
          helperText={
            tokenConfigured
              ? "A token is already stored. Enter a new value only to replace it."
              : "Required for uploads to trigger the agent (unless using env fallback)."
          }
        />
        <Box>
          <Button
            variant="contained"
            onClick={save}
            disabled={loading || saving || !apiUrl.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </Box>
      </Stack>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        message={snack || ""}
      />
    </Paper>
  );
}
