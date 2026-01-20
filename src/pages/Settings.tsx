import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Cloud as CloudIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/auth';

// Import Components
import Profile from './settings/Profile';
import Security from './settings/Security';
import Storage from './settings/Storage';
import UserManagement from './settings/UserManagement';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: { xs: 2, md: 5 }, pb: { xs: 3, md: 4 } }}>{children}</Box>}
    </div>
  );
}

export default function Settings() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box>
      <Box sx={{ mb: { xs: 1, md: 3 }, mt: { xs: 1, md: 0 } }}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
          {t('settings.title')}
        </Typography>
        <Typography color="text.secondary" variant="subtitle1" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
          {t('settings.main_subtitle')}
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, v) => setActiveTab(v)}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: { xs: '0.85rem', md: '0.9rem' },
              px: { xs: 1, md: 2 },
              minWidth: 'auto'
            }
          }}
        >
          <Tab icon={isMobile ? undefined : <PersonIcon />} iconPosition="start" label={t('settings.tabs.profile')} />
          <Tab icon={isMobile ? undefined : <SecurityIcon />} iconPosition="start" label={t('settings.tabs.security')} />
          <Tab icon={isMobile ? undefined : <CloudIcon />} iconPosition="start" label={t('settings.tabs.storage')} />
          {user?.role === 'admin' && (
            <Tab icon={isMobile ? undefined : <GroupIcon />} iconPosition="start" label={t('settings.tabs.users')} />
          )}
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <Profile />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Security />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Storage />
      </TabPanel>

      {user?.role === 'admin' && (
        <TabPanel value={activeTab} index={3}>
          <UserManagement />
        </TabPanel>
      )}
    </Box>
  );
}
