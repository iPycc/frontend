import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  useTheme,
  IconButton,
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
  CircularProgress,
  Collapse,
  InputAdornment,
  OutlinedInput,
} from '@mui/material';
import {
  Lock as LockIcon,
  Fingerprint as FingerprintIcon,
  Computer as ComputerIcon,
  Smartphone as SmartphoneIcon,
  Close as CloseIcon,
  PersonAddAlt1 as PersonAddAlt1Icon,
  InfoOutlined as InfoIcon,
  OpenInNew as OpenInNewIcon,
  ContentCopy as ContentCopyIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../api/client';
import { useNotify } from '../../contexts/NotificationContext';
import { beginPasskeyReauth, deletePasskey, finishPasskeyReauth, listPasskeys, registerPasskey } from '../../api/passkey';
import QRCode from 'qrcode';
import { OtpInput } from '../../components/OtpInput';

interface SessionInfo {
  id: string;
  device_info: string;
  ip_address: string;
  location: string | null;
  is_current: boolean;
  created_at: string;
}

interface PasskeyInfo {
  id: string;
  nickname?: string | null;
  device_info?: string | null;
  created_at: string;
  last_used_at?: string | null;
}

export default function Security() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user, logoutServer } = useAuthStore();
  const notify = useNotify();

  // Password State
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordStage, setPasswordStage] = useState<'verify' | 'password' | 'set'>('verify');
  const [reauthToken, setReauthToken] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passkeyReauthTried, setPasskeyReauthTried] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Passkeys State
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  // 2FA (TOTP) State
  const totpEnabled = !!user?.totp_enabled;
  const [totpSetupOpen, setTotpSetupOpen] = useState(false);
  const [totpDisableOpen, setTotpDisableOpen] = useState(false);
  const [totpChallengeId, setTotpChallengeId] = useState('');
  const [totpOtp, setTotpOtp] = useState('');
  const [totpDisableCode, setTotpDisableCode] = useState('');
  const [totpQrDataUrl, setTotpQrDataUrl] = useState<string | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [totpRawUrl, setTotpRawUrl] = useState('');
  const [setupStep, setSetupStep] = useState<1 | 2>(1);

  const getSecretFromUrl = (url: string) => {
    try {
      const match = url.match(/[?&]secret=([^&]+)/);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  };

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

  const formatAgo = (dateStr: string) => {
    const ts = Date.parse(dateStr);
    if (Number.isNaN(ts)) return dateStr;
    const diffMs = Date.now() - ts;
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const lang = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase();
    const isZh = lang.startsWith('zh') || (t('common.login') === '登录');

    const minutes = Math.floor(diffSec / 60);
    const hours = Math.floor(diffSec / 3600);
    const days = Math.floor(diffSec / 86400);

    if (diffSec < 30) return isZh ? '刚刚' : 'just now';
    if (minutes < 60) return isZh ? `${minutes} 分钟前` : `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    if (hours < 24) return isZh ? `${hours} 小时前` : `${hours} hour${hours === 1 ? '' : 's'} ago`;
    return isZh ? `${days} 天前` : `${days} day${days === 1 ? '' : 's'} ago`;
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

  const fetchPasskeys = async () => {
    try {
      const data = await listPasskeys();
      setPasskeys(data);
    } catch {
    }
  };

  const beginTotpSetup = async () => {
    setTotpLoading(true);
    try {
      const resp = await api.post('/user/2fa/totp/begin', {});
      const { challenge_id, otpauth_url } = resp.data.data as any;
      setTotpChallengeId(challenge_id);
      setTotpOtp('');
      setTotpRawUrl(otpauth_url);
      const url = await QRCode.toDataURL(otpauth_url, { margin: 0, width: 200 });
      setTotpQrDataUrl(url);
      setTotpSetupOpen(true);
      setShowManualEntry(false);
      setSetupStep(1);
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('settings.security.two_factor_setup_failed'));
    } finally {
      setTotpLoading(false);
    }
  };

  const enableTotp = async () => {
    const code = (totpOtp || '').replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6 || !totpChallengeId) return;
    setTotpLoading(true);
    try {
      await api.post('/user/2fa/totp/enable', { challenge_id: totpChallengeId, code });
      notify.success(t('settings.security.two_factor_enabled'));
      setTotpSetupOpen(false);
      setTotpChallengeId('');
      setTotpOtp('');
      setTotpQrDataUrl(null);
      if (useAuthStore.getState().user) {
        useAuthStore.setState({ user: { ...useAuthStore.getState().user!, totp_enabled: true } });
      }
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('settings.security.two_factor_enable_failed'));
    } finally {
      setTotpLoading(false);
    }
  };

  const disableTotp = async () => {
    const code = (totpDisableCode || '').replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) return;
    setTotpLoading(true);
    try {
      await api.post('/user/2fa/totp/disable', { code });
      notify.success(t('settings.security.two_factor_disabled'));
      setTotpDisableOpen(false);
      setTotpDisableCode('');
      if (useAuthStore.getState().user) {
        useAuthStore.setState({ user: { ...useAuthStore.getState().user!, totp_enabled: false } });
      }
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('settings.security.two_factor_disable_failed'));
    } finally {
      setTotpLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchPasskeys();
  }, []);

  useEffect(() => {
    if (!changePasswordOpen) return;
    setPasswordStage('verify');
    setReauthToken('');
    setReauthPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordLoading(false);
    setPasskeyReauthTried(false);
  }, [changePasswordOpen]);

  useEffect(() => {
    if (!changePasswordOpen) return;
    if (passwordStage !== 'verify') return;
    void tryPasskeyReauth();
  }, [changePasswordOpen, passwordStage, passkeys.length]);

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
    setPasswordStage('verify');
    setReauthToken('');
    setReauthPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordLoading(false);
    setPasskeyReauthTried(false);
  };

  const tryPasskeyReauth = async () => {
    if (passkeyReauthTried) return;
    setPasskeyReauthTried(true);

    if (typeof window === 'undefined' || !('PublicKeyCredential' in window) || !window.isSecureContext) {
      return;
    }
    if (passkeys.length === 0) return;

    setPasswordLoading(true);
    setPasswordError('');
    try {
      const begin = await beginPasskeyReauth();
      const finish = await finishPasskeyReauth(begin.challenge_id, begin.options);
      setReauthToken(finish.reauth_token);
      setPasswordStage('set');
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') {
        setPasswordError(t('settings.security.passkey_reauth_cancelled'));
      } else if (error?.name === 'SecurityError') {
        setPasswordError(t('auth.passkey_error_security'));
      } else if (error?.name === 'InvalidStateError') {
        setPasswordError(t('auth.passkey_error_invalid_state'));
      } else if (error?.name === 'RP_ID_MISMATCH' && typeof error?.message === 'string') {
        const parts = error.message.split(':');
        const host = parts[1] || '';
        const rpId = parts[2] || '';
        setPasswordError(t('settings.security.passkey_rpid_mismatch', { host, rpId }));
      } else {
        setPasswordError(error.response?.data?.message || error?.message || t('settings.security.passkey_reauth_failed'));
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const verifyWithPassword = async () => {
    if (!reauthPassword) return;
    setPasswordLoading(true);
    setPasswordError('');
    try {
      const resp = await api.post('/user/reauth/password', { password: reauthPassword });
      const { reauth_token } = resp.data.data as any;
      if (!reauth_token) throw new Error('Invalid reauth response');
      setReauthToken(reauth_token);
      setPasswordStage('set');
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || t('settings.security.password_reauth_failed'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSubmitPasswordChange = async () => {
    setPasswordError('');
    if (!reauthToken) {
      setPasswordError(t('settings.security.reauth_required'));
      return;
    }
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
        reauth_token: reauthToken,
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
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            borderColor: theme.palette.divider,
            bgcolor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {totpEnabled ? t('settings.security.two_factor_enabled_label') : t('settings.security.two_factor_disabled_label')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
              {totpEnabled ? t('settings.security.two_factor_enabled_desc') : t('settings.security.two_factor_desc')}
            </Typography>
          </Box>
          {totpEnabled ? (
            <Button
              variant="outlined"
              color="error"
              sx={{ borderRadius: 2, textTransform: 'none', px: 2 }}
              onClick={() => setTotpDisableOpen(true)}
            >
              {t('common.disable')}
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={totpLoading ? <CircularProgress size={16} /> : <OpenInNewIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                color: theme.palette.text.primary,
                borderColor: theme.palette.divider,
                py: 1,
                px: 2,
              }}
              onClick={beginTotpSetup}
              disabled={totpLoading}
            >
              {t('settings.security.setup')}
            </Button>
          )}
        </Paper>

        <Dialog
          open={totpSetupOpen}
          onClose={() => {
            if (totpLoading) return;
            setTotpSetupOpen(false);
            setTotpChallengeId('');
            setTotpOtp('');
            setTotpQrDataUrl(null);
            setTotpRawUrl('');
            setSetupStep(1);
            setShowManualEntry(false);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pb: 0 }}>
            {t('settings.security.two_factor_setup_title')}
          </DialogTitle>
          <DialogContent>
            {setupStep === 1 ? (
              <Box sx={{ pt: 2, pb: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  {t('settings.security.two_factor_scan_title')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: 400 }}>
                  {t('settings.security.two_factor_scan_desc')}
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'common.white',
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mb: 3,
                    width: 'fit-content',
                  }}
                >
                  {totpQrDataUrl ? (
                    <Box component="img" src={totpQrDataUrl} alt="qr" sx={{ width: 180, height: 180 }} />
                  ) : (
                    <CircularProgress size={32} />
                  )}
                </Box>
                <Button
                  size="small"
                  onClick={() => setShowManualEntry(!showManualEntry)}
                  endIcon={showManualEntry ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  sx={{ textTransform: 'none', color: 'text.secondary', mb: 2 }}
                >
                  {t('settings.security.two_factor_cant_scan')}
                </Button>
                <Collapse in={showManualEntry}>
                  <Box sx={{ width: '100%', maxWidth: 360 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', textAlign: 'center' }}>
                      {t('settings.security.two_factor_manual_entry_desc')}
                    </Typography>
                    <OutlinedInput
                      fullWidth
                      readOnly
                      value={getSecretFromUrl(totpRawUrl)}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            onClick={() => {
                              navigator.clipboard.writeText(getSecretFromUrl(totpRawUrl));
                              notify.success(t('common.copied'));
                            }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      }
                      sx={{
                        borderRadius: 2,
                        typography: 'monospace',
                        fontSize: '0.875rem',
                        bgcolor: alpha(theme.palette.action.hover, 0.05),
                        height: 40,
                      }}
                    />
                  </Box>
                </Collapse>
              </Box>
            ) : (
              <Box sx={{ pt: 2, pb: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  {t('settings.security.two_factor_enter_code_title')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
                  {t('settings.security.two_factor_enter_code_desc')}
                </Typography>
                <Box sx={{ maxWidth: 360, width: '100%', mx: 'auto' }}>
                  <OtpInput
                    value={totpOtp}
                    onChange={(v) => setTotpOtp(v)}
                    onComplete={() => enableTotp()}
                    disabled={totpLoading}
                    autoFocus
                  />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0, justifyContent: setupStep === 1 ? 'center' : 'space-between', gap: 2 }}>
            {setupStep === 1 ? (
              <>
                <Button
                  onClick={() => {
                    if (totpLoading) return;
                    setTotpSetupOpen(false);
                    setTotpChallengeId('');
                    setTotpOtp('');
                    setTotpQrDataUrl(null);
                    setTotpRawUrl('');
                    setSetupStep(1);
                    setShowManualEntry(false);
                  }}
                  disabled={totpLoading}
                  variant="outlined"
                  sx={{ borderRadius: 2, px: 3, width: 120 }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setSetupStep(2)}
                  sx={{ borderRadius: 2, px: 3, width: 120 }}
                >
                  {t('common.next')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setSetupStep(1)}
                  disabled={totpLoading}
                  startIcon={<ArrowBackIcon />}
                  sx={{ borderRadius: 2, px: 2, minWidth: 0, color: 'text.secondary' }}
                >
                  {t('common.back')}
                </Button>
                <Button
                  variant="contained"
                  onClick={enableTotp}
                  disabled={totpLoading || (totpOtp || '').replace(/\D/g, '').length !== 6}
                  sx={{ borderRadius: 2, px: 3, whiteSpace: 'nowrap' }}
                >
                  {totpLoading ? t('auth.verifying') : t('settings.security.two_factor_enable_cta')}
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>

        <Dialog
          open={totpDisableOpen}
          onClose={() => {
            if (totpLoading) return;
            setTotpDisableOpen(false);
            setTotpDisableCode('');
          }}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            {t('settings.security.two_factor_disable_title')}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
              {t('settings.security.two_factor_disable_desc')}
            </Typography>
            <OtpInput
              value={totpDisableCode}
              onChange={(v) => setTotpDisableCode(v)}
              onComplete={() => disableTotp()}
              disabled={totpLoading}
              autoFocus
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                if (totpLoading) return;
                setTotpDisableOpen(false);
                setTotpDisableCode('');
              }}
              disabled={totpLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={disableTotp}
              disabled={totpLoading || (totpDisableCode || '').replace(/\D/g, '').length !== 6}
            >
              {totpLoading ? t('auth.verifying') : t('common.disable')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {/* Passkeys Section */}
      <Box>
        <BlockTitle>{t('settings.security.passkeys')}</BlockTitle>
        {passkeys.length > 0 ? (
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {passkeys.map((pk) => {
              const device = parseDeviceInfo(pk.device_info || '');
              const title = device.os
                ? t('settings.security.passkey_label', { os: device.os, browser: device.browser })
                : (pk.nickname || device.browser);
              const created = t('settings.security.passkey_created_ago', { time: formatAgo(pk.created_at) });
              const used = pk.last_used_at
                ? t('settings.security.passkey_last_used_ago', { time: formatAgo(pk.last_used_at) })
                : t('settings.security.passkey_last_used_never');
              return (
                <Paper
                  key={pk.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    borderColor: theme.palette.divider,
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    bgcolor: 'transparent',
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.text.primary, 0.06),
                    }}
                  >
                    <FingerprintIcon sx={{ fontSize: 22 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} sx={{ lineHeight: 1.2 }} noWrap>
                      {title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}
                    >
                      {`${created}  ${used}`}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    aria-label={t('common.delete')}
                    onClick={async () => {
                      try {
                        await deletePasskey(pk.id);
                        notify.success(t('settings.security.passkeys_deleted'));
                        await fetchPasskeys();
                      } catch (error: any) {
                        notify.error(error.response?.data?.message || t('settings.security.passkeys_delete_failed'));
                      }
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Paper>
              );
            })}
          </Stack>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 3,
              borderColor: theme.palette.divider,
              minHeight: 150,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 1.5,
              px: 3,
              mb: 2,
              bgcolor: 'transparent',
            }}
          >
            <FingerprintIcon sx={{ fontSize: 44, color: alpha(theme.palette.text.primary, 0.55) }} />
            <Typography color="text.secondary" align="center" sx={{ maxWidth: 520 }}>
              {t('settings.security.passkeys_empty_hint')}
            </Typography>
          </Paper>
        )}

        <Button
          variant="outlined"
          startIcon={<PersonAddAlt1Icon />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            color: theme.palette.text.primary,
            borderColor: theme.palette.divider,
            px: 2,
          }}
          disabled={passkeyLoading}
          onClick={async () => {
            if (typeof window === 'undefined' || !('PublicKeyCredential' in window) || !window.isSecureContext) {
              notify.error(t('auth.passkey_not_supported'));
              return;
            }
            setPasskeyLoading(true);
            try {
              await registerPasskey();
              notify.success(t('settings.security.passkeys_added'));
              await fetchPasskeys();
            } catch (error: any) {
              if (error?.name === 'RP_ID_MISMATCH' && typeof error?.message === 'string') {
                const parts = error.message.split(':');
                const host = parts[1] || '';
                const rpId = parts[2] || '';
                notify.error(t('settings.security.passkey_rpid_mismatch', { host, rpId }));
              } else if (error?.name === 'NotAllowedError') {
                notify.error(t('auth.passkey_error_not_allowed'));
              } else if (error?.name === 'SecurityError') {
                notify.error(t('auth.passkey_error_security'));
              } else if (error?.name === 'InvalidStateError') {
                notify.error(t('auth.passkey_error_invalid_state'));
              } else {
                notify.error(error.response?.data?.message || error?.message || t('settings.security.passkeys_add_failed'));
              }
            } finally {
              setPasskeyLoading(false);
            }
          }}
        >
          {t('settings.security.passkeys_add_new')}
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
            {t('settings.security.change_password_title', { email: user?.email })}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}

          {passwordStage === 'verify' && (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  py: 2,
                }}
              >
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    position: 'relative',
                    mb: 2,
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(0.9)', opacity: 0.5 },
                      '70%': { transform: 'scale(1.15)', opacity: 0.15 },
                      '100%': { transform: 'scale(1.15)', opacity: 0 },
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 999,
                      background: alpha(theme.palette.primary.main, 0.35),
                      animation: 'pulse 1.4s ease-out infinite',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      inset: 10,
                      borderRadius: 999,
                      background: alpha(theme.palette.primary.main, 0.18),
                    },
                  }}
                >
                  <FingerprintIcon sx={{ fontSize: 30, color: theme.palette.primary.main, position: 'relative', zIndex: 1 }} />
                </Box>
                <Typography fontWeight={800} sx={{ mb: 1 }}>
                  {t('settings.security.reauth_title')}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {t('settings.security.reauth_desc')}
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                {passkeys.length > 0 && (
                  <Button
                    variant="outlined"
                    onClick={tryPasskeyReauth}
                    disabled={passwordLoading}
                    startIcon={passwordLoading ? <CircularProgress size={16} /> : <FingerprintIcon />}
                    sx={{ borderRadius: 2, textTransform: 'none', flex: 1 }}
                  >
                    {t('settings.security.reauth_use_passkey')}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={() => setPasswordStage('password')}
                  disabled={passwordLoading}
                  sx={{ borderRadius: 2, textTransform: 'none', flex: 1 }}
                >
                  {t('settings.security.reauth_use_password')}
                </Button>
              </Stack>
            </Box>
          )}

          {passwordStage === 'password' && (
            <Box>
              <Typography sx={{ mb: 2, color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                {t('settings.security.reauth_password_desc')}
              </Typography>
              <TextField
                label={t('settings.security.current_password')}
                type="password"
                fullWidth
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                autoFocus
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>
          )}

          {passwordStage === 'set' && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Typography color="text.secondary" variant="body2">
                {t('settings.security.password_set_desc')}
              </Typography>
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
          {passwordStage === 'password' && (
            <Button
              variant="contained"
              onClick={verifyWithPassword}
              disabled={passwordLoading || !reauthPassword}
              sx={{ borderRadius: 2, px: 3 }}
            >
              {passwordLoading ? t('auth.verifying') : t('auth.verify')}
            </Button>
          )}
          {passwordStage === 'set' && (
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
