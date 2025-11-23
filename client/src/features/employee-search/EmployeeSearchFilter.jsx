import { Input, Grid, Button, Dropdown } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';

const { useBreakpoint } = Grid;

/**
 * Feature: Фильтрация сотрудников по поисковому запросу и статусу
 * Адаптивная ширина: 100% на мобильных, 350px на десктопе
 */
export const EmployeeSearchFilter = ({ 
  searchText, 
  onSearchChange,
  statusFilter,
  onStatusFilterChange
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // Опции фильтра по статусу
  const statusFilterItems = [
    {
      key: 'all',
      label: 'Все статусы',
    },
    {
      key: 'new',
      label: 'Новые',
    },
    {
      key: 'draft',
      label: 'Черновик',
    },
    {
      key: 'processed',
      label: 'Отправленные',
    },
  ];

  const handleStatusFilterChange = ({ key }) => {
    onStatusFilterChange(key === 'all' ? null : key);
  };

  // Текст для кнопки фильтра
  const getFilterButtonLabel = () => {
    if (!statusFilter) return 'Все статусы';
    if (statusFilter === 'new') return 'Новые';
    if (statusFilter === 'draft') return 'Черновик';
    if (statusFilter === 'processed') return 'Отправленные';
    return 'Фильтр';
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: isMobile ? '100%' : 'auto', flex: isMobile ? 1 : 'auto' }}>
      <Input
        placeholder="Поиск по ФИО, должности, ИНН, СНИЛС..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: isMobile ? '100%' : 350, flex: isMobile ? 1 : 'auto' }}
        allowClear
      />
      
      {isMobile && (
        <Dropdown
          menu={{ items: statusFilterItems, onClick: handleStatusFilterChange }}
          placement="bottomRight"
        >
          <Button 
            icon={<FilterOutlined />}
            type={statusFilter ? 'primary' : 'default'}
            style={{ height: 40 }}
          >
            {!statusFilter ? '▼' : ''}
          </Button>
        </Dropdown>
      )}
    </div>
  );
};

