import { Card, Avatar, Typography, Tag, Space, Dropdown, Spin, Empty } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  EllipsisOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { formatPhone } from '@/utils/formatters';

const { Text, Paragraph } = Typography;

/**
 * Мобильный список сотрудников (карточки)
 * Используется на устройствах с маленьким экраном
 */
const MobileEmployeeList = ({ 
  employees, 
  loading, 
  onView, 
  onEdit, 
  onDelete, 
  onViewFiles,
  canExport 
}) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!employees || employees.length === 0) {
    return <Empty description="Нет сотрудников" />;
  }

  // Действия для каждой карточки
  const getMenuItems = (employee) => {
    const items = [
      {
        key: 'view',
        label: 'Просмотр',
        icon: <EyeOutlined />,
        onClick: () => onView(employee),
      },
      {
        key: 'edit',
        label: 'Редактировать',
        icon: <EditOutlined />,
        onClick: () => onEdit(employee),
      },
      {
        key: 'files',
        label: 'Файлы',
        icon: <FileOutlined />,
        onClick: () => onViewFiles(employee),
      },
    ];

    // Добавляем удаление только для контрагента по умолчанию
    if (canExport) {
      items.push({
        type: 'divider',
      });
      items.push({
        key: 'delete',
        label: 'Удалить',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => onDelete(employee.id),
      });
    }

    return items;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {employees.map((employee) => (
        <Card
          key={employee.id}
          size="small"
          onClick={() => onView(employee)}
          style={{ 
            cursor: 'pointer',
            borderRadius: 8,
          }}
          styles={{
            body: { padding: '12px 16px' }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Левая часть - основная информация */}
            <div style={{ flex: 1, display: 'flex', gap: 12 }}>
              {/* Аватар */}
              <Avatar 
                size={48} 
                icon={<UserOutlined />} 
                style={{ backgroundColor: '#2563eb', flexShrink: 0 }}
              />

              {/* Информация */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* ФИО */}
                <Text strong style={{ fontSize: 16, display: 'block' }}>
                  {employee.lastName} {employee.firstName}
                </Text>
                {employee.middleName && (
                  <Text type="secondary" style={{ fontSize: 14, display: 'block' }}>
                    {employee.middleName}
                  </Text>
                )}

                {/* Должность */}
                {employee.Position && (
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
                    {employee.Position.name}
                  </Text>
                )}

                {/* Контакты */}
                <Space direction="vertical" size={2} style={{ marginTop: 8, width: '100%' }}>
                  {employee.phone && (
                    <Space size={4}>
                      <PhoneOutlined style={{ fontSize: 12, color: '#666' }} />
                      <Text style={{ fontSize: 12 }}>
                        {formatPhone(employee.phone)}
                      </Text>
                    </Space>
                  )}
                  {employee.registrationAddress && (
                    <Space size={4} style={{ width: '100%' }}>
                      <EnvironmentOutlined style={{ fontSize: 12, color: '#666', flexShrink: 0 }} />
                      <Paragraph 
                        ellipsis={{ rows: 1 }} 
                        style={{ fontSize: 12, margin: 0, flex: 1 }}
                      >
                        {employee.registrationAddress}
                      </Paragraph>
                    </Space>
                  )}
                </Space>

                {/* Статус */}
                {employee.status && (
                  <div style={{ marginTop: 8 }}>
                    <Tag color={employee.status === 'active' ? 'success' : 'default'}>
                      {employee.status === 'active' ? 'Активен' : 'Неактивен'}
                    </Tag>
                  </div>
                )}
              </div>
            </div>

            {/* Правая часть - меню действий */}
            <Dropdown 
              menu={{ items: getMenuItems(employee) }} 
              trigger={['click']}
              placement="bottomRight"
            >
              <EllipsisOutlined 
                style={{ 
                  fontSize: 20, 
                  padding: 4,
                  cursor: 'pointer',
                  color: '#666'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MobileEmployeeList;

