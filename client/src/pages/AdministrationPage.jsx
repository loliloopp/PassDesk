import { useState } from 'react';
import { Card, Tabs, Typography, Space, Grid, Segmented } from 'antd';
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

  // Десктопные вкладки (Tabs)
  const desktopItems = [
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

  // Мобильный рендер с полным контролем layout
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Шапка */}
        <div style={{ padding: '16px 16px 0 16px', flexShrink: 0, background: '#fff' }}>
          <Space>
            <SettingOutlined />
            <Title level={3} style={{ margin: 0 }}>
              Администрирование
            </Title>
          </Space>
        </div>

        {/* Переключатель вкладок */}
        <div style={{ padding: '16px', flexShrink: 0, background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <Segmented
            block
            size="large"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              {
                label: 'Пользователи',
                value: 'users',
                icon: <TeamOutlined />,
              },
              {
                label: 'Контрагенты',
                value: 'counterparties',
                icon: <ShopOutlined />,
              },
            ]}
          />
        </div>

        {/* Контент (MobileUsersPage сам управляет прокруткой) */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          {activeTab === 'users' ? <MobileUsersPage /> : <MobileCounterpartiesPage />}
        </div>
      </div>
    );
  }

  // Десктопный рендер (Tabs)
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
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 0, padding: 0 }}
        styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0, padding: 0 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={desktopItems}
          size="large"
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0, margin: 0 }}
          styles={{ 
            tabBar: { 
              margin: 0,
              borderBottom: '1px solid #f0f0f0',
              flexShrink: 0
            },
            tabpane: { 
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1, 
              overflow: 'hidden',
              minHeight: 0,
              padding: '16px'
            }
          }}
        />
      </Card>
    </div>
  );
};

export default AdministrationPage;
