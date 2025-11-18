import { useState } from 'react';
import { Card, Tabs, Typography, Space } from 'antd';
import { BookOutlined, ApartmentOutlined } from '@ant-design/icons';
import DepartmentsPage from './DepartmentsPage';

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

export default DirectoriesPage;

