import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  LinearProgress,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { api } from '../../api/client';
import { useNotify } from '../../contexts/NotificationContext';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  storage_used: number;
  storage_limit: number;
  is_active: boolean;
  created_at: string;
  avatar_url?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function UserManagement() {
  const theme = useTheme();
  const { t } = useTranslation();
  const notify = useNotify();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      notify.error(t('admin.fetch_users_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await api.put(`/admin/users/${user.id}/status`, {
        is_active: !user.is_active,
      });
      setUsers(users.map((u) =>
        u.id === user.id ? { ...u, is_active: !user.is_active } : u
      ));
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, is_active: !user.is_active });
      }
      notify.success(t('settings.user_status_updated'));
    } catch (error: any) {
      notify.error(error.response?.data?.message || t('settings.user_status_update_failed'));
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          placeholder={t('admin.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
          }}
          sx={{ 
            bgcolor: 'transparent',
            '& .MuiOutlinedInput-root': { borderRadius: 2 }
          }}
          size="small"
        />
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2 }}
          disabled // Backend create user not implemented yet in this turn
        >
          {t('admin.add_user')}
        </Button>
      </Box>

      {loading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={2}>
          {filteredUsers.map((u) => (
            <Grid item xs={12} sm={6} lg={4} key={u.id}>
              <Card 
                variant="outlined"
                sx={{ 
                  borderRadius: 3, 
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  // No hover transform/shadow as requested
                }}
                onClick={() => setSelectedUser(u)}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Avatar 
                        src={u.avatar_url}
                        sx={{ 
                          bgcolor: alpha(theme.palette.secondary.main, 0.1), 
                          color: theme.palette.secondary.main 
                        }}
                      >
                        {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={600} noWrap sx={{ maxWidth: 150 }}>{u.name || u.email.split('@')[0]}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 150 }}>{u.email}</Typography>
                      </Box>
                    </Box>
                    <Box>
                        {/* Status Indicator Dot */}
                        <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: u.is_active ? 'success.main' : 'error.main',
                            ml: 'auto'
                        }} />
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip 
                      label={u.role} 
                      size="small" 
                      color={u.role === 'admin' ? 'primary' : 'default'}
                      variant="outlined" 
                    />
                  </Box>

                  <Box sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05), p: 1, borderRadius: 2 }}>
                     {/* Show some details directly as requested "Show detailed info" */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">{t('settings.storage_usage')}</Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {formatBytes(u.storage_used)}
                      </Typography>
                    </Box>
                     <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">UID</Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {u.id.substring(0, 8)}...
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* User Details Dialog */}
      <Dialog 
        open={Boolean(selectedUser)} 
        onClose={() => setSelectedUser(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedUser && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  src={selectedUser.avatar_url}
                  sx={{ width: 56, height: 56, bgcolor: theme.palette.primary.main }}
                >
                  {selectedUser.name?.[0]?.toUpperCase() || selectedUser.email[0].toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedUser.name || 'No Name'}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <List>
                <ListItem>
                  <ListItemText primary="UID" secondary={selectedUser.id} secondaryTypographyProps={{ fontFamily: 'monospace' }} />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary={t('settings.profile.role')} secondary={selectedUser.role.toUpperCase()} />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary={t('settings.profile.registered_at')} secondary={new Date(selectedUser.created_at).toLocaleString()} />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary={t('settings.storage_usage')} 
                    secondary={`${formatBytes(selectedUser.storage_used)} / ${selectedUser.storage_limit < 0 ? t('settings.unlimited') : formatBytes(selectedUser.storage_limit)}`} 
                  />
                </ListItem>
              </List>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setSelectedUser(null)}>{t('common.close')}</Button>
              <Button 
                variant="contained" 
                color={selectedUser.is_active ? 'error' : 'success'}
                onClick={() => handleToggleStatus(selectedUser)}
                disabled={selectedUser.role === 'admin'}
              >
                {selectedUser.is_active ? t('settings.disabled') : t('settings.active')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
