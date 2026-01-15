import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Switch,
} from '@mui/material';
import {
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { api } from '../../api/client';

interface User {
  id: string;
  email: string;
  role: string;
  storage_used: number;
  storage_limit: number;
  is_active: boolean;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
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
        u.id === user.id ? { ...u, is_active: !u.is_active } : u
      ));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update user status');
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        {t('admin.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {t('admin.subtitle')}
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('common.email')}</TableCell>
              <TableCell>{t('common.role')}</TableCell>
              <TableCell>{t('settings.storage_usage')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('settings.member_since')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">{t('common.loading')}</Typography>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">{t('admin.no_users')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography fontWeight={500}>{user.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role.toUpperCase()}
                      size="small"
                      color={user.role === 'admin' ? 'primary' : 'default'}
                      variant={user.role === 'admin' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {formatBytes(user.storage_used)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        / {user.storage_limit < 0 ? 'Unlimited' : formatBytes(user.storage_limit)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={user.is_active ? <CheckCircleIcon /> : <BlockIcon />}
                      label={user.is_active ? 'Active' : 'Disabled'}
                      size="small"
                      color={user.is_active ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Switch
                      checked={user.is_active}
                      onChange={() => handleToggleStatus(user)}
                      disabled={user.role === 'admin'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

