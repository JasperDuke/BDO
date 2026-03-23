import { alpha, createTheme } from '@mui/material/styles';

/** One accent, neutral surfaces — easy to read, not busy */
const bg = '#131314';
const elevated = '#1a1a1c';
const border = alpha('#fff', 0.08);
const accent = '#7eb3ff';

export const artemisTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: accent,
      light: '#a8cbff',
      dark: '#5c8fd9',
      contrastText: '#0a0a0b',
    },
    secondary: {
      main: alpha(accent, 0.55),
      contrastText: '#fff',
    },
    background: {
      default: bg,
      paper: elevated,
    },
    text: {
      primary: '#ececee',
      secondary: alpha('#ececee', 0.55),
    },
    divider: border,
    success: { main: '#7bc96f' },
    warning: { main: '#e6b84d' },
    error: { main: '#e07070' },
    info: { main: accent },
    action: {
      hover: alpha('#fff', 0.06),
      selected: alpha(accent, 0.12),
    },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
    h4: { fontWeight: 600, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body2: { lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: bg },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8 },
        containedPrimary: {
          '&:hover': { backgroundColor: '#9ec5ff' },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${border}`,
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'transparent' },
      styleOverrides: {
        root: {
          backgroundColor: elevated,
          borderBottom: `1px solid ${border}`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, minHeight: 44 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: elevated,
          borderLeft: `1px solid ${border}`,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.75rem',
          color: alpha('#ececee', 0.65),
          borderBottom: `1px solid ${border}`,
          backgroundColor: alpha('#000', 0.2),
        },
        body: { borderColor: border },
      },
    },
  },
});
