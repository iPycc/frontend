import { useState } from 'react';
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
  Alert,
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

export default function Register() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(email, name, password);
      navigate('/files');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
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
              {t('auth.sign_up_title')}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {t('auth.sign_up_subtitle')}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('auth.name_label')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="dense"
              required
              autoFocus
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label={t('auth.email_label')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="dense"
              required
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
            <TextField
              fullWidth
              label={t('auth.confirm_password_label')}
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="dense"
              required
              variant="outlined"
              size="small"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? t('auth.creating_account') : t('auth.sign_up_button')}
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
            {t('auth.has_account')}{' '}
            <Link component={RouterLink} to="/login" color="primary" fontWeight={600}>
              {t('auth.sign_in_button')}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
