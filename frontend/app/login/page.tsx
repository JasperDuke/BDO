"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiLock, FiMail } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    // if (password.length < 8) {
    //   setError('Password must be at least 8 characters');
    //   return;
    // }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not sign in";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" py={4} px={2}>
      <Container maxWidth="xs" disableGutters sx={{ maxWidth: 400 }}>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={0.5} mb={2.5}>
            <Typography variant="h5" component="h1">
              Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use your account to upload files or browse saved Artemis records.
            </Typography>
          </Stack>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box
                      component="span"
                      sx={{ mr: 1, display: "flex", color: "text.secondary" }}
                    >
                      <FiMail />
                    </Box>
                  ),
                }}
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box
                      component="span"
                      sx={{ mr: 1, display: "flex", color: "text.secondary" }}
                    >
                      <FiLock />
                    </Box>
                  ),
                }}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </Stack>
          </form>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            No account?{" "}
            <Link
              href="/register"
              style={{ fontWeight: 600, color: "inherit" }}
            >
              Create one
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
