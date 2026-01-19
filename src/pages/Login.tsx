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
} from '@mui/icons-material';
import { useAuthStore } from '../stores/auth';
import { useNotify } from '../contexts/NotificationContext';

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

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/files', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      navigate('/files', { replace: true });
    } catch (err: any) {
      notify.error(err.response?.data?.message || t('auth.login_failed'));
    } finally {
      setLoading(false);
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
