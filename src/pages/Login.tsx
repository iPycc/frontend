import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  useTheme,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Cloud as CloudIcon,
  Fingerprint as FingerprintIcon,
  GitHub as GitHubIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/auth';
import { useNotify } from '../contexts/NotificationContext';
import { beginPasskeyLogin, finishPasskeyLogin } from '../api/passkey';
import { api } from '../api/client';
import { OtpInput } from '../components/OtpInput';

export default function Login() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const notify = useNotify();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState<'password' | '2fa'>('password');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/files', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.mfa_required) {
        setMfaToken(res.mfa_token || '');
        setMfaCode('');
        setMfaStep('2fa');
        return;
      }
      navigate('/files', { replace: true });
    } catch (err: any) {
      notify.error(err.response?.data?.message || t('auth.login_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async () => {
    const code = (mfaCode || '').replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) return;
    setMfaLoading(true);
    try {
      const resp = await api.post('/auth/login/2fa', { mfa_token: mfaToken, code });
      const { access_token, user } = resp.data.data as any;
      if (!access_token || !user) throw new Error('Invalid login response');
      useAuthStore.getState().setAuth(access_token, user);
      navigate('/files', { replace: true });
    } catch (err: any) {
      notify.error(err.response?.data?.message || t('auth.two_factor_failed'));
    } finally {
      setMfaLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (typeof window === 'undefined' || !('PublicKeyCredential' in window) || !window.isSecureContext) {
      notify.error(t('auth.passkey_not_supported'));
      return;
    }

    setPasskeyLoading(true);
    try {
      const begin = await beginPasskeyLogin(email.trim() || undefined);
      const resp = await finishPasskeyLogin(begin.challenge_id, begin.options);
      useAuthStore.getState().setAuth(resp.access_token, resp.user);
      navigate('/files', { replace: true });
    } catch (err: any) {
      if (err?.name === 'RP_ID_MISMATCH' && typeof err?.message === 'string') {
        const parts = err.message.split(':');
        const host = parts[1] || '';
        const rpId = parts[2] || '';
        notify.error(t('auth.passkey_rpid_mismatch', { host, rpId }));
      } else if (err?.name === 'NotAllowedError') {
        notify.error(t('auth.passkey_error_not_allowed'));
      } else if (err?.name === 'SecurityError') {
        notify.error(t('auth.passkey_error_security'));
      } else if (err?.name === 'InvalidStateError') {
        notify.error(t('auth.passkey_error_invalid_state'));
      } else {
        notify.error(err.response?.data?.message || err?.message || t('auth.passkey_login_failed'));
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: theme.palette.background.default,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 400,
          p: 2,
          background: 'transparent',
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <CloudIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {t('auth.welcome_back')}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {t('auth.sign_in_subtitle')}
            </Typography>
          </Box>

          {mfaStep === 'password' ? (
            <>
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label={t('auth.email_label')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="dense"
                  required
                  autoFocus
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label={t('auth.password_label')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="dense"
                  required
                  variant="outlined"
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {loading ? t('auth.signing_in') : t('auth.sign_in_button')}
                </Button>
              </form>

              <Divider sx={{ my: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  OR
                </Typography>
              </Divider>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FingerprintIcon />}
                  color="inherit"
                  sx={{ borderColor: theme.palette.divider }}
                  onClick={handlePasskeyLogin}
                  disabled={passkeyLoading}
                >
                  {t('auth.passkey_login')}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GitHubIcon />}
                  color="inherit"
                  sx={{ borderColor: theme.palette.divider }}
                >
                  {t('auth.github_login')}
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Button
                size="small"
                color="inherit"
                startIcon={<ArrowBackIcon />}
                sx={{ mb: 2, textTransform: 'none' }}
                onClick={() => {
                  setMfaStep('password');
                  setMfaToken('');
                  setMfaCode('');
                }}
              >
                {t('common.back')}
              </Button>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
                {t('auth.two_factor_title')}
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {t('auth.two_factor_login_prompt')}
              </Typography>
              <OtpInput
                value={mfaCode}
                onChange={(v) => setMfaCode(v)}
                onComplete={() => handleVerify2fa()}
                autoFocus
                disabled={mfaLoading}
              />
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                disabled={mfaLoading || (mfaCode || '').replace(/\D/g, '').length !== 6}
                onClick={handleVerify2fa}
              >
                {mfaLoading ? t('auth.verifying') : t('auth.verify')}
              </Button>
            </>
          )}

          <Typography align="center" color="text.secondary" sx={{ mt: 4 }} variant="body2">
            {t('auth.no_account')}{' '}
            <Link component={RouterLink} to="/register" color="primary" fontWeight={600}>
              {t('auth.sign_up_button')}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
