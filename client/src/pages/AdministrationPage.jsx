import { useState } from 'react';
import { Card, Tabs, Typography, Space, Grid } from 'antd';
import { SettingOutlined, TeamOutlined, GlobalOutlined, ShopOutlined } from '@ant-design/icons';
import UsersPage from './UsersPage';
import MobileUsersPage from './MobileUsersPage';
import SettingsPage from './SettingsPage';
import CitizenshipsPage from './CitizenshipsPage';
import CounterpartiesPage from './CounterpartiesPage';
import MobileCounterpartiesPage from './MobileCounterpartiesPage';

const { Title } = Typography;
const { useBreakpoint } = Grid;

const AdministrationPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // На мобильных показываем только вкладки Пользователи и Контрагенты
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
        },
        {
          key: 'counterparties',
          label: (
            <span>
              <ShopOutlined />
              Контрагенты
            </span>
          ),
          children: <MobileCounterpartiesPage />
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
          key: 'counterparties',
          label: (
            <span>
              <ShopOutlined />
              Контрагенты
            </span>
          ),
          children: <CounterpartiesPage />
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
    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Card
        title={
          <Space>
            <SettingOutlined />
            <Title level={3} style={{ margin: 0 }}>
              Администрирование
            </Title>
          </Space>
        }
        style={{ margin: '-24px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}
          styles={{ 
            tabpane: { 
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1, 
              overflow: 'auto',
              minHeight: 0
            }
          }}
        />
      </Card>
    </div>
  );
};

export default AdministrationPage;

