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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  alpha,
  useTheme,
  Stepper,
  Step,
  StepLabel,
  Collapse,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon,
  Computer as LocalIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useStorageStore, StoragePolicy } from '../stores/storage';
import { useNotify } from '../contexts/NotificationContext';

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

// Cloud provider definitions
const cloudProviders = [
  {
    id: 'local',
    name: 'Local Storage',
    nameZh: '本地存储',
    description: 'Store files on your server',
    descriptionZh: '将文件存储在您的服务器上',
    icon: LocalIcon,
    color: '#6366f1',
    available: true,
  },
  {
    id: 'cos',
    name: 'Tencent COS',
    nameZh: '腾讯云 COS',
    description: 'Tencent Cloud Object Storage',
    descriptionZh: '腾讯云对象存储服务',
    icon: CloudIcon,
    color: '#00a4ff',
    available: true,
  },
  {
    id: 's3',
    name: 'Amazon S3',
    nameZh: 'Amazon S3',
    description: 'Amazon Simple Storage Service',
    descriptionZh: 'Amazon 简单存储服务',
    icon: CloudIcon,
    color: '#ff9900',
    available: false,
  },
  {
    id: 'oss',
    name: 'Aliyun OSS',
    nameZh: '阿里云 OSS',
    description: 'Alibaba Cloud Object Storage',
    descriptionZh: '阿里云对象存储服务',
    icon: CloudIcon,
    color: '#ff6a00',
    available: false,
  },
];

const cosRegions = [
  { value: 'ap-beijing', label: 'Beijing (ap-beijing)', labelZh: '北京 (ap-beijing)' },
  { value: 'ap-shanghai', label: 'Shanghai (ap-shanghai)', labelZh: '上海 (ap-shanghai)' },
  { value: 'ap-guangzhou', label: 'Guangzhou (ap-guangzhou)', labelZh: '广州 (ap-guangzhou)' },
  { value: 'ap-chengdu', label: 'Chengdu (ap-chengdu)', labelZh: '成都 (ap-chengdu)' },
  { value: 'ap-chongqing', label: 'Chongqing (ap-chongqing)', labelZh: '重庆 (ap-chongqing)' },
  { value: 'ap-hongkong', label: 'Hong Kong (ap-hongkong)', labelZh: '香港 (ap-hongkong)' },
  { value: 'ap-singapore', label: 'Singapore (ap-singapore)', labelZh: '新加坡 (ap-singapore)' },
];

export default function Storage() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const isZh = i18n.language === 'zh';
  const { policies, loading, fetchPolicies, createPolicy, deletePolicy, setDefaultPolicy, configureCors, validatePolicy } = useStorageStore();

  // View state: 'list' | 'select-provider' | 'configure'
  const [view, setView] = useState<'list' | 'select-provider' | 'configure'>('list');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState<PolicyFormData>(initialFormData);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [configuringCorsId, setConfiguringCorsId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleAddStorage = () => {
    setView('select-provider');
    setSelectedProvider(null);
    setFormData(initialFormData);
    setFormError('');
    setActiveStep(0);
  };

  const handleSelectProvider = (providerId: string) => {
    setSelectedProvider(providerId);
    setFormData({
      name: '',
      policy_type: providerId,
      config: providerId === 'local'
        ? { base_path: 'data/uploads' }
        : { secret_id: '', secret_key: '', bucket: '', region: 'ap-guangzhou' },
    });
    setView('configure');
    setActiveStep(1);
  };

  const handleBack = () => {
    if (view === 'configure') {
      setView('select-provider');
      setActiveStep(0);
    } else {
      setView('list');
    }
  };

  const handleCancel = () => {
    setView('list');
    setSelectedProvider(null);
    setFormData(initialFormData);
    setFormError('');
    setActiveStep(0);
  };

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

  const handleSubmit = async (configureCorsAfter: boolean = false) => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      notify.error(error);
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        name: formData.name.trim(),
        policy_type: formData.policy_type,
        config: formData.config,
      };

      await validatePolicy(payload);
      const newPolicy = await createPolicy(payload);

      if (configureCorsAfter && formData.policy_type === 'cos') {
        await configureCors(newPolicy.id);
        notify.success(t('storage.cors_configured'));
      }

      notify.success(t('storage.create_success'));
      handleCancel();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || t('storage.errors.create_failed');
      setFormError(errorMsg);
      notify.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfigureCors = async (policy: StoragePolicy) => {
    setConfiguringCorsId(policy.id);
    try {
      await configureCors(policy.id);
      notify.success(t('storage.cors_configured'));
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('storage.errors.configure_cors_failed'));
    } finally {
      setConfiguringCorsId(null);
    }
  };

  const handleDelete = async (policy: StoragePolicy) => {
    if (confirm(t('storage.delete_confirm', { name: policy.name }))) {
      try {
        await deletePolicy(policy.id);
        notify.success(t('storage.delete_success'));
      } catch (error: any) {
        notify.error(error.response?.data?.message || t('storage.delete_error'));
      }
    }
  };

  const handleSetDefault = async (policy: StoragePolicy) => {
    try {
      await setDefaultPolicy(policy.id);
      notify.success(t('storage.set_default_success'));
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('storage.set_default_error'));
    }
  };

  const getProviderInfo = (providerId: string) => {
    return cloudProviders.find((p) => p.id === providerId);
  };

  // Render provider selection cards
  const renderProviderSelection = () => (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {t('storage.select_provider')}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {t('storage.select_provider_subtitle')}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {cloudProviders.map((provider) => {
          const Icon = provider.icon;
          return (
            <Grid item xs={12} sm={6} md={4} key={provider.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: provider.available ? 'pointer' : 'default',
                  opacity: provider.available ? 1 : 0.5,
                  transition: 'all 0.2s',
                  border: `1px solid ${theme.palette.divider}`,
                  '&:hover': provider.available ? {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                    borderColor: provider.color,
                  } : {},
                }}
                onClick={() => provider.available && handleSelectProvider(provider.id)}
              >
                <CardContent sx={{ flex: 1, textAlign: 'center', py: 4 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 3,
                      bgcolor: alpha(provider.color, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <Icon sx={{ fontSize: 32, color: provider.color }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {isZh ? provider.nameZh : provider.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isZh ? provider.descriptionZh : provider.description}
                  </Typography>
                  {!provider.available && (
                    <Chip
                      label={t('storage.coming_soon')}
                      size="small"
                      sx={{ mt: 2 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );

  // Render configuration form
  const renderConfigurationForm = () => {
    const provider = getProviderInfo(selectedProvider || '');
    if (!provider) return null;

    const Icon = provider.icon;

    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack}>
            <ArrowBackIcon />
          </IconButton>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: alpha(provider.color, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon sx={{ fontSize: 24, color: provider.color }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {t('storage.configure_provider', { provider: isZh ? provider.nameZh : provider.name })}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {t('storage.configure_provider_subtitle')}
            </Typography>
          </Box>
        </Box>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                label={t('storage.policy_name')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isZh ? '例如：我的云存储' : 'e.g., My Cloud Storage'}
                disabled={submitting}
                helperText={t('storage.policy_name_helper')}
              />

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
                  helperText={t('storage.base_path_helper')}
                  disabled={submitting}
                />
              ) : formData.policy_type === 'cos' ? (
                <>
                  <Divider>
                    <Chip label={t('storage.credentials')} size="small" />
                  </Divider>

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
                    disabled={submitting}
                    helperText={t('storage.secret_id_helper')}
                  />

                  <TextField
                    fullWidth
                    label={t('storage.secret_key')}
                    type={showSecretKey ? 'text' : 'password'}
                    value={formData.config.secret_key || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, secret_key: e.target.value },
                      })
                    }
                    disabled={submitting}
                    helperText={t('storage.secret_key_helper')}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowSecretKey(!showSecretKey)}
                          >
                            {showSecretKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Divider>
                    <Chip label={t('storage.bucket_config')} size="small" />
                  </Divider>

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
                    placeholder="mybucket-1250000000"
                    helperText={t('storage.bucket_helper')}
                    disabled={submitting}
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
                      disabled={submitting}
                    >
                      {cosRegions.map((region) => (
                        <MenuItem key={region.value} value={region.value}>
                          {isZh ? region.labelZh : region.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              ) : null}

              {formError && (
                <Typography color="error" variant="body2">
                  {formError}
                </Typography>
              )}
            </Box>
          </CardContent>

          <Divider />

          <Box sx={{ p: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            {formData.policy_type === 'cos' && (
              <Button
                variant="outlined"
                onClick={() => handleSubmit(true)}
                disabled={submitting}
              >
                {submitting ? t('storage.creating') : t('storage.create_and_configure_cors')}
              </Button>
            )}
            <Button
              variant="contained"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              {submitting ? t('storage.creating') : t('common.create')}
            </Button>
          </Box>
        </Card>
      </Box>
    );
  };

  // Render policy list
  const renderPolicyList = () => (
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
          onClick={handleAddStorage}
        >
          {t('storage.add_storage')}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {policies.map((policy) => {
          const provider = getProviderInfo(policy.policy_type);
          const Icon = provider?.icon || StorageIcon;
          const color = provider?.color || theme.palette.primary.main;

          return (
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
                        backgroundColor: alpha(color, 0.15),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon sx={{ color }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {policy.name}
                      </Typography>
                      <Chip
                        label={policy.policy_type.toUpperCase()}
                        size="small"
                        sx={{ bgcolor: alpha(color, 0.1), color }}
                      />
                    </Box>
                    {policy.is_default && (
                      <Chip
                        icon={<StarIcon />}
                        label={t('storage.default')}
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
                      title={t('storage.configure_cors')}
                      disabled={configuringCorsId === policy.id}
                    >
                      <SettingsIcon />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => handleSetDefault(policy)}
                    disabled={policy.is_default}
                    title={t('storage.set_as_default')}
                  >
                    {policy.is_default ? <StarIcon color="primary" /> : <StarBorderIcon />}
                  </IconButton>
                  <Box sx={{ flex: 1 }} />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(policy)}
                    title={t('common.delete')}
                    disabled={policy.name === 'Default Local Storage'}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
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
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddStorage}>
                {t('storage.add_storage')}
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  return (
    <Box>
      {/* Progress Stepper for add flow */}
      {view !== 'list' && (
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          <Step>
            <StepLabel>{t('storage.step_select_provider')}</StepLabel>
          </Step>
          <Step>
            <StepLabel>{t('storage.step_configure')}</StepLabel>
          </Step>
        </Stepper>
      )}

      {view === 'list' && renderPolicyList()}
      {view === 'select-provider' && renderProviderSelection()}
      {view === 'configure' && renderConfigurationForm()}
    </Box>
  );
}
