import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { Box, Typography, IconButton, Slide, alpha } from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

type NotifyVariant = 'success' | 'warning' | 'error' | 'info';

interface NotifyOptions {
  durationMs?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationItem {
  id: string;
  variant: NotifyVariant;
  message: string;
  durationMs: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextValue {
  notify: (variant: NotifyVariant, message: string, options?: NotifyOptions) => void;
  success: (message: string, options?: NotifyOptions) => void;
  warning: (message: string, options?: NotifyOptions) => void;
  error: (message: string, options?: NotifyOptions) => void;
  info: (message: string, options?: NotifyOptions) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const variantConfig = {
  success: {
    icon: SuccessIcon,
    bgColor: '#1e8e3e',
    textColor: '#ffffff',
  },
  warning: {
    icon: WarningIcon,
    bgColor: '#f9ab00',
    textColor: '#202124',
  },
  error: {
    icon: ErrorIcon,
    bgColor: '#d93025',
    textColor: '#ffffff',
  },
  info: {
    icon: InfoIcon,
    bgColor: '#1a73e8',
    textColor: '#ffffff',
  },
};

interface NotificationToastProps {
  notification: NotificationItem;
  onClose: (id: string) => void;
}

function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const [show, setShow] = useState(false);
  const config = variantConfig[notification.variant];
  const Icon = config.icon;

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setShow(true), 10);

    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      setShow(false);
      setTimeout(() => onClose(notification.id), 300);
    }, notification.durationMs);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [notification.id, notification.durationMs, onClose]);

  const handleClose = () => {
    setShow(false);
    setTimeout(() => onClose(notification.id), 300);
  };

  const handleAction = () => {
    notification.action?.onClick();
    handleClose();
  };

  return (
    <Slide direction="up" in={show} mountOnEnter unmountOnExit>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          bgcolor: config.bgColor,
          color: config.textColor,
          borderRadius: 2,
          boxShadow: '0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px 0 rgba(0,0,0,.14), 0 1px 18px 0 rgba(0,0,0,.12)',
          minWidth: 288,
          maxWidth: 568,
          mb: 1,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 5px 5px -3px rgba(0,0,0,.2), 0 8px 10px 1px rgba(0,0,0,.14), 0 3px 14px 2px rgba(0,0,0,.12)',
          },
        }}
      >
        <Icon sx={{ fontSize: 20, flexShrink: 0 }} />
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            fontWeight: 500,
            fontSize: '0.875rem',
            lineHeight: 1.43,
            letterSpacing: '0.01071em',
          }}
        >
          {notification.message}
        </Typography>
        {notification.action && (
          <Typography
            component="button"
            onClick={handleAction}
            sx={{
              background: 'none',
              border: 'none',
              color: notification.variant === 'warning' ? '#202124' : alpha('#ffffff', 0.9),
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.02857em',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              '&:hover': {
                bgcolor: alpha(notification.variant === 'warning' ? '#000000' : '#ffffff', 0.1),
              },
            }}
          >
            {notification.action.label}
          </Typography>
        )}
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{
            color: 'inherit',
            opacity: 0.8,
            p: 0.5,
            '&:hover': {
              opacity: 1,
              bgcolor: alpha(notification.variant === 'warning' ? '#000000' : '#ffffff', 0.1),
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Slide>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback((variant: NotifyVariant, message: string, options?: NotifyOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification: NotificationItem = {
      id,
      variant,
      message,
      durationMs: options?.durationMs ?? 4000,
      action: options?.action,
    };

    setNotifications((prev) => {
      // Limit to 3 notifications at a time
      const newNotifications = [...prev, notification];
      if (newNotifications.length > 3) {
        return newNotifications.slice(-3);
      }
      return newNotifications;
    });
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notify,
      success: (m, o) => notify('success', m, o),
      warning: (m, o) => notify('warning', m, o),
      error: (m, o) => notify('error', m, o),
      info: (m, o) => notify('info', m, o),
    }),
    [notify]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Notification Container - Google style bottom-left positioning */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          pointerEvents: 'none',
          '& > *': {
            pointerEvents: 'auto',
          },
        }}
      >
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </Box>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify must be used within NotificationProvider');
  return ctx;
}
