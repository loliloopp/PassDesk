import { useState } from 'react';
import { Card, Tabs, Typography, Space } from 'antd';
import { BookOutlined, ApartmentOutlined, TeamOutlined } from '@ant-design/icons';
import DepartmentsPage from './DepartmentsPage';
import PositionsPage from './PositionsPage';

const { Title } = Typography;

const DirectoriesPage = () => {
  const [activeTab, setActiveTab] = useState('departments');

  const tabItems = [
    {
      key: 'departments',
      label: (
        <span>
          <ApartmentOutlined />
          Подразделения
        </span>
      ),
      children: <DepartmentsPage />
    },
    {
      key: 'positions',
      label: (
        <span>
          <TeamOutlined />
          Должности
        </span>
      ),
      children: <PositionsPage />
    }
  ];

  return (
    <div style={{ padding: '0' }}>
      <Card
        title={
          <Space>
            <BookOutlined />
            <Title level={3} style={{ margin: 0 }}>
              Справочники
            </Title>
          </Space>
        }
        style={{ margin: '0 -24px -24px -24px', minHeight: 'calc(100vh - 112px)' }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          tabBarStyle={{ paddingLeft: '10px' }}
        />
      </Card>
    </div>
  );
};

export default DirectoriesPage;

