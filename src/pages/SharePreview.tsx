import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  CircularProgress,
  AppBar,
  Toolbar,
  useTheme,
  alpha,
  Card,
  InputAdornment,
  IconButton,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Lock as LockIcon,
  Download as DownloadIcon,
  Cloud as CloudIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Storage as StorageIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { api } from '../api/client';
import { getFileIcon } from '../utils/fileIcons';
import { useNotify } from '../contexts/NotificationContext';

interface PublicShareInfo {
  token: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  has_password: boolean;
  created_at: string;
  expires_at: string | null;
  owner_name: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export default function SharePreview() {
  const theme = useTheme();
  const { t } = useTranslation();
  const notify = useNotify();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const token = params.token || searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<PublicShareInfo | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('shares.invalid_link'));
      setLoading(false);
      return;
    }

    const fetchInfo = async () => {
      try {
        const response = await api.get(`/public/share/${token}`);
        setInfo(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || t('shares.fetch_error'));
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [token, t]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    notify.success(t('common.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!token || !info) return;

    setDownloading(true);
    setDownloadProgress(0);

    try {
      let response;
      if (info.has_password) {
        response = await api.post(
          `/public/share/${token}/verify`,
          { password },
          {
            responseType: 'blob',
            onDownloadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setDownloadProgress(progress);
              }
            },
          }
        );
      } else {
        response = await api.get(`/public/share/${token}/download`, {
          responseType: 'blob',
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setDownloadProgress(progress);
            }
          },
        });
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', info.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify.success(t('shares.download_started'));
    } catch (err: any) {
      let errorMessage = t('shares.download_error');

      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch {
          errorMessage = err.response.statusText || errorMessage;
        }
      } else {
        errorMessage = err.response?.data?.message || errorMessage;
      }

      notify.error(errorMessage);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={48} />
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {t('common.loading')}
        </Typography>
      </Box>
    );
  }

  if (error || !info) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'transparent' }}>
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CloudIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                CloudRaver
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>
        <Container maxWidth="sm" sx={{ mt: 8 }}>
          <Card
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {t('shares.link_unavailable')}
            </Typography>
            <Typography color="text.secondary">
              {error || t('shares.invalid_link')}
            </Typography>
          </Card>
        </Container>
      </Box>
    );
  }

  const expired = isExpired(info.expires_at);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'transparent' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloudIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              CloudRaver
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={copied ? <CheckIcon /> : <CopyIcon />}
            onClick={handleCopyLink}
            sx={{ textTransform: 'none' }}
          >
            {copied ? t('common.copied') : t('common.copy_link')}
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Container maxWidth="sm">
          <Card
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
            }}
          >
            {/* File Preview Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 3 }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {getFileIcon(info.file_name, info.mime_type, { sx: { fontSize: 36 } })}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{
                    wordBreak: 'break-word',
                    mb: 0.5,
                  }}
                >
                  {info.file_name}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  <Chip
                    icon={<StorageIcon />}
                    label={formatFileSize(info.file_size)}
                    size="small"
                    variant="outlined"
                  />
                  {info.has_password && (
                    <Chip
                      icon={<LockIcon />}
                      label={t('shares.protected')}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                  {expired && (
                    <Chip
                      icon={<ErrorIcon />}
                      label={t('shares.expired')}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Share Info */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PersonIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {t('shares.shared_by')}:
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {info.owner_name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CalendarIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {t('shares.created_at')}:
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {formatDate(info.created_at)}
                </Typography>
              </Box>
              {info.expires_at && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ScheduleIcon sx={{ fontSize: 20, color: expired ? 'error.main' : 'text.secondary' }} />
                  <Typography variant="body2" color={expired ? 'error.main' : 'text.secondary'}>
                    {t('shares.expires_at')}:
                  </Typography>
                  <Typography variant="body2" fontWeight={500} color={expired ? 'error.main' : 'text.primary'}>
                    {formatDate(info.expires_at)}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Password Input */}
            {info.has_password && !expired && (
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                placeholder={t('shares.enter_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 },
                }}
              />
            )}

            {/* Download Progress */}
            {downloading && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('common.downloading')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {downloadProgress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={downloadProgress}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}

            {/* Download Button */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleDownload}
              disabled={downloading || expired || (info.has_password && !password)}
              startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
              sx={{
                py: 1.5,
                borderRadius: 3,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none',
                },
              }}
            >
              {downloading ? `${t('common.downloading')} ${downloadProgress}%` : t('common.download')}
            </Button>

            {expired && (
              <Typography
                variant="body2"
                color="error"
                sx={{ mt: 2, textAlign: 'center' }}
              >
                {t('shares.link_expired_message')}
              </Typography>
            )}
          </Card>

          {/* Footer */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 3 }}
          >
            {t('shares.powered_by')} CloudRaver
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
