import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  TextField,
  Avatar,
  Stack,
  Divider,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/auth';
import { useNotify } from '../../contexts/NotificationContext';
import { api } from '../../api/client';

export default function ProfileTab() {
  const { t } = useTranslation();
  const theme = useTheme();
  const notify = useNotify();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notify.error(t('settings.profile.avatar_invalid_type'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notify.error(t('settings.profile.avatar_too_large'));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      await api.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      notify.success(t('settings.avatar_updated'));
      // Refresh user data
      window.location.reload();
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('settings.avatar_update_failed'));
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleDisplay = (role: string) => {
    return role === 'admin' ? 'Administrator' : 'User';
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {t('settings.tabs.profile')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {t('settings.profile_subtitle')}
      </Typography>

      <Stack spacing={4}>
        {/* Avatar Section */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('settings.profile.avatar')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 2 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={user.avatar_url || undefined}
                sx={{
                  width: 100,
                  height: 100,
                  fontSize: 40,
                  bgcolor: theme.palette.primary.main,
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </Avatar>
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  bgcolor: theme.palette.background.paper,
                  border: `2px solid ${theme.palette.divider}`,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
                size="small"
                onClick={handleAvatarClick}
                disabled={uploading}
              >
                <PhotoCameraIcon fontSize="small" />
              </IconButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('settings.profile.upload_avatar')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                JPG, PNG or GIF. Max size 5MB
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Email */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('settings.profile.email')}
          </Typography>
          <TextField
            fullWidth
            value={user.email}
            disabled
            sx={{ mt: 1 }}
          />
        </Box>

        {/* UID */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('settings.profile.uid')}
          </Typography>
          <TextField
            fullWidth
            value={user.id}
            disabled
            sx={{ mt: 1 }}
          />
        </Box>

        {/* Nickname */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('settings.profile.nickname')}
          </Typography>
          <TextField
            fullWidth
            value={user.name}
            disabled
            helperText={t('settings.profile.nickname_helper')}
            sx={{ mt: 1 }}
            InputProps={{
              endAdornment: (
                <IconButton size="small" disabled>
                  <EditIcon fontSize="small" />
                </IconButton>
              ),
            }}
          />
        </Box>

        {/* User Group */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('settings.profile.role')}
          </Typography>
          <TextField
            fullWidth
            value={getRoleDisplay(user.role)}
            disabled
            sx={{ mt: 1 }}
          />
        </Box>

        {/* Registration Date */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('settings.profile.registered_at')}
          </Typography>
          <TextField
            fullWidth
            value={formatDate(user.created_at)}
            disabled
            sx={{ mt: 1 }}
          />
        </Box>
      </Stack>
    </Box>
  );
}
