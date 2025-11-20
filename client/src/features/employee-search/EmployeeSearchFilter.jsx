import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

/**
 * Feature: Фильтрация сотрудников по поисковому запросу
 */
export const EmployeeSearchFilter = ({ searchText, onSearchChange }) => {
  return (
    <Input
      placeholder="Поиск по ФИО, должности, ИНН, СНИЛС..."
      prefix={<SearchOutlined />}
      value={searchText}
      onChange={(e) => onSearchChange(e.target.value)}
      style={{ width: 350 }}
      allowClear
    />
  );
};

