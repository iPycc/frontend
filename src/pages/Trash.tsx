import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Checkbox,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  RestoreFromTrash as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  Folder as FolderIcon,
  SelectAll as SelectAllIcon,
  ClearAll as ClearAllIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { api } from '../api/client';
import { useNotify } from '../contexts/NotificationContext';
import { getFileIcon } from '../utils/fileIcons';

interface TrashItem {
  id: string;
  name: string;
  is_dir: boolean;
  size: number;
  mime_type: string | null;
  deleted_at: string;
  original_parent_id: string | null;
  original_path: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Trash() {
  const theme = useTheme();
  const { t } = useTranslation();
  const notify = useNotify();

  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'restore' | 'delete' | 'empty';
    items?: TrashItem[];
  }>({ open: false, type: 'restore' });

  useEffect(() => {
    fetchTrashItems();
  }, []);

  const fetchTrashItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/files/trash');
      setItems(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch trash items:', error);
      notify.error(t('trash.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleRestore = async (itemIds: string[]) => {
    try {
      await api.post('/files/trash/restore', { ids: itemIds });
      notify.success(t('trash.restore_success'));
      setSelectedIds(new Set());
      fetchTrashItems();
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('trash.restore_error'));
    }
  };

  const handlePermanentDelete = async (itemIds: string[]) => {
    try {
      await api.post('/files/trash/delete', { ids: itemIds });
      notify.success(t('trash.delete_success'));
      setSelectedIds(new Set());
      fetchTrashItems();
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('trash.delete_error'));
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await api.post('/files/trash/empty');
      notify.success(t('trash.empty_success'));
      setItems([]);
      setSelectedIds(new Set());
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('trash.empty_error'));
    }
  };

  const openConfirmDialog = (type: 'restore' | 'delete' | 'empty', itemIds?: string[]) => {
    const selectedItems = itemIds
      ? items.filter((item) => itemIds.includes(item.id))
      : undefined;
    setConfirmDialog({ open: true, type, items: selectedItems });
  };

  const handleConfirm = () => {
    const { type, items: selectedItems } = confirmDialog;
    const ids = selectedItems?.map((item) => item.id) || [];

    if (type === 'restore') {
      handleRestore(ids);
    } else if (type === 'delete') {
      handlePermanentDelete(ids);
    } else if (type === 'empty') {
      handleEmptyTrash();
    }

    setConfirmDialog({ open: false, type: 'restore' });
  };

  const selectedItems = items.filter((item) => selectedIds.has(item.id));

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {t('trash.title')}
          </Typography>
          <Typography color="text.secondary">
            {t('trash.subtitle')}
          </Typography>
        </Box>
        {items.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => openConfirmDialog('empty')}
          >
            {t('trash.empty_trash')}
          </Button>
        )}
      </Box>

      {/* Selection Actions */}
      {selectedIds.size > 0 && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Typography variant="body2" fontWeight={500}>
            {t('trash.selected_count', { count: selectedIds.size })}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={<RestoreIcon />}
            onClick={() => openConfirmDialog('restore', Array.from(selectedIds))}
          >
            {t('trash.restore')}
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => openConfirmDialog('delete', Array.from(selectedIds))}
          >
            {t('trash.delete_permanently')}
          </Button>
        </Paper>
      )}

      {/* Toolbar */}
      {items.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={selectedIds.size === items.length ? t('trash.deselect_all') : t('trash.select_all')}>
            <IconButton size="small" onClick={handleSelectAll}>
              {selectedIds.size === items.length ? <ClearAllIcon /> : <SelectAllIcon />}
            </IconButton>
          </Tooltip>
          <Typography variant="body2" color="text.secondary">
            {t('trash.item_count', { count: items.length })}
          </Typography>
        </Box>
      )}

      {/* Trash Items Grid */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">{t('common.loading')}</Typography>
        </Box>
      ) : items.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <DeleteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {t('trash.empty')}
          </Typography>
          <Typography color="text.secondary">
            {t('trash.empty_description')}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  border: selectedIds.has(item.id)
                    ? `2px solid ${theme.palette.primary.main}`
                    : `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    boxShadow: theme.shadows[4],
                  },
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      size="small"
                    />
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.text.primary, 0.05),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.is_dir ? (
                        <FolderIcon sx={{ fontSize: 28, color: '#f59e0b' }} />
                      ) : (
                        getFileIcon(item.name, item.mime_type, { sx: { fontSize: 28 } })
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        noWrap
                        title={item.name}
                      >
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.is_dir ? t('trash.folder') : formatBytes(item.size)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" noWrap title={item.original_path}>
                      {t('trash.original_location')}: {item.original_path || '/'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('trash.deleted_at')}: {formatDate(item.deleted_at)}
                    </Typography>
                  </Box>
                </CardContent>

                <Box sx={{ p: 1.5, pt: 0, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<RestoreIcon />}
                    onClick={() => openConfirmDialog('restore', [item.id])}
                    sx={{ flex: 1 }}
                  >
                    {t('trash.restore')}
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => openConfirmDialog('delete', [item.id])}
                  >
                    <DeleteForeverIcon />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, type: 'restore' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {confirmDialog.type === 'restore' ? (
            <RestoreIcon color="primary" />
          ) : (
            <WarningIcon color="error" />
          )}
          {confirmDialog.type === 'restore'
            ? t('trash.confirm_restore_title')
            : confirmDialog.type === 'delete'
            ? t('trash.confirm_delete_title')
            : t('trash.confirm_empty_title')}
        </DialogTitle>
        <DialogContent>
          {confirmDialog.type === 'empty' ? (
            <Typography>
              {t('trash.confirm_empty_message')}
            </Typography>
          ) : (
            <>
              <Typography sx={{ mb: 2 }}>
                {confirmDialog.type === 'restore'
                  ? t('trash.confirm_restore_message')
                  : t('trash.confirm_delete_message')}
              </Typography>
              {confirmDialog.items && confirmDialog.items.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {confirmDialog.items.slice(0, 5).map((item) => (
                    <Chip
                      key={item.id}
                      label={item.name}
                      size="small"
                      icon={item.is_dir ? <FolderIcon /> : undefined}
                    />
                  ))}
                  {confirmDialog.items.length > 5 && (
                    <Chip
                      label={`+${confirmDialog.items.length - 5}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              )}
            </>
          )}
          {confirmDialog.type !== 'restore' && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {t('trash.permanent_delete_warning')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, type: 'restore' })}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color={confirmDialog.type === 'restore' ? 'primary' : 'error'}
            onClick={handleConfirm}
          >
            {confirmDialog.type === 'restore'
              ? t('trash.restore')
              : confirmDialog.type === 'delete'
              ? t('trash.delete_permanently')
              : t('trash.empty_trash')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
