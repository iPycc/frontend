import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  LinearProgress,
  Stack,
  Collapse,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  KeyboardArrowDown as MinimizeIcon,
  KeyboardArrowUp as MaximizeIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  InsertDriveFile as FileIcon,
  Clear as CancelIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useFilesStore, UploadItem } from '../stores/files';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '--';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export default function UploadQueue() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { uploads, removeUpload, clearCompletedUploads } = useFilesStore();
  const [minimized, setMinimized] = useState(false);

  if (uploads.length === 0) return null;

  const uploadingCount = uploads.filter(u => u.status === 'uploading' || u.status === 'pending').length;
  const completedCount = uploads.filter(u => u.status === 'completed').length;
  // const errorCount = uploads.filter(u => u.status === 'error').length;

  const handleClose = () => {
    // If uploads are in progress, maybe warn? For now just hide or clear completed?
    // If we close, we probably want to clear completed ones and hide if no active ones.
    // But if active ones exist, we shouldn't "close" the upload, just the window.
    // Let's assume "Close" button minimizes or hides until new upload?
    // Or maybe it clears the list?
    // Reference image shows an "X".
    // Let's implement: Clear completed, and if no active, hide. If active, minimize.
    clearCompletedUploads();
    if (uploads.some(u => u.status === 'uploading')) {
        setMinimized(true);
    }
  };

  const renderItem = (item: UploadItem) => {
    const isCompleted = item.status === 'completed';
    const isError = item.status === 'error';
    
    return (
      <Box
        key={item.id}
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          '&:last-child': { borderBottom: 'none' },
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        }}
      >
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isError ? theme.palette.error.main : (isCompleted ? theme.palette.success.main : theme.palette.primary.main),
              }}
            >
              {isError ? <ErrorIcon fontSize="small" /> : (isCompleted ? <SuccessIcon fontSize="small" /> : <FileIcon fontSize="small" />)}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap fontWeight={500}>
                {item.file.name}
              </Typography>
              {isCompleted ? (
                <Typography variant="caption" color="success.main" fontWeight={500}>
                  {t('common.completed') || 'Completed'}
                </Typography>
              ) : isError ? (
                <Typography variant="caption" color="error.main" fontWeight={500}>
                  {item.error || t('common.error') || 'Error'}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                   {item.message && <span>{item.message} •</span>}
                   <span>{formatBytes(item.speed)}/s</span>
                   <span>•</span>
                   <span>{formatBytes(item.loaded)} / {formatBytes(item.total)}</span>
                   <span>•</span>
                   <span>{formatDuration(item.eta)}</span>
                </Typography>
              )}
            </Box>
            <IconButton 
                size="small" 
                onClick={() => removeUpload(item.id)}
                sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
            >
                <CancelIcon fontSize="small" />
            </IconButton>
          </Box>
          
          {!isCompleted && !isError && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <LinearProgress 
                    variant="determinate" 
                    value={item.progress} 
                    sx={{ 
                        flex: 1, 
                        height: 4, 
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                    }} 
                />
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35, textAlign: 'right' }}>
                    {item.progress}%
                </Typography>
            </Box>
          )}
        </Stack>
      </Box>
    );
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 400,
        maxWidth: 'calc(100vw - 48px)',
        zIndex: 2000, // Above dialogs usually
        overflow: 'hidden',
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          pl: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
          borderBottom: minimized ? 'none' : `1px solid ${theme.palette.divider}`,
          cursor: 'pointer',
        }}
        onClick={() => setMinimized(!minimized)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>
            {t('files.upload_queue')}
            </Typography>
            <Box 
                sx={{ 
                    px: 0.8, 
                    py: 0.2, 
                    bgcolor: alpha(theme.palette.primary.main, 0.1), 
                    borderRadius: 1,
                    color: theme.palette.primary.main,
                    fontSize: '0.75rem',
                    fontWeight: 600
                }}
            >
                {uploadingCount > 0
                  ? t('files.uploading_count', { count: uploadingCount })
                  : t('files.completed_count', { count: completedCount })}
            </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}>
            {minimized ? <MaximizeIcon fontSize="small" /> : <MinimizeIcon fontSize="small" />}
          </IconButton>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleClose(); }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* List */}
      <Collapse in={!minimized}>
        <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
          {uploads.slice().reverse().map(renderItem)}
        </Box>
      </Collapse>
    </Paper>
  );
}
