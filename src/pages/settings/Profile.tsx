import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  TextField,
  Grid,
  useTheme,
  Avatar,
  IconButton,
  alpha,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CameraAlt as CameraAltIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../api/client';
import { useNotify } from '../../contexts/NotificationContext';

export default function Profile() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const notify = useNotify();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Nickname Editing State
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(user?.name || '');
  const [savingNickname, setSavingNickname] = useState(false);

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

  const handleCopyUid = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      notify.success(t('common.copied'));
    }
  };

  const handleUpdateNickname = async () => {
    setSavingNickname(true);
    try {
      const response = await api.put('/user/profile', { name: nickname });
      useAuthStore.setState((state) => ({ ...state, user: response.data.data }));
      notify.success(t('settings.profile.nickname_updated'));
      setIsEditingNickname(false);
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('settings.profile.nickname_update_failed'));
    } finally {
      setSavingNickname(false);
    }
  };

  const ReadOnlyField = ({ label, value, monospace = false, copyable = false }: { label: string, value: string, monospace?: boolean, copyable?: boolean }) => (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600, display: 'block' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 32 }}>
        <Typography 
          variant="body1" 
          sx={{ 
            fontFamily: monospace ? 'monospace' : 'inherit',
            color: theme.palette.text.primary,
            fontWeight: 500,
            wordBreak: 'break-all'
          }}
        >
          {value}
        </Typography>
        {copyable && (
          <IconButton onClick={handleCopyUid} size="small" sx={{ ml: 1, color: theme.palette.text.secondary }}>
            {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>
      <Box sx={{ height: 1, bgcolor: theme.palette.divider, mt: 0.5 }} />
    </Box>
  );

  // Reusable Avatar Component
  const UserAvatar = ({ size = 140, compact = false }: { size?: number, compact?: boolean }) => (
    <Box
      component="label"
      sx={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 3,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${theme.palette.divider}`,
        flexShrink: 0,
        display: 'block',
        '&:hover .avatar-overlay': { opacity: 1 }
      }}
    >
      <Avatar
        src={user?.avatar_url || undefined}
        variant="rounded"
        sx={{
          width: '100%',
          height: '100%',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          fontSize: compact ? '2rem' : '3rem',
          fontWeight: 700,
        }}
      >
        {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
      </Avatar>
      
      {/* Overlay with Camera Icon */}
      <Box 
        className="avatar-overlay"
        sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          bgcolor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.2s',
        }}
      >
        <CameraAltIcon sx={{ color: 'white' }} />
      </Box>

      <input
        type="file"
        hidden
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
        disabled={avatarUploading}
      />
    </Box>
  );

  // Nickname Edit Component
  const NicknameEditor = () => (
    <Box>
      {isMobile ? null : (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600, display: 'block' }}>
          {t('settings.profile.nickname')}
        </Typography>
      )}
      
      {isEditingNickname ? (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            size="small"
            autoFocus
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <IconButton 
            color="primary" 
            onClick={handleUpdateNickname}
            disabled={savingNickname || !nickname.trim()}
          >
            <SaveIcon />
          </IconButton>
          <IconButton 
            color="error" 
            onClick={() => {
              setNickname(user?.name || '');
              setIsEditingNickname(false);
            }}
          >
            <CancelIcon />
          </IconButton>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: isMobile ? 'auto' : 40 }}>
            <Typography variant="h6" fontWeight={700}>
            {user?.name || t('settings.profile.not_set')}
          </Typography>
          <IconButton size="small" onClick={() => setIsEditingNickname(true)} sx={{ opacity: 0.7 }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      {!isEditingNickname && !isMobile && (
        <Box sx={{ height: 1, bgcolor: theme.palette.divider, mt: 0.5 }} />
      )}
      {!isMobile && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
          {t('settings.profile.nickname_helper')}
        </Typography>
      )}
    </Box>
  );

  // MOBILE LAYOUT
  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Header Section: Avatar + Name + Email */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <UserAvatar size={80} compact />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <NicknameEditor />
            <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
              {user?.email}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
              {user?.role === 'admin' ? 'Admin' : 'Member'}
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* Details Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <ReadOnlyField label={t('settings.profile.uid')} value={user?.id || ''} monospace copyable />
          <ReadOnlyField label={t('settings.profile.registered_at')} value={user?.created_at ? new Date(user.created_at).toLocaleString() : '-'} />
        </Box>
      </Box>
    );
  }

  // DESKTOP LAYOUT (Original)
  return (
    <Grid container spacing={4}>
      {/* Left Column: Form Fields */}
      <Grid item xs={12} md={7}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Email */}
          <ReadOnlyField label={t('settings.profile.email')} value={user?.email || ''} />

          {/* Nickname (Editable) */}
          <NicknameEditor />

          {/* UID */}
          <ReadOnlyField label={t('settings.profile.uid')} value={user?.id || ''} monospace copyable />

          {/* Reg Time */}
          <ReadOnlyField label={t('settings.profile.registered_at')} value={user?.created_at ? new Date(user.created_at).toLocaleString() : '-'} />

          {/* Role */}
          <ReadOnlyField label={t('settings.profile.role')} value={user?.role === 'admin' ? 'Admin' : 'Member'} />
        </Box>
      </Grid>

      {/* Right Column: Avatar */}
      <Grid item xs={12} md={5}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', pl: { md: 4 } }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, fontWeight: 600, display: 'block' }}>
            {t('settings.profile.avatar')}
          </Typography>
          
          <UserAvatar />
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
             {t('settings.upload_avatar')}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
}
