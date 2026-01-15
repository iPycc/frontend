import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  alpha,
  LinearProgress,
  Tooltip,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Folder as FolderIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Cloud as CloudIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Language as LanguageIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/auth';
import { useStorageStore } from '../stores/storage';
import { useColorMode } from '../contexts/ColorModeContext';
import { api } from '../api/client';
import UploadQueue from './UploadQueue';

const drawerWidth = 260;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Layout() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logoutServer } = useAuthStore();
  const { toggleColorMode, mode } = useColorMode();
  const { policies, fetchPolicies, selectedPolicyId, setSelectedPolicyId } = useStorageStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  const [storageUsage, setStorageUsage] = useState<{ used: number; limit: number; percentage: number } | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    if (selectedPolicyId || policies.length === 0) return;
    const defaultPolicy = policies.find((p) => p.is_default);
    if (defaultPolicy) setSelectedPolicyId(defaultPolicy.id);
  }, [policies, selectedPolicyId, setSelectedPolicyId]);

  useEffect(() => {
    if (!user) return;
    const fetchUsage = async () => {
      try {
        const response = await api.get('/user/storage', {
          params: selectedPolicyId ? { policy_id: selectedPolicyId } : undefined,
        });
        setStorageUsage(response.data.data);
      } catch {
        setStorageUsage(null);
      }
    };
    fetchUsage();
  }, [user?.id, selectedPolicyId]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(event.currentTarget);
  };

  const handleLangMenuClose = () => {
    setLangAnchorEl(null);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    handleLangMenuClose();
  };

  const handleLogout = () => {
    logoutServer();
    navigate('/login');
  };

  const menuItems = [
    { text: t('common.files'), icon: <FolderIcon />, path: '/files' },
    { text: t('common.storage'), icon: <StorageIcon />, path: '/storage' },
    { text: t('common.shares'), icon: <ShareIcon />, path: '/shares' },
    { text: t('common.settings'), icon: <SettingsIcon />, path: '/settings' },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ text: t('common.users'), icon: <PeopleIcon />, path: '/admin/users' });
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar /> {/* Spacer for Clipped Drawer */}
      <Box sx={{ p: 2 }}>
        <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
          <InputLabel>{t('files.select_storage')}</InputLabel>
          <Select
            value={selectedPolicyId || ''}
            label={t('files.select_storage')}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedPolicyId(val || null);
              navigate('/files');
              if (mobileOpen) setMobileOpen(false);
            }}
            sx={{ height: 40 }}
          >
            {policies.map((policy) => (
              <MenuItem key={policy.id} value={policy.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StorageIcon fontSize="small" color={policy.policy_type === 'local' ? 'action' : 'primary'} />
                  <Typography variant="body2" noWrap>{policy.name}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, py: 2, overflowY: 'auto' }}>
        <List>
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5, px: 2 }}>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: isActive
                      ? alpha(theme.palette.primary.main, 0.15)
                      : 'transparent',
                    color: isActive
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                    '&:hover': {
                      backgroundColor: isActive
                        ? alpha(theme.palette.primary.main, 0.2)
                        : alpha(theme.palette.text.primary, 0.05),
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: 'inherit',
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.95rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
      
      {/* Storage Usage in Sidebar */}
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {t('settings.storage_usage')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatBytes(storageUsage?.used || 0)} / {storageUsage?.limit && storageUsage.limit < 0 ? '∞' : formatBytes(storageUsage?.limit || 0)}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={storageUsage?.limit && storageUsage.limit < 0 ? 0 : storageUsage?.percentage || 0} 
          sx={{ 
            height: 6, 
            borderRadius: 3,
            bgcolor: alpha(theme.palette.text.primary, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
            }
          }} 
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.background.default, // Match page background
          color: theme.palette.text.primary,
          boxShadow: 'none',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloudIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} noWrap component="div">
              CloudRaver
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Language Switcher */}
          <Tooltip title={t('settings.language')}>
            <IconButton color="inherit" onClick={handleLangMenuOpen}>
              <LanguageIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={langAnchorEl}
            open={Boolean(langAnchorEl)}
            onClose={handleLangMenuClose}
          >
            <MenuItem onClick={() => changeLanguage('en')} selected={i18n.language === 'en'}>English</MenuItem>
            <MenuItem onClick={() => changeLanguage('zh')} selected={i18n.language === 'zh'}>简体中文</MenuItem>
          </Menu>

          {/* Theme Switcher */}
          <Tooltip title={mode === 'dark' ? t('settings.light_mode') : t('settings.dark_mode')}>
            <IconButton color="inherit" onClick={toggleColorMode}>
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
            <Avatar
              src={user?.avatar_url || undefined}
              sx={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                fontSize: '0.875rem',
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : <PersonIcon fontSize="small" />}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" noWrap>
                {user?.name || user?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                handleMenuClose();
                navigate('/settings');
              }}
            >
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              {t('common.settings')}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              {t('common.logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: theme.palette.background.default,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: theme.palette.background.default,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar /> {/* Spacer for fixed AppBar */}
        <Box sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Box>
      </Box>
      <UploadQueue />
    </Box>
  );
}
