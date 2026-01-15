import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Skeleton,
  Paper,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useShareStore } from '../stores/share';
import { useNotify } from '../contexts/NotificationContext';

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleString();
}

export default function Shares() {
  const { t } = useTranslation();
  const notify = useNotify();
  const { shares, loading, fetchShares, deleteShare } = useShareStore();

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    notify.success(t('common.copy_link'));
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('common.delete_confirm'))) {
      await deleteShare(id);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        {t('shares.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {t('shares.subtitle')}
      </Typography>

      <Grid container spacing={3}>
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
                  <Skeleton variant="rectangular" height={24} width={80} sx={{ mb: 2 }} />
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : shares.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 8, textAlign: 'center' }} variant="outlined">
              <Typography color="text.secondary">{t('shares.no_shares')}</Typography>
            </Paper>
          </Grid>
        ) : (
          shares.map((share) => (
            <Grid item xs={12} sm={6} md={4} key={share.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  '&:hover .share-actions': {
                    opacity: 1,
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <LinkIcon color="primary" sx={{ fontSize: 28, mt: 0.5 }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="h6"
                        fontWeight={600}
                        noWrap
                        title={share.file_name || share.token}
                        sx={{ mb: 0.5 }}
                      >
                        {share.file_name || share.token}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <VisibilityIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {share.views} {share.max_views ? `/ ${share.max_views}` : ''}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {share.expires_at ? formatDate(share.expires_at) : 'Never'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'flex-end', p: 1.5, pt: 0 }}>
                  <Tooltip title={t('common.copy_link')}>
                    <IconButton onClick={() => handleCopyLink(share.token)} size="small">
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete')}>
                    <IconButton onClick={() => handleDelete(share.id)} size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}
