import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  alpha,
  Paper,
  Stack,
} from '@mui/material';
import {
  Lock as LockIcon,
  Fingerprint as FingerprintIcon,
  Computer as ComputerIcon,
  Smartphone as SmartphoneIcon,
  Add as AddIcon,
  InfoOutlined as InfoIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../api/client';
import { useNotify } from '../../contexts/NotificationContext';

interface SessionInfo {
  id: string;
  device_info: string;
  ip_address: string;
  location: string | null;
  is_current: boolean;
  created_at: string;
}

export default function Security() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user, logoutServer } = useAuthStore();
  const notify = useNotify();

  // Password State
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const isLanIp = (ip: string) => {
    const value = ip.trim().toLowerCase();
    if (!value) return false;
    if (value === '::1' || value === 'localhost') return true;
    if (value.startsWith('fe80:')) return true;
    if (value.startsWith('fc') || value.startsWith('fd')) return true;

    const parts = value.split('.');
    if (parts.length !== 4) return false;
    const nums = parts.map((p) => Number(p));
    if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
    const [a, b] = nums;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    return false;
  };

  const parseDeviceInfo = (deviceInfo: string) => {
    const raw = (deviceInfo || '').trim();
    if (!raw) return { browser: t('settings.security.unknown_device'), os: '' };
    if (raw.toLowerCase().startsWith('unknown')) return { browser: t('settings.security.unknown_device'), os: '' };
    const parts = raw.split('/').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return { browser: parts[0], os: parts.slice(1).join(' / ') };
    return { browser: raw, os: '' };
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await api.get('/user/sessions');
      setSessions(response.data.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleTerminateSession = async (sessionId: string) => {
    try {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      await api.delete(`/user/sessions/${sessionId}`);
      notify.success(t('settings.security.terminate_success'));
      await fetchSessions();
    } catch (error) {
      await fetchSessions();
      notify.error(t('settings.security.terminate_error'));
    }
  };

  const handleTerminateOtherSessions = async () => {
    try {
      const keepCurrent = sessions.find((s) => s.is_current);
      setSessions(keepCurrent ? [keepCurrent] : []);
      await api.delete('/user/sessions/others');
      notify.success(t('settings.security.terminate_success'));
      await fetchSessions();
    } catch {
      await fetchSessions();
      notify.error(t('settings.security.terminate_error'));
    }
  };

  const handleClosePasswordDialog = () => {
    setChangePasswordOpen(false);
    setStep(1);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleVerifyOldPassword = async () => {
    if (!oldPassword) return;
    setStep(2);
  };

  const handleSubmitPasswordChange = async () => {
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwords_not_match'));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t('settings.password_too_short'));
      return;
    }

    setPasswordLoading(true);
    try {
      await api.put('/user/password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      notify.success(t('settings.password_changed'));
      handleClosePasswordDialog();
      await logoutServer();
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || t('settings.password_change_failed'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const BlockTitle = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, fontSize: '1rem' }}>
      {children}
    </Typography>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 4, md: 6 }, maxWidth: 800 }}>
      
      {/* Password Section */}
      <Box>
        <BlockTitle>{t('settings.change_password')}</BlockTitle>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            bgcolor: alpha(theme.palette.info.main, 0.1), 
            borderColor: alpha(theme.palette.info.main, 0.2),
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <InfoIcon color="info" />
          <Typography variant="body2" sx={{ flex: 1 }}>
            {t('settings.change_password_desc', { email: user?.email })}
          </Typography>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => setChangePasswordOpen(true)}
            startIcon={<LockIcon />}
          >
            {t('settings.change_password')}
          </Button>
        </Paper>
      </Box>

      {/* 2FA Section */}
      <Box>
        <BlockTitle>{t('settings.security.two_factor')}</BlockTitle>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<OpenInNewIcon />}
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none',
              color: theme.palette.text.primary,
              borderColor: theme.palette.divider,
              py: 1,
              px: 2
            }}
            disabled
          >
            {t('settings.security.setup')} ({t('storage.coming_soon')})
          </Button>
        </Box>
      </Box>

      {/* Passkeys Section */}
      <Box>
        <BlockTitle>{t('settings.security.passkeys')}</BlockTitle>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            bgcolor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            minHeight: 160,
            mb: 2,
            borderColor: theme.palette.divider,
          }}
        >
          <FingerprintIcon sx={{ fontSize: 48, color: theme.palette.text.secondary }} />
          <Typography color="text.secondary" align="center">
            {t('settings.security.passkeys_desc')}
          </Typography>
        </Paper>
        <Button 
          variant="outlined" 
          startIcon={<AddIcon />}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            color: theme.palette.text.primary,
            borderColor: theme.palette.divider,
          }}
          disabled
        >
          {t('settings.security.setup')}
        </Button>
      </Box>

      {/* Recent Activity Section */}
      <Box>
        <BlockTitle>{t('settings.security.recent_activity')}</BlockTitle>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Button
            size="small"
            color="error"
            variant="text"
            onClick={handleTerminateOtherSessions}
            disabled={loadingSessions || sessions.filter((s) => !s.is_current).length === 0}
          >
            {t('settings.security.terminate_all')}
          </Button>
        </Box>
        <List disablePadding>
          {sessions.filter((s) => s.is_current).length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 1 }}>
              {t('settings.security.current_session')}
            </Typography>
          )}
          {sessions.filter((s) => s.is_current).map((session) => {
            const device = parseDeviceInfo(session.device_info);
            const showLan = isLanIp(session.ip_address);
            return (
            <Box key={session.id}>
              <ListItem 
                sx={{ px: 0 }}
                secondaryAction={
                  <Button
                    size="small"
                    color="error"
                    onClick={async () => {
                      await logoutServer();
                      window.location.replace('/login');
                    }}
                  >
                    {t('common.logout')}
                  </Button>
                }
              >
                <ListItemIcon>
                  {session.device_info.toLowerCase().includes('mobile') || session.device_info.toLowerCase().includes('iphone') || session.device_info.toLowerCase().includes('android') 
                    ? <SmartphoneIcon /> 
                    : <ComputerIcon />
                  }
                </ListItemIcon>
                <ListItemText 
                  primary={`${device.browser}${device.os ? ` · ${device.os}` : ''}`}
                  secondary={
                    <Box component="span">
                      <Typography component="span" variant="body2" color="text.secondary">
                        {(session.location || (showLan ? t('settings.security.lan') : t('settings.security.unknown_location')))} • {session.ip_address}
                      </Typography>
                      {session.is_current && (
                        <>
                          <Box component="span" sx={{ mx: 1 }}>•</Box>
                          <Typography component="span" variant="caption" color="success.main">{t('settings.active_now')}</Typography>
                        </>
                      )}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {new Date(session.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              <Divider sx={{ my: 1 }} />
            </Box>
          )})}

          {sessions.filter((s) => !s.is_current).length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 1 }}>
              {t('settings.security.other_sessions')}
            </Typography>
          )}

          {sessions.filter((s) => !s.is_current).map((session) => {
            const device = parseDeviceInfo(session.device_info);
            const showLan = isLanIp(session.ip_address);
            return (
            <Box key={session.id}>
              <ListItem 
                sx={{ px: 0 }}
                secondaryAction={
                  <Button 
                    size="small" 
                    color="error" 
                    onClick={() => handleTerminateSession(session.id)}
                  >
                    {t('settings.security.terminate')}
                  </Button>
                }
              >
                <ListItemIcon>
                  {session.device_info.toLowerCase().includes('mobile') || session.device_info.toLowerCase().includes('iphone') || session.device_info.toLowerCase().includes('android') 
                    ? <SmartphoneIcon /> 
                    : <ComputerIcon />
                  }
                </ListItemIcon>
                <ListItemText 
                  primary={`${device.browser}${device.os ? ` · ${device.os}` : ''}`}
                  secondary={
                    <Box component="span">
                      <Typography component="span" variant="body2" color="text.secondary">
                        {(session.location || (showLan ? t('settings.security.lan') : t('settings.security.unknown_location')))} • {session.ip_address}
                      </Typography>
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {new Date(session.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              <Divider sx={{ my: 1 }} />
            </Box>
          )})}

          {loadingSessions && (
            <Typography color="text.secondary">{t('common.loading')}</Typography>
          )}
          {!loadingSessions && sessions.length === 0 && (
            <Typography color="text.secondary">{t('settings.security.no_sessions')}</Typography>
          )}
        </List>
      </Box>

      {/* Password Dialog */}
      <Dialog 
        open={changePasswordOpen} 
        onClose={handleClosePasswordDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 3,
            bgcolor: theme.palette.background.paper,
            backgroundImage: 'none',
            boxShadow: theme.shadows[10],
          } 
        }}
      >
        <DialogTitle sx={{ p: 3, pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {t('settings.change_password_for_email', { email: user?.email })}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}
          
          {step === 1 && (
            <Box>
              <Typography sx={{ mb: 3, color: 'text.secondary' }}>{t('settings.enter_old_password_first')}</Typography>
              <TextField
                label={t('settings.current_password')}
                type="password"
                fullWidth
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                autoFocus
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Box>
          )}

          {step === 2 && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label={t('settings.new_password')}
                type="password"
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label={t('settings.confirm_new_password')}
                type="password"
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleClosePasswordDialog} sx={{ color: 'text.secondary' }}>{t('common.cancel')}</Button>
          {step === 1 ? (
            <Button 
              variant="contained" 
              onClick={handleVerifyOldPassword}
              disabled={!oldPassword}
              sx={{ borderRadius: 2, px: 3 }}
            >
              {t('common.next')}
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleSubmitPasswordChange} 
              disabled={passwordLoading || !newPassword}
              sx={{ borderRadius: 2, px: 3 }}
            >
              {passwordLoading ? t('common.loading') : t('common.confirm')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
