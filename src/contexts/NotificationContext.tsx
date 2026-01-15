import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, AlertColor, Snackbar } from '@mui/material';

type NotifyVariant = AlertColor;

interface NotifyOptions {
  durationMs?: number;
}

interface NotificationContextValue {
  notify: (variant: NotifyVariant, message: string, options?: NotifyOptions) => void;
  success: (message: string, options?: NotifyOptions) => void;
  warning: (message: string, options?: NotifyOptions) => void;
  error: (message: string, options?: NotifyOptions) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState<NotifyVariant>('success');
  const [durationMs, setDurationMs] = useState<number>(3200);

  const notify = useCallback((v: NotifyVariant, m: string, options?: NotifyOptions) => {
    setVariant(v);
    setMessage(m);
    setDurationMs(options?.durationMs ?? 3200);
    setOpen(true);
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notify,
      success: (m, o) => notify('success', m, o),
      warning: (m, o) => notify('warning', m, o),
      error: (m, o) => notify('error', m, o),
    }),
    [notify]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={durationMs}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          variant="filled"
          severity={variant}
          onClose={() => setOpen(false)}
          sx={{ borderRadius: 999, px: 2, alignItems: 'center' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify must be used within NotificationProvider');
  return ctx;
}

