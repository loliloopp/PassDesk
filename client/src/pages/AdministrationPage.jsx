import { useState } from 'react';
import { Card, Tabs, Typography, Space, Grid } from 'antd';
import { SettingOutlined, TeamOutlined, GlobalOutlined } from '@ant-design/icons';
import UsersPage from './UsersPage';
import MobileUsersPage from './MobileUsersPage';
import SettingsPage from './SettingsPage';
import CitizenshipsPage from './CitizenshipsPage';

const { Title } = Typography;
const { useBreakpoint } = Grid;

const AdministrationPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // На мобильных показываем только вкладку Пользователи
  const tabItems = isMobile 
    ? [
        {
          key: 'users',
          label: (
            <span>
              <TeamOutlined />
              Пользователи
            </span>
          ),
          children: <MobileUsersPage />
        }
      ]
    : [
        {
          key: 'users',
          label: (
            <span>
              <TeamOutlined />
              Пользователи
            </span>
          ),
          children: <UsersPage />
        },
        {
          key: 'citizenships',
          label: (
            <span>
              <GlobalOutlined />
              Гражданство
            </span>
          ),
          children: <CitizenshipsPage />
        },
        {
          key: 'settings',
          label: (
            <span>
              <SettingOutlined />
              Настройки
            </span>
          ),
          children: <SettingsPage />
        }
      ];

  return (
    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Card
        title={
          <Space>
            <SettingOutlined />
            <Title level={3} style={{ margin: 0 }}>
              Администрирование
            </Title>
          </Space>
        }
        style={{ margin: '-24px', minHeight: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
          styles={{ 
            tabpane: { 
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1, 
              overflow: 'hidden' 
            }
          }}
        />
      </Card>
    </div>
  );
};

export default AdministrationPage;

