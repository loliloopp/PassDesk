import { Button, Space } from 'antd';
import { PlusOutlined, FileExcelOutlined, LockOutlined } from '@ant-design/icons';

/**
 * Feature: Действия над сотрудниками (добавление, экспорт, блокировка)
 */
export const EmployeeActions = ({
  onAdd,
  onExport,
  onSecurity,
  canExport,
}) => {
  return (
    <Space size="middle">
      {canExport && (
        <Button type="default" icon={<FileExcelOutlined />} onClick={onExport}>
          Импорт в Excel
        </Button>
      )}
      {canExport && (
        <Button type="default" icon={<LockOutlined />} onClick={onSecurity}>
          Блокировка и ТБ
        </Button>
      )}
      <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
        Добавить сотрудника
      </Button>
    </Space>
  );
};

