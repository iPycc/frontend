import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  useTheme,
  Chip,
  alpha,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Computer as ComputerIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useStorageStore, StoragePolicy } from '../../stores/storage';
import { api } from '../../api/client';
import { useNotify } from '../../contexts/NotificationContext';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface StorageUsage {
  used: number;
  limit: number;
  percentage: number;
}

export default function Storage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const notify = useNotify();
  const { policies, fetchPolicies, updatePolicy } = useStorageStore();
  const [usages, setUsages] = useState<Record<string, StorageUsage>>({});
  
  // Edit Dialog State
  const [editOpen, setEditOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<StoragePolicy | null>(null);
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState(''); // Store as string (GB)
  const [editConfig, setEditConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    policies.forEach(async (policy) => {
      try {
        const response = await api.get('/user/storage', {
          params: { policy_id: policy.id },
        });
        setUsages((prev) => ({ ...prev, [policy.id]: response.data.data }));
      } catch (error) {
        // console.error(`Failed to fetch usage for policy ${policy.id}`, error);
      }
    });
  }, [policies]);

  const handleEditClick = (policy: StoragePolicy) => {
    setEditingPolicy(policy);
    setEditName(policy.name);
    
    // Parse capacity from config (bytes -> GB for display)
    const cap = policy.config?.capacity as number;
    setEditCapacity(cap ? (cap / 1024 / 1024 / 1024).toString() : '');
    
    setEditConfig(policy.config || {});
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPolicy) return;
    setSaving(true);
    try {
      // Convert capacity GB -> bytes
      const capacityBytes = editCapacity ? parseFloat(editCapacity) * 1024 * 1024 * 1024 : null;
      
      const newConfig = { ...editConfig };
      if (capacityBytes) {
        newConfig.capacity = capacityBytes;
      } else {
        delete newConfig.capacity;
      }

      await updatePolicy(editingPolicy.id, {
        name: editName,
        config: newConfig,
      });
      notify.success(t('storage.update_success'));
      setEditOpen(false);
      fetchPolicies(); // Refresh
    } catch (error) {
      notify.error(t('storage.update_error'));
    } finally {
      setSaving(false);
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'local':
        return <ComputerIcon color="primary" fontSize="medium" />;
      case 'cos':
      case 's3':
      case 'oss':
        return <CloudIcon color="secondary" fontSize="medium" />;
      default:
        return <StorageIcon color="action" fontSize="medium" />;
    }
  };

  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {policies.map((policy) => {
        const usage = usages[policy.id];
        // Check if policy has a specific limit in its config, otherwise it might be global user limit
        // But here we rely on what the backend returns in `usage.limit`.
        // Backend logic: limit = policy.capacity || user.storage_limit.
        // If user.storage_limit is -1 (unlimited) and policy.capacity is null, limit is -1.
        
        const limit = usage?.limit || 0;
        const used = usage?.used || 0;
        const isUnlimited = limit <= 0;
        const remaining = Math.max(0, limit - used);

        return (
          <Grid item xs={12} md={6} lg={4} key={policy.id}>
            <Card 
              variant="outlined"
              sx={{ 
                borderRadius: 3, 
                bgcolor: 'transparent',
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {getProviderIcon(policy.policy_type)}
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>{policy.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                        {policy.policy_type}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {policy.is_default && (
                      <Chip label={t('storage.default')} color="primary" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                    )}
                    <IconButton size="small" onClick={() => handleEditClick(policy)}>
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('settings.used')}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatBytes(used)}
                    </Typography>
                  </Box>
                  
                  {!isUnlimited && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('settings.remaining')}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatBytes(remaining)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('settings.total_capacity')}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatBytes(limit)}
                        </Typography>
                      </Box>
                    </>
                  )}
                  
                  {isUnlimited && (
                     <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('settings.status')}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          {t('settings.unlimited')}
                        </Typography>
                     </Box>
                  )}
                </Box>

                {!isUnlimited && (
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((used / limit) * 100, 100)}
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
      
      {policies.length === 0 && (
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary">{t('storage.no_policies')}</Typography>
          </Box>
        </Grid>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('storage.edit_policy')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={t('storage.policy_name')}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('storage.capacity')}
              value={editCapacity}
              onChange={(e) => setEditCapacity(e.target.value)}
              fullWidth
              size="small"
              type="number"
              helperText={t('storage.capacity_helper')}
              InputProps={{
                endAdornment: <Typography variant="caption">GB</Typography>
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
