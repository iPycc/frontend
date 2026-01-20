import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  alpha,
  useTheme,
  Chip,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Computer as LocalIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import { useStorageStore } from '../../stores/storage';

export default function StorageTab() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { policies, fetchPolicies } = useStorageStore();

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getStorageIcon = (type: string) => {
    return type === 'local' ? LocalIcon : CloudIcon;
  };

  const getStorageColor = (type: string) => {
    switch (type) {
      case 'local':
        return '#6366f1';
      case 'cos':
        return '#00a4ff';
      case 's3':
        return '#ff9900';
      case 'oss':
        return '#ff6a00';
      default:
        return theme.palette.primary.main;
    }
  };

  // Mock storage usage data - in real app, fetch from API
  const getStorageUsage = () => {
    // Simulate different usage for different policies
    const mockUsage = {
      used: Math.floor(Math.random() * 50 * 1024 * 1024 * 1024), // Random GB
      limit: null as number | null, // null means unlimited
    };

    // Randomly assign some policies a limit
    if (Math.random() > 0.5) {
      mockUsage.limit = 100 * 1024 * 1024 * 1024; // 100 GB
    }

    return mockUsage;
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {t('settings.tabs.storage')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {t('settings.storage_buckets.subtitle')}
      </Typography>

      {policies.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <StorageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {t('settings.storage_buckets.no_buckets')}
            </Typography>
            <Typography color="text.secondary">
              {t('settings.storage_buckets.no_buckets_desc')}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {policies.map((policy) => {
            const Icon = getStorageIcon(policy.policy_type);
            const color = getStorageColor(policy.policy_type);
            const usage = getStorageUsage();
            const hasLimit = usage.limit !== null;
            const percentage = hasLimit ? (usage.used / usage.limit!) * 100 : 0;

            return (
              <Grid item xs={12} md={6} key={policy.id}>
                <Card
                  sx={{
                    height: '100%',
                    border: policy.is_default ? `2px solid ${theme.palette.primary.main}` : undefined,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: alpha(color, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon sx={{ color }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="h6" fontWeight={600} noWrap>
                            {policy.name}
                          </Typography>
                          {policy.is_default && (
                            <Chip label={t('storage.default')} size="small" color="primary" />
                          )}
                        </Box>
                        <Chip
                          label={policy.policy_type.toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: alpha(color, 0.1),
                            color,
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Storage Usage */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('settings.used')}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {hasLimit ? (
                            <>
                              {formatBytes(usage.used)} / {formatBytes(usage.limit!)}
                            </>
                          ) : (
                            <>
                              {formatBytes(usage.used)} {t('settings.used')}
                            </>
                          )}
                        </Typography>
                      </Box>

                      {hasLimit ? (
                        <>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(percentage, 100)}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: alpha(color, 0.1),
                              '& .MuiLinearProgress-bar': {
                                bgcolor: percentage > 90 ? theme.palette.error.main : color,
                                borderRadius: 4,
                              },
                            }}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {percentage.toFixed(1)}% used
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatBytes(usage.limit! - usage.used)} {t('settings.storage_buckets.remaining')}
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <Box
                          sx={{
                            py: 2,
                            px: 2,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            textAlign: 'center',
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ color: theme.palette.success.main }}
                          >
                            {t('settings.unlimited')}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Storage Details */}
                    <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Configuration
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {policy.policy_type === 'cos' ? (
                          <>
                            Bucket: {(policy.config as any).bucket}
                            <br />
                            Region: {(policy.config as any).region}
                          </>
                        ) : (
                          <>Path: {(policy.config as any).base_path || 'data/uploads'}</>
                        )}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
