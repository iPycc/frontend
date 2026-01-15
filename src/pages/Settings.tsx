import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  alpha,
  useTheme,
  Avatar,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/auth';
import { useStorageStore } from '../stores/storage';
import { api } from '../api/client';
import { useNotify } from '../contexts/NotificationContext';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Settings() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { selectedPolicyId } = useStorageStore();
  const notify = useNotify();
  const [storageUsage, setStorageUsage] = useState<{ used: number; limit: number; percentage: number } | null>(null);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    fetchStorageUsage();
  }, [selectedPolicyId]);

  const fetchStorageUsage = async () => {
    try {
      const response = await api.get('/user/storage', {
        params: selectedPolicyId ? { policy_id: selectedPolicyId } : undefined,
      });
      setStorageUsage(response.data.data);
    } catch (error) {
      console.error('Failed to fetch storage usage:', error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await api.put('/user/password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordSuccess('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await api.post('/user/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      useAuthStore.setState((state) => ({ ...state, user: response.data.data }));
      notify.success(t('settings.avatar_updated'));
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('settings.avatar_update_failed'));
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        {t('settings.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {t('settings.subtitle')}
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  component="label"
                  sx={{
                    position: 'relative',
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    '&:hover .overlay': {
                      opacity: 1,
                    },
                  }}
                >
                  <Avatar
                    src={user?.avatar_url || undefined}
                    sx={{
                      width: '100%',
                      height: '100%',
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      color: theme.palette.primary.main,
                      fontWeight: 800,
                      fontSize: '1.5rem',
                    }}
                  >
                    {user?.name ? user.name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'U')}
                  </Avatar>
                  <Box
                    className="overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {avatarUploading ? (
                      <Typography variant="caption" sx={{ color: 'white' }}>...</Typography>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'white', fontSize: '0.7rem' }}>Upload</Typography>
                    )}
                  </Box>
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                      e.currentTarget.value = '';
                    }}
                    disabled={avatarUploading}
                  />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {t('settings.profile')}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {t('settings.profile_subtitle')}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('common.email')}
                  </Typography>
                  <Typography>{user?.email}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('common.role')}
                  </Typography>
                  <Typography sx={{ textTransform: 'capitalize' }}>{user?.role}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('settings.member_since')}
                  </Typography>
                  <Typography>
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Storage Usage Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.secondary.main, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <StorageIcon color="secondary" />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {t('settings.storage_usage')}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {t('settings.storage_subtitle')}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {storageUsage ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {formatBytes(storageUsage.used)} {t('settings.used')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {storageUsage.limit < 0 ? t('settings.unlimited') : formatBytes(storageUsage.limit)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={storageUsage.limit < 0 ? 0 : storageUsage.percentage}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    }}
                  />
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    sx={{ mt: 2, color: theme.palette.primary.main }}
                  >
                    {storageUsage.limit < 0 ? '∞' : `${storageUsage.percentage}%`}
                  </Typography>
                </Box>
              ) : (
                <Typography color="text.secondary">Loading...</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Change Password Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.warning.main, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LockIcon sx={{ color: theme.palette.warning.main }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {t('settings.change_password')}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {t('settings.change_password_subtitle')}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 3 }} />

              {passwordError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {passwordError}
                </Alert>
              )}
              {passwordSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {passwordSuccess}
                </Alert>
              )}

              <form onSubmit={handleChangePassword}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label={t('settings.current_password')}
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label={t('settings.new_password')}
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label={t('settings.confirm_new_password')}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                    >
                      {loading ? t('common.loading') : t('settings.change_password')}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
