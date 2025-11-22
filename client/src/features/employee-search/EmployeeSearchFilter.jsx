import { Input, Grid } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { useBreakpoint } = Grid;

/**
 * Feature: Фильтрация сотрудников по поисковому запросу
 * Адаптивная ширина: 100% на мобильных, 350px на десктопе
 */
export const EmployeeSearchFilter = ({ searchText, onSearchChange }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Input
      placeholder="Поиск по ФИО, должности, ИНН, СНИЛС..."
      prefix={<SearchOutlined />}
      value={searchText}
      onChange={(e) => onSearchChange(e.target.value)}
      style={{ width: isMobile ? '100%' : 350 }}
      allowClear
    />
  );
};

