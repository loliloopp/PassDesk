import { useState } from 'react';
import { Card, Tabs, Typography, Space } from 'antd';
import { SettingOutlined, TeamOutlined } from '@ant-design/icons';
import UsersPage from './UsersPage';
import SettingsPage from './SettingsPage';

const { Title } = Typography;

const AdministrationPage = () => {
  const [activeTab, setActiveTab] = useState('users');

  const tabItems = [
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
    <div style={{ padding: '0' }}>
      <Card
        title={
          <Space>
            <SettingOutlined />
            <Title level={3} style={{ margin: 0 }}>
              Администрирование
            </Title>
          </Space>
        }
        style={{ margin: '-24px', minHeight: 'calc(100vh - 112px)' }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};

export default AdministrationPage;

