'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FiLock, FiMail, FiUser } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await register(email.trim(), password, name.trim() || undefined);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
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
              Create account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You’ll use this to sign in and open the dashboard.
            </Typography>
          </Stack>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Name (optional)"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 1, display: 'flex', color: 'text.secondary' }}>
                      <FiUser />
                    </Box>
                  ),
                }}
              />
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 1, display: 'flex', color: 'text.secondary' }}>
                      <FiMail />
                    </Box>
                  ),
                }}
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="new-password"
                fullWidth
                required
                helperText="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 1, display: 'flex', color: 'text.secondary' }}>
                      <FiLock />
                    </Box>
                  ),
                }}
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create account'}
              </Button>
            </Stack>
          </form>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ fontWeight: 600, color: 'inherit' }}>
              Sign in
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
