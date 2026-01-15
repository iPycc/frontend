import { ThemeOptions } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === 'dark'
      ? {
          // Modern Dark Theme
          primary: {
            main: '#6366f1', // Indigo 500
            light: '#818cf8',
            dark: '#4f46e5',
          },
          secondary: {
            main: '#ec4899', // Pink 500
            light: '#f472b6',
            dark: '#db2777',
          },
          background: {
            default: '#09090b', // Slate 950 - Very dark
            paper: '#18181b', // Slate 900
          },
          text: {
            primary: '#fafafa', // Slate 50
            secondary: '#a1a1aa', // Slate 400
          },
          divider: 'rgba(255, 255, 255, 0.08)',
        }
      : {
          // Light Theme
          primary: {
            main: '#4f46e5',
            light: '#6366f1',
            dark: '#4338ca',
          },
          secondary: {
            main: '#db2777',
            light: '#ec4899',
            dark: '#be185d',
          },
          background: {
            default: '#f8fafc',
            paper: '#ffffff',
          },
          text: {
            primary: '#0f172a',
            secondary: '#64748b',
          },
          divider: 'rgba(0, 0, 0, 0.08)',
        }),
  },
  typography: {
    fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderBottom: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          backgroundColor: mode === 'dark' ? '#09090b' : '#ffffff', // Match background default
        },
      },
    },
  },
});
