import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  ButtonBase,
  Breadcrumbs,
  Link,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  alpha,
  useTheme,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  useMediaQuery,
  Drawer,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreVertIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Home as HomeIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  Image as ImageIcon,
  Description as DocIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Cloud as CloudIcon,
  Code as CodeIcon,
  PictureAsPdf as PdfIcon,
  TableChart as TableIcon,
  Slideshow as SlideIcon,
  Archive as ArchiveIcon,
  TextSnippet as TextIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useFilesStore, FileItem } from '../stores/files';
import { useStorageStore } from '../stores/storage';
import { useShareStore } from '../stores/share';
import { useNotify } from '../contexts/NotificationContext';
import { useAuthStore } from '../stores/auth';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

function buildCrPath(path: { name: string }[], name: string) {
  const parts = [...path.map((p) => p.name), name].filter(Boolean);
  return '/' + parts.join('/');
}

// Helper to get file icon
function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <FileIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
  
  if (mimeType.startsWith('image/')) return <ImageIcon sx={{ fontSize: 40, color: '#a855f7' }} />;
  if (mimeType.startsWith('video/')) return <VideoIcon sx={{ fontSize: 40, color: '#ef4444' }} />;
  if (mimeType.startsWith('audio/')) return <AudioIcon sx={{ fontSize: 40, color: '#f97316' }} />;
  
  // Documents
  if (mimeType.includes('pdf')) return <PdfIcon sx={{ fontSize: 40, color: '#ef4444' }} />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <DocIcon sx={{ fontSize: 40, color: '#3b82f6' }} />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('csv')) return <TableIcon sx={{ fontSize: 40, color: '#10b981' }} />;
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return <SlideIcon sx={{ fontSize: 40, color: '#f59e0b' }} />;
  
  // Code/Text
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('html') || mimeType.includes('javascript') || mimeType.includes('css')) 
    return <CodeIcon sx={{ fontSize: 40, color: '#6366f1' }} />;
  if (mimeType.startsWith('text/')) return <TextIcon sx={{ fontSize: 40, color: '#64748b' }} />;
  
  // Archives
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('tar')) 
    return <ArchiveIcon sx={{ fontSize: 40, color: '#8b5cf6' }} />;

  return <FileIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
}

export default function Files() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { folderId } = useParams();
  const { files, path, loading, fetchFiles, createDirectory, uploadFile, renameFile, deleteFile, downloadFile } = useFilesStore();
  const { policies, selectedPolicyId } = useStorageStore();
  const { createShare } = useShareStore();
  const notify = useNotify();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuthStore();
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; file: FileItem } | null>(null);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameDialog, setRenameDialog] = useState<FileItem | null>(null);
  const [renameName, setRenameName] = useState('');
  const [shareDialog, setShareDialog] = useState<FileItem | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareMaxViews, setShareMaxViews] = useState('');
  const [shareExpiresAt, setShareExpiresAt] = useState('');
  const [shareResult, setShareResult] = useState<{ token: string } | null>(null);
  const [detailsFile, setDetailsFile] = useState<FileItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [blankMenu, setBlankMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchFiles(folderId || null, selectedPolicyId);
  }, [folderId, selectedPolicyId, fetchFiles]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        try {
        // Use selected policy or default policy
        const policyToUse = selectedPolicyId || policies.find((p) => p.is_default)?.id || null;
        await uploadFile(file, folderId || null, policyToUse);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }, [folderId, policies, selectedPolicyId, uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  const handleFileClick = (file: FileItem) => {
    if (file.is_dir) {
      navigate(`/files/${file.id}`);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, file: FileItem) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, file });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createDirectory(newFolderName, folderId || null, selectedPolicyId);
      setNewFolderDialog(false);
      setNewFolderName('');
    }
  };

  const handleRename = async () => {
    if (renameDialog && renameName.trim()) {
      await renameFile(renameDialog.id, renameName);
      setRenameDialog(null);
      setRenameName('');
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (confirm(t('files.delete_confirm', { name: file.name }))) {
      await deleteFile(file.id);
    }
    handleCloseContextMenu();
  };

  const handleDownload = async (file: FileItem) => {
    await downloadFile(file.id, file.name);
    handleCloseContextMenu();
  };

  const toggleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  };

  // Group files
  const folders = files.filter(f => f.is_dir);
  const items = files.filter(f => !f.is_dir);

  const renderGridView = (fileList: FileItem[]) => (
    <Grid container spacing={1.5}>
      {fileList.map((file) => {
        const selected = selectedFiles.has(file.id);
        return (
          <Grid item xs={6} sm={4} md={3} lg={2.4} xl={2} key={file.id}>
            <ButtonBase
              data-file-item
              onClick={() => {
                if (isMobile && !file.is_dir) {
                  toggleSelectFile(file.id);
                } else {
                  if (selectedFiles.size > 0 && !isMobile) {
                    toggleSelectFile(file.id);
                  } else {
                    handleFileClick(file);
                  }
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, file)}
              sx={{
                width: '100%',
                height: 48,
                borderRadius: 3,
                bgcolor: selected ? '#c2e7ff' : (theme.palette.mode === 'dark' ? '#303134' : '#f0f4f9'),
                color: selected ? '#001d35' : 'text.primary',
                justifyContent: 'flex-start',
                px: 2,
                gap: 1.5,
                transition: 'background-color 0.1s ease',
                '&:hover': {
                  bgcolor: selected ? '#c2e7ff' : (theme.palette.mode === 'dark' ? '#3c4043' : '#e2e7eb'),
                },
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
                {/* Icon Layer */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: selected ? 0 : 1,
                    transition: 'opacity 0.1s ease',
                  }}
                >
                  {file.is_dir ? (
                    <FolderIcon sx={{ fontSize: 24, color: theme.palette.mode === 'dark' ? '#9aa0a6' : '#5f6368' }} />
                  ) : (
                    React.cloneElement(getFileIcon(file.mime_type) as React.ReactElement, { sx: { fontSize: 24, color: getFileIcon(file.mime_type)?.props?.sx?.color || (theme.palette.mode === 'dark' ? '#9aa0a6' : '#5f6368') } })
                  )}
                </Box>
                
                {/* Check Layer */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: selected ? 1 : 0,
                    transition: 'opacity 0.1s ease',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </Box>
              </Box>

              <Typography 
                variant="body2" 
                noWrap 
                title={file.name}
                sx={{ 
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  flex: 1,
                  textAlign: 'left'
                }}
              >
                {file.name}
              </Typography>
            </ButtonBase>
          </Grid>
        );
      })}
    </Grid>
  );

  const renderListView = (fileList: FileItem[]) => (
    <TableContainer component={Paper} variant="outlined" sx={{ borderColor: theme.palette.divider }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={selectedFiles.size > 0 && selectedFiles.size === fileList.length}
                indeterminate={selectedFiles.size > 0 && selectedFiles.size < fileList.length}
                onChange={toggleSelectAll}
              />
            </TableCell>
            <TableCell>{t('common.name')}</TableCell>
            <TableCell width={180}>{t('common.modified')}</TableCell>
            <TableCell align="right" width={80}>{t('common.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fileList.map((file) => (
            <TableRow
              key={file.id}
              data-file-item
              hover
              selected={selectedFiles.has(file.id)}
              onContextMenu={(e) => handleContextMenu(e, file)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleSelectFile(file.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
              <TableCell onClick={() => handleFileClick(file)}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {file.is_dir ? (
                    <FolderIcon color="primary" />
                  ) : (
                    <FileIcon color="action" />
                  )}
                  <Typography variant="body2">{file.name}</Typography>
                </Box>
              </TableCell>
              <TableCell>{formatDate(file.updated_at)}</TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, file);
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const handleCreateShare = async () => {
    if (!shareDialog) return;
    try {
      const share = await createShare(
        shareDialog.id,
        sharePassword || undefined,
        shareMaxViews ? parseInt(shareMaxViews) : undefined,
        shareExpiresAt || undefined
      );
      setShareResult({ token: share.token });
    } catch (error) {
      console.error('Failed to create share:', error);
      alert(t('shares.create_error'));
    }
  };

  const handleCloseShare = () => {
    setShareDialog(null);
    setSharePassword('');
    setShareMaxViews('');
    setShareExpiresAt('');
    setShareResult(null);
  };

  return (
    <Box
      {...getRootProps()}
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-file-item]')) return;
        e.preventDefault();
        setBlankMenu({ mouseX: e.clientX, mouseY: e.clientY });
      }}
      sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pb: 4, outline: 'none' }}
    >
      <input {...getInputProps()} />
      
      {/* Page Header (Title & Actions) */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: 2, 
          mb: 2,
          pb: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          {t('files.title')}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* View Toggle (Desktop) */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            <ToggleButton value="grid">
              <GridViewIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="list">
              <ListViewIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CreateNewFolderIcon />}
              onClick={() => setNewFolderDialog(true)}
              sx={{ height: 40 }}
            >
              {t('files.new_folder')}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<UploadIcon />}
              component="label"
              sx={{ height: 40 }}
            >
              {t('common.upload')}
              <input
                type="file"
                hidden
                multiple
                ref={uploadInputRef}
                onChange={(e) => {
                  if (e.target.files) {
                    onDrop(Array.from(e.target.files));
                  }
                }}
              />
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          underline="hover"
          color="inherit"
          onClick={() => navigate('/files')}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <HomeIcon fontSize="small" />
          {t('files.my_files')}
        </Link>
        {path.map((item, index) => (
          <Link
            key={item.id}
            component="button"
            underline="hover"
            color={index === path.length - 1 ? 'text.primary' : 'inherit'}
            onClick={() => navigate(`/files/${item.id}`)}
          >
            {item.name}
          </Link>
        ))}
      </Breadcrumbs>

      {/* Drop zone overlay */}
      {isDragActive && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            border: `3px dashed ${theme.palette.primary.main}`,
            borderRadius: 2,
            m: 2,
          }}
        >
          <Typography variant="h5" color="primary">
            {t('files.drop_files')}
          </Typography>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography color="text.secondary">{t('common.loading')}</Typography>
        </Box>
      ) : files.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CloudIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
          <Typography color="text.secondary">
            {t('files.no_files')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Folders Section */}
          {folders.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                {t('files.folders')} ({folders.length})
              </Typography>
              {viewMode === 'grid' ? renderGridView(folders) : renderListView(folders)}
            </Box>
          )}

          {/* Files Section */}
          {items.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                {t('files.items')} ({items.length})
              </Typography>
              {viewMode === 'grid' ? renderGridView(items) : renderListView(items)}
            </Box>
          )}
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {contextMenu?.file && !contextMenu.file.is_dir && (
          <MenuItem onClick={() => { handleDownload(contextMenu.file); }}>
            <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('common.download')}</ListItemText>
          </MenuItem>
        )}
        {contextMenu?.file && (
          <MenuItem
            onClick={() => {
              setDetailsFile(contextMenu.file);
              handleCloseContextMenu();
            }}
          >
            <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('common.details')}</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => {
          setShareDialog(contextMenu?.file || null);
          setShareResult(null);
          handleCloseContextMenu();
        }}>
          <ListItemIcon><ShareIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t('common.share')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setRenameDialog(contextMenu?.file || null);
          setRenameName(contextMenu?.file?.name || '');
          handleCloseContextMenu();
        }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t('common.rename')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => contextMenu?.file && handleDelete(contextMenu.file)}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>{t('common.delete')}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Blank Area Menu */}
      <Menu
        open={blankMenu !== null}
        onClose={() => setBlankMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          blankMenu !== null
            ? { top: blankMenu.mouseY, left: blankMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            fetchFiles(folderId || null, selectedPolicyId);
            setBlankMenu(null);
          }}
        >
          <ListItemText>{t('common.refresh')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setNewFolderDialog(true);
            setBlankMenu(null);
          }}
        >
          <ListItemText>{t('files.new_folder')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            uploadInputRef.current?.click();
            setBlankMenu(null);
          }}
        >
          <ListItemText>{t('common.upload')}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Share Dialog */}
      <Dialog
        open={!!shareDialog}
        onClose={handleCloseShare}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            {shareResult ? t('shares.share_link') : t('shares.create_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {shareDialog?.name}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {!shareResult ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label={t('shares.password_optional')}
                type="password"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
              />
              <TextField
                fullWidth
                label={t('shares.max_views_optional')}
                type="number"
                value={shareMaxViews}
                onChange={(e) => setShareMaxViews(e.target.value)}
              />
              <TextField
                fullWidth
                label={t('shares.expires_at_optional')}
                type="datetime-local"
                value={shareExpiresAt}
                onChange={(e) => setShareExpiresAt(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="success" variant="outlined" sx={{ borderRadius: 2 }}>
                {t('shares.create_success')}
              </Alert>
              <TextField
                fullWidth
                label={t('shares.share_link')}
                value={`${window.location.origin}/s/${shareResult.token}`}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/s/${shareResult.token}`);
                        notify.success(t('common.copy_link'));
                      }}
                    >
                      <CopyIcon />
                    </IconButton>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={() => window.open(`${window.location.origin}/s/${shareResult.token}`, '_blank')}
                sx={{ borderRadius: 2, textTransform: 'none', py: 1.2 }}
              >
                {t('common.open')}
              </Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: isMobile ? 3 : 2 }}>
          <Button onClick={handleCloseShare}>{t('common.close')}</Button>
          {!shareResult && (
            <Button variant="contained" onClick={handleCreateShare} sx={{ borderRadius: 2 }}>
              {t('common.create')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={!!detailsFile}
        onClose={() => setDetailsFile(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 360 }, bgcolor: 'background.paper' } }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Typography variant="h6" fontWeight={700}>
              {detailsFile?.is_dir ? t('files.folders') : t('files.items')}
            </Typography>
            <IconButton onClick={() => setDetailsFile(null)} size="small">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </IconButton>
          </Box>

          <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ width: 80, height: 80, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {detailsFile?.is_dir ? (
                <FolderIcon sx={{ fontSize: 64, color: theme.palette.mode === 'dark' ? '#9aa0a6' : '#5f6368' }} />
              ) : (
                React.cloneElement(getFileIcon(detailsFile?.mime_type || null) as React.ReactElement, { sx: { fontSize: 64, color: getFileIcon(detailsFile?.mime_type || null)?.props?.sx?.color || (theme.palette.mode === 'dark' ? '#9aa0a6' : '#5f6368') } })
              )}
            </Box>
            <Typography variant="h6" fontWeight={500} textAlign="center" sx={{ wordBreak: 'break-all' }}>
              {detailsFile?.name}
            </Typography>
          </Box>

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            {t('common.details')}
          </Typography>

          <Stack spacing={2.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>{t('common.storage')}</Typography>
              <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
                {policies.find((p) => p.id === detailsFile?.policy_id)?.name || detailsFile?.policy_id || '-'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>CR Path</Typography>
              <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {detailsFile ? buildCrPath(path, detailsFile.name) : '-'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>{t('common.size')}</Typography>
              <Typography variant="body2" sx={{ textAlign: 'right' }}>
                {detailsFile?.is_dir ? '—' : formatFileSize(detailsFile?.size || 0)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>{t('common.modified')}</Typography>
              <Typography variant="body2" sx={{ textAlign: 'right' }}>
                {detailsFile?.updated_at ? formatDate(detailsFile.updated_at) : '-'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>{t('common.owner')}</Typography>
              <Typography variant="body2" sx={{ textAlign: 'right' }}>
                {user?.name || user?.email || detailsFile?.user_id || '-'}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Drawer>

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialog} onClose={() => setNewFolderDialog(false)}>
        <DialogTitle>{t('files.create_folder_title')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t('files.folder_name_label')}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFolderDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreateFolder}>{t('common.create')}</Button>
        </DialogActions>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialog !== null} onClose={() => setRenameDialog(null)}>
        <DialogTitle>{t('files.rename_title')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t('files.new_name_label')}
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleRename}>{t('common.rename')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
