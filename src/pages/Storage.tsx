import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useStorageStore, StoragePolicy } from '../stores/storage';

interface PolicyFormData {
  name: string;
  policy_type: string;
  config: {
    base_path?: string;
    secret_id?: string;
    secret_key?: string;
    bucket?: string;
    region?: string;
  };
}

const initialFormData: PolicyFormData = {
  name: '',
  policy_type: 'local',
  config: {
    base_path: 'data/uploads',
  },
};

export default function Storage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { policies, loading, fetchPolicies, createPolicy, deletePolicy, setDefaultPolicy, configureCors, validatePolicy } = useStorageStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<PolicyFormData>(initialFormData);
  const [formError, setFormError] = useState('');
  const [submitAction, setSubmitAction] = useState<'create' | 'configure' | null>(null);
  const [configuringCorsId, setConfiguringCorsId] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const buildCreatePayload = () => ({
    name: formData.name.trim(),
    policy_type: formData.policy_type,
    config: formData.config,
  });

  const validateForm = () => {
    if (!formData.name.trim()) return t('storage.errors.name_required');

    if (formData.policy_type === 'cos') {
      const { secret_id, secret_key, bucket, region } = formData.config;
      if (!secret_id || !secret_key || !bucket || !region) {
        return t('storage.errors.cos_fields_required');
      }
    }

    return '';
  };

  const handleOpenDialog = () => {
    setFormData(initialFormData);
    setFormError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData(initialFormData);
    setFormError('');
  };

  const handleTypeChange = (type: string) => {
    setFormData({
      ...formData,
      policy_type: type,
      config: type === 'local' 
        ? { base_path: 'data/uploads' }
        : { secret_id: '', secret_key: '', bucket: '', region: 'ap-guangzhou' },
    });
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    try {
      setSubmitAction('create');
      const payload = buildCreatePayload();
      await validatePolicy(payload);
      await createPolicy(payload);
      handleCloseDialog();
    } catch (error: any) {
      setFormError(error.response?.data?.message || t('storage.errors.create_failed'));
    } finally {
      setSubmitAction(null);
    }
  };

  const handleCreateAndConfigureCors = async () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    try {
      setSubmitAction('configure');
      const payload = buildCreatePayload();
      await validatePolicy(payload);
      const newPolicy = await createPolicy(payload);
      await configureCors(newPolicy.id);
      handleCloseDialog();
      alert(t('storage.cors_configured'));
    } catch (error: any) {
      setFormError(error.response?.data?.message || t('storage.errors.configure_cors_failed'));
    } finally {
      setSubmitAction(null);
    }
  };

  const handleConfigureCors = async (policy: StoragePolicy) => {
    setConfiguringCorsId(policy.id);
    try {
      await configureCors(policy.id);
      alert(t('storage.cors_configured'));
    } catch (error: any) {
      alert(error.response?.data?.message || t('storage.errors.configure_cors_failed'));
    } finally {
      setConfiguringCorsId(null);
    }
  };

  const handleDelete = async (policy: StoragePolicy) => {
    if (confirm(t('storage.delete_confirm', { name: policy.name }))) {
      try {
        await deletePolicy(policy.id);
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to delete policy');
      }
    }
  };

  const handleSetDefault = async (policy: StoragePolicy) => {
    try {
      await setDefaultPolicy(policy.id);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to set default policy');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {t('storage.title')}
          </Typography>
          <Typography color="text.secondary">
            {t('storage.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          {t('storage.add_storage')}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {policies.map((policy) => (
          <Grid item xs={12} sm={6} md={4} key={policy.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: policy.is_default
                  ? `2px solid ${theme.palette.primary.main}`
                  : undefined,
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      backgroundColor: alpha(
                        policy.policy_type === 'cos'
                          ? theme.palette.secondary.main
                          : theme.palette.primary.main,
                        0.15
                      ),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {policy.policy_type === 'cos' ? (
                      <CloudIcon color="secondary" />
                    ) : (
                      <StorageIcon color="primary" />
                    )}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={600}>
                      {policy.name}
                    </Typography>
                    <Chip
                      label={policy.policy_type.toUpperCase()}
                      size="small"
                      color={policy.policy_type === 'cos' ? 'secondary' : 'primary'}
                      variant="outlined"
                    />
                  </Box>
                  {policy.is_default && (
                    <Chip
                      icon={<StarIcon />}
                      label="Default"
                      size="small"
                      color="primary"
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {policy.policy_type === 'cos'
                    ? `Bucket: ${(policy.config as any).bucket}`
                    : `Path: ${(policy.config as any).base_path || 'data/uploads'}`}
                </Typography>
              </CardContent>
              <CardActions>
                {policy.policy_type === 'cos' && (
                  <IconButton
                    size="small"
                    onClick={() => handleConfigureCors(policy)}
                    title="Configure CORS"
                    disabled={configuringCorsId === policy.id}
                  >
                    <SettingsIcon />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => handleSetDefault(policy)}
                  disabled={policy.is_default}
                  title="Set as default"
                >
                  {policy.is_default ? <StarIcon color="primary" /> : <StarBorderIcon />}
                </IconButton>
                <Box sx={{ flex: 1 }} />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(policy)}
                  title="Delete"
                  disabled={policy.name === 'Default Local Storage'}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
        {policies.length === 0 && !loading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <StorageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('storage.no_policies')}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {t('storage.no_policies_desc')}
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
                {t('storage.add_storage')}
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Add Policy Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('storage.add_dialog_title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('storage.policy_name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!formError && !formData.name}
              disabled={submitAction !== null}
            />
            <FormControl fullWidth>
              <InputLabel>{t('storage.policy_type')}</InputLabel>
              <Select
                value={formData.policy_type}
                label={t('storage.policy_type')}
                onChange={(e) => handleTypeChange(e.target.value)}
                disabled={submitAction !== null}
              >
                <MenuItem value="local">Local Storage</MenuItem>
                <MenuItem value="cos">Tencent COS</MenuItem>
              </Select>
            </FormControl>

            {formData.policy_type === 'local' ? (
              <TextField
                fullWidth
                label={t('storage.base_path')}
                value={formData.config.base_path || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, base_path: e.target.value },
                  })
                }
                helperText="Directory path for file storage"
                disabled={submitAction !== null}
              />
            ) : (
              <>
                <TextField
                  fullWidth
                  label={t('storage.secret_id')}
                  value={formData.config.secret_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, secret_id: e.target.value },
                    })
                  }
                  disabled={submitAction !== null}
                />
                <TextField
                  fullWidth
                  label={t('storage.secret_key')}
                  type="password"
                  value={formData.config.secret_key || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, secret_key: e.target.value },
                    })
                  }
                  disabled={submitAction !== null}
                />
                <TextField
                  fullWidth
                  label={t('storage.bucket')}
                  value={formData.config.bucket || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, bucket: e.target.value },
                    })
                  }
                  helperText="e.g., mybucket-1250000000"
                  disabled={submitAction !== null}
                />
                <FormControl fullWidth>
                  <InputLabel>{t('storage.region')}</InputLabel>
                  <Select
                    value={formData.config.region || 'ap-guangzhou'}
                    label={t('storage.region')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, region: e.target.value },
                      })
                    }
                    disabled={submitAction !== null}
                  >
                    <MenuItem value="ap-beijing">Beijing (ap-beijing)</MenuItem>
                    <MenuItem value="ap-shanghai">Shanghai (ap-shanghai)</MenuItem>
                    <MenuItem value="ap-guangzhou">Guangzhou (ap-guangzhou)</MenuItem>
                    <MenuItem value="ap-chengdu">Chengdu (ap-chengdu)</MenuItem>
                    <MenuItem value="ap-chongqing">Chongqing (ap-chongqing)</MenuItem>
                    <MenuItem value="ap-hongkong">Hong Kong (ap-hongkong)</MenuItem>
                    <MenuItem value="ap-singapore">Singapore (ap-singapore)</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

            {formError && (
              <Typography color="error" variant="body2">
                {formError}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitAction !== null}>
            {t('common.cancel')}
          </Button>
          {formData.policy_type === 'cos' && (
            <Button
              variant="outlined"
              onClick={handleCreateAndConfigureCors}
              disabled={submitAction !== null}
            >
              {submitAction === 'configure' ? t('storage.configuring_cors') : t('storage.configure_cors')}
            </Button>
          )}
          <Button variant="contained" onClick={handleSubmit} disabled={submitAction !== null}>
            {submitAction === 'create' ? t('storage.creating') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

