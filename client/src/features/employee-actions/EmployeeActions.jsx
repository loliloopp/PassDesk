import { Button, Space } from 'antd';
import { PlusOutlined, FileExcelOutlined, LockOutlined } from '@ant-design/icons';

/**
 * Feature: Действия над сотрудниками (добавление, заявка, импорт, блокировка)
 */
export const EmployeeActions = ({
  onAdd,
  onRequest,
  onImport,
  onSecurity,
  canExport,
}) => {
  return (
    <Space size="middle">
      <Button type="primary" icon={<FileExcelOutlined />} onClick={onRequest}>
        Заявка Excel
      </Button>
      <Button type="default" icon={<FileExcelOutlined />} onClick={onImport}>
        Импорт из Excel
      </Button>
      {canExport && (
        <Button type="default" icon={<LockOutlined />} onClick={onSecurity}>
          Блокировка
        </Button>
      )}
      <Button type="default" icon={<PlusOutlined />} onClick={onAdd}>
        Добавить сотрудника
      </Button>
    </Space>
  );
};

