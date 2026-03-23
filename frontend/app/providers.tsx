'use client';

import { CssBaseline, ThemeProvider } from '@mui/material';
import { artemisTheme } from '@/theme/theme';
import { AuthProvider } from '@/context/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={artemisTheme}>
      <CssBaseline />
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
