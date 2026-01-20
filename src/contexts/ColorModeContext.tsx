import { createContext, useState, useMemo, useContext, type ReactNode } from 'react';
import { ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import { getTheme } from '../theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ColorModeContextType {
  toggleColorMode: () => void;
  setColorMode: (mode: ThemeMode) => void;
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
}

const ColorModeContext = createContext<ColorModeContextType>({
  toggleColorMode: () => {},
  setColorMode: () => {},
  mode: 'system',
  resolvedMode: 'dark',
});

export const useColorMode = () => useContext(ColorModeContext);

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem('colorMode');
    if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
      return savedMode;
    }
    return 'system';
  });

  const resolvedMode = useMemo(() => {
    if (mode === 'system') {
      return prefersDarkMode ? 'dark' : 'light';
    }
    return mode;
  }, [mode, prefersDarkMode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('colorMode', newMode);
          return newMode;
        });
      },
      setColorMode: (newMode: ThemeMode) => {
        localStorage.setItem('colorMode', newMode);
        setMode(newMode);
      },
      mode,
      resolvedMode,
    }),
    [mode, resolvedMode]
  );

  const theme = useMemo(() => createTheme(getTheme(resolvedMode)), [resolvedMode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
