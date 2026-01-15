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
  Alert,
  AppBar,
  Toolbar,
  useTheme,
  alpha,
  Card,
} from '@mui/material';
import {
  Lock as LockIcon,
  Download as DownloadIcon,
  InsertDriveFile as FileIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import { api } from '../api/client';

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

export default function SharePreview() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const token = params.token || searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<PublicShareInfo | null>(null);
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);

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

  const handleDownload = async () => {
    if (!token || !info) return;

    setDownloading(true);
    try {
      if (info.has_password) {
        // Verify password and get download response (which might be redirect or blob)
        const response = await api.post(
          `/public/share/${token}/verify`, 
          { password },
          { responseType: 'blob' }
        );
        
        // Handle blob download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', info.file_name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // Direct download
        const response = await api.get(
            `/public/share/${token}/download`,
            { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', info.file_name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      let errorMessage = 'Unknown error';
      
      // If response is a Blob, we need to read it to get the error message
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch {
          // Failed to parse blob as JSON, stick with default or status text
          errorMessage = err.response.statusText || errorMessage;
        }
      } else {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      
      alert(t('shares.download_error') + ': ' + errorMessage);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!info) return null;

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
                bgcolor: 'primary.main',
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

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Container maxWidth="xs">
          <Card
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              textAlign: 'center',
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 3,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileIcon sx={{ fontSize: 40 }} />
            </Box>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {info.owner_name} {t('common.share')}
            </Typography>

            <Typography 
              variant="h5" 
              component="h1"
              fontWeight={800} 
              gutterBottom 
              sx={{ 
                mb: 1, 
                wordBreak: 'break-all',
              }}
            >
              {info.file_name}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {formatFileSize(info.file_size)}
            </Typography>

            {info.has_password && (
              <TextField
                fullWidth
                type="password"
                placeholder={t('shares.password_required')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: <LockIcon fontSize="small" color="action" sx={{ mr: 1 }} />,
                  sx: { borderRadius: 2 }
                }}
              />
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleDownload}
              disabled={downloading || (info.has_password && !password)}
              startIcon={<DownloadIcon />}
              sx={{ 
                py: 1.5,
                borderRadius: 3,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none',
                }
              }}
            >
              {downloading ? t('common.downloading') : t('common.download')}
            </Button>
          </Card>
        </Container>
      </Box>
    </Box>
  );
}
