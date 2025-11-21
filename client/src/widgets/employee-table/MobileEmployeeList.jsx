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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {employees.map((employee) => (
        <Card
          key={employee.id}
          size="small"
          onClick={() => onView(employee)}
          style={{ 
            cursor: 'pointer',
            borderRadius: 4,
          }}
          styles={{
            body: { padding: '6px 8px' }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Левая часть - основная информация */}
            <div style={{ flex: 1, display: 'flex', gap: 6, minWidth: 0 }}>
              {/* Аватар */}
              <Avatar 
                size={32} 
                icon={<UserOutlined />} 
                style={{ backgroundColor: '#2563eb', flexShrink: 0 }}
              />

              {/* Информация */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* ФИО */}
                <Text strong style={{ fontSize: 13 }}>
                  {employee.lastName} {employee.firstName}
                </Text>

                {/* Телефон */}
                {employee.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666', marginTop: 2 }}>
                    <PhoneOutlined style={{ fontSize: 10, flexShrink: 0 }} />
                    <span>{formatPhone(employee.phone)}</span>
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
                  fontSize: 16, 
                  padding: 2,
                  cursor: 'pointer',
                  color: '#666',
                  flexShrink: 0
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

