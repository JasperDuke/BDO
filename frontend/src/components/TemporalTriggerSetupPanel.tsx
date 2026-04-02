"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  agentTriggerConfigApi,
  type AgentTriggerConfigDto,
} from "@/lib/agentTriggerConfigApi";

export const DEFAULT_AGENT_TRIGGER_URL =
  "https://backend.atenxion.ai/api/trigger/agent-trigger";

/** Same default as backend `DEFAULT_AGENT_TRIGGER_MESSAGE` when DB message is empty */
export const DEFAULT_WEBHOOK_MESSAGE =
  "What is this file about? Please analyze the data and extract the main keyword data.";

type SavedSnapshot = {
  apiUrl: string;
  message: string;
  tokenConfigured: boolean;
  token: string;
  updatedAt: string | null;
};

function normalizeDto(raw: unknown): AgentTriggerConfigDto {
  const d = raw as AgentTriggerConfigDto & {
    token_configured?: boolean;
    updated_at?: string | null;
  };
  return {
    apiUrl: typeof d.apiUrl === "string" ? d.apiUrl : "",
    tokenConfigured: Boolean(d.tokenConfigured ?? d.token_configured),
    token: typeof d.token === "string" ? d.token : "",
    message: typeof d.message === "string" ? d.message : "",
    updatedAt:
      (typeof d.updatedAt === "string" ? d.updatedAt : null) ??
      (typeof d.updated_at === "string" ? d.updated_at : null) ??
      null,
  };
}

export function TemporalTriggerSetupPanel() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_AGENT_TRIGGER_URL);
  const [triggerToken, setTriggerToken] = useState("");
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  /** Last confirmed server state — shown in “Saved on server” so you can see what was stored */
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshot | null>(
    null,
  );

  const applyFromServer = useCallback((raw: unknown) => {
    const d = normalizeDto(raw);
    const url = d.apiUrl?.trim() || DEFAULT_AGENT_TRIGGER_URL;
    setApiUrl(url);
    setTokenConfigured(d.tokenConfigured);
    setMessage(d.message);
    setSavedSnapshot({
      apiUrl: url,
      message: d.message,
      tokenConfigured: d.tokenConfigured,
      token: d.token,
      updatedAt: d.updatedAt,
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await agentTriggerConfigApi.get();
      applyFromServer(data);
    } catch {
      setError("Could not load trigger settings.");
      setApiUrl(DEFAULT_AGENT_TRIGGER_URL);
      setTokenConfigured(false);
      setMessage("");
      setSavedSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [applyFromServer]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: { apiUrl: string; message: string; triggerToken?: string } = {
        apiUrl: apiUrl.trim() || DEFAULT_AGENT_TRIGGER_URL,
        message,
      };
      if (triggerToken.trim()) {
        body.triggerToken = triggerToken.trim();
      }
      const { data } = await agentTriggerConfigApi.put(body);
      applyFromServer(data);
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

  const hasCustomMessage = message.trim().length > 0;
  const snapMsg = savedSnapshot?.message ?? "";
  const snapHasMessage = snapMsg.trim().length > 0;
  function savedConfigCard() {
    if (loading || !savedSnapshot) {
      return (
        <Card
          variant="outlined"
          sx={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <CardHeader title="Saved configuration" subheader="Loading…" />
          <CardContent sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Fetching settings from the server…
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card
        variant="outlined"
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <CardHeader
          title="Saved configuration"
          subheader={
            savedSnapshot.updatedAt
              ? `Last updated ${new Date(
                  savedSnapshot.updatedAt,
                ).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}`
              : "From server after load or save"
          }
          titleTypographyProps={{ variant: "subtitle1", fontWeight: 700 }}
          subheaderTypographyProps={{ variant: "caption" }}
          sx={{ pb: 0, flexShrink: 0 }}
        />
        <CardContent
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            pt: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ lineHeight: 1.2 }}
            >
              Endpoint URL
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                wordBreak: "break-all",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.8125rem",
                lineHeight: 1.45,
              }}
            >
              {savedSnapshot.apiUrl || "—"}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ lineHeight: 1.2 }}
            >
              Authorization token
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mt: 0.75 }}
              flexWrap="wrap"
            >
              <Chip
                size="small"
                label={
                  savedSnapshot.tokenConfigured ? "Stored on server" : "Not set"
                }
                color={savedSnapshot.tokenConfigured ? "success" : "default"}
                variant={savedSnapshot.tokenConfigured ? "filled" : "outlined"}
              />
              {savedSnapshot.tokenConfigured && savedSnapshot.token && (
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "ui-monospace, monospace",
                    letterSpacing: "0.15em",
                    color: "text.primary",
                  }}
                  title={savedSnapshot.token}
                >
                  {savedSnapshot.token.length > 12
                    ? `${savedSnapshot.token.slice(0, 5)}.....${savedSnapshot.token.slice(-5)}`
                    : savedSnapshot.token}
                </Typography>
              )}
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ lineHeight: 1.2 }}
            >
              Stored message (database)
            </Typography>
            <Box
              sx={{
                mt: 0.75,
                p: 1.25,
                borderRadius: 1,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                maxHeight: 160,
                overflow: "auto",
              }}
            >
              {snapHasMessage ? (
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    m: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "inherit",
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                  }}
                >
                  {snapMsg}
                </Typography>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontStyle: "italic" }}
                >
                  Empty — nothing custom saved; the server fills the JSON{" "}
                  <code style={{ fontSize: "0.8em" }}>message</code> field with
                  its default value.
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Paper
      sx={{
        p: 0,
        flex: 1,
        width: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Grid
        container
        sx={{ flex: 1, minHeight: 0, flexWrap: { xs: "wrap", md: "nowrap" } }}
      >
        <Grid
          item
          xs={12}
          md={7}
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            borderRight: { md: 1 },
            borderBottom: { xs: 1, md: 0 },
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              p: { xs: 2, sm: 2.5 },
              pr: { md: 2.5 },
            }}
          >
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <Stack spacing={2} sx={{ maxWidth: 720 }}>
              <TextField
                label="Endpoint URL"
                fullWidth
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                disabled={loading}
                placeholder={DEFAULT_AGENT_TRIGGER_URL}
                helperText="POST target for the agent trigger (JSON body)."
              />

              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  flexWrap="wrap"
                  sx={{ mb: 0.75 }}
                >
                  <Typography variant="subtitle2" component="span">
                    Authorization token
                  </Typography>
                  <Chip
                    size="small"
                    label={tokenConfigured ? "Saved on server" : "Not saved"}
                    color={tokenConfigured ? "success" : "default"}
                    variant={tokenConfigured ? "filled" : "outlined"}
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
                <TextField
                  label={tokenConfigured ? "New token (optional)" : "Token"}
                  type="password"
                  fullWidth
                  value={triggerToken}
                  onChange={(e) => setTriggerToken(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  placeholder={
                    tokenConfigured
                      ? "Leave blank to keep current token"
                      : "Paste trigger token (Authorization header value)"
                  }
                  helperText={
                    tokenConfigured
                      ? "Save with this empty to keep the existing token."
                      : "Required for DB-based trigger unless you use env vars only."
                  }
                />
              </Box>

              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 0.75 }}
                  flexWrap="wrap"
                >
                  <Typography variant="subtitle2" component="span">
                    Message
                  </Typography>
                  <Chip
                    size="small"
                    label={
                      hasCustomMessage
                        ? "Custom text will be saved"
                        : "Empty → server default (see card)"
                    }
                    color={hasCustomMessage ? "primary" : "default"}
                    variant={hasCustomMessage ? "filled" : "outlined"}
                  />
                </Stack>
                <TextField
                  label="Webhook payload message"
                  fullWidth
                  multiline
                  minRows={4}
                  maxRows={12}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  placeholder={DEFAULT_WEBHOOK_MESSAGE}
                  helperText="Stored on Save. Leave empty to use the server default (shown on the right)."
                />
              </Box>

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
          </Box>
        </Grid>

        <Grid
          item
          xs={12}
          md={5}
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: { md: 260 },
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              p: { xs: 2, sm: 2 },
              pt: { xs: 2, md: 2.5 },
            }}
          >
            {savedConfigCard()}
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        message={snack || ""}
      />
    </Paper>
  );
}
