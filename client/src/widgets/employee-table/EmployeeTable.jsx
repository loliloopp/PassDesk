import { Table } from 'antd';
import { useState, useEffect, useRef } from 'react';
import { useEmployeeColumns } from './EmployeeColumns';
import { useTableFilters } from './useTableFilters';

// CSS для чередующихся цветов строк и переноса текста в Select
const tableStyles = `
  /* Компактный размер таблицы */
  .ant-table {
    font-size: 13px !important;
  }
  
  .ant-table td {
    padding: 8px 12px !important;
  }
  
  .ant-table th {
    padding: 8px 12px !important;
  }
  
  .table-row-light {
    background-color: #ffffff;
  }
  .table-row-dark {
    background-color: #f5f5f5;
  }
  .table-row-light:hover,
  .table-row-dark:hover {
    background-color: #e6f7ff !important;
  }
  
  /* Перенос текста в Select для столбца Подразделение */
  .department-select .ant-select-selection-item {
    white-space: normal !important;
    word-break: keep-all !important;
    overflow-wrap: break-word !important;
    line-height: 1.4 !important;
    height: auto !important;
  }
  
  .department-select .ant-select-selector {
    height: auto !important;
    padding: 4px 11px !important;
  }
  
  /* Контейнер таблицы занимает всю доступную высоту */
  .employee-table-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  
  .employee-table-container .ant-table-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    margin-top: 0 !important;
  }
  
  .employee-table-container .ant-spin-nested-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  
  .employee-table-container .ant-spin-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  
  .employee-table-container .ant-table {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  
  .employee-table-container .ant-table-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  
  .employee-table-container .ant-table-body {
    flex: 1;
    min-height: 0;
    overflow: auto !important;
  }
  
  /* Пагинация всегда внизу */
  .employee-table-container .ant-table-pagination {
    flex-shrink: 0;
    margin: 12px 0 !important;
    padding-right: 10px !important;
  }
`;

/**
 * Widget таблицы сотрудников
 * Оптимизирован для быстрой загрузки и рендеринга
 * Сохраняет состояние фильтров в localStorage
 */
// Ключ для localStorage
const PAGE_SIZE_KEY = 'employees_table_page_size';

export const EmployeeTable = ({
  employees,
  departments,
  loading,
  onEdit,
  onView,
  onDelete,
  onViewFiles,
  onDepartmentChange,
  canExport,
  showCounterpartyColumn, // Новый prop для показа столбца "Контрагент"
  canDeleteEmployee,
  uniqueFilters,
  onFiltersChange,
  defaultCounterpartyId,
  userCounterpartyId,
  onConstructionSitesEdit, // Новый prop для редактирования объектов
  resetTrigger, // Триггер для сброса фильтров
}) => {
  const { filters, onFiltersChange: handleLocalFiltersChange, clearFilters } = useTableFilters();
  const [sortOrder, setSortOrder] = useState({});
  
  // Состояние для количества строк на странице с сохранением в localStorage
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem(PAGE_SIZE_KEY);
    return saved ? parseInt(saved, 10) : 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  const columns = useEmployeeColumns({
    departments,
    onEdit,
    onView,
    onDelete,
    onViewFiles,
    onDepartmentChange,
    canExport,
    showCounterpartyColumn, // Передаем новый prop
    canDeleteEmployee,
    uniqueFilters,
    filters, // Передаем фильтры в хук колонок
    defaultCounterpartyId,
    userCounterpartyId,
    onConstructionSitesEdit, // Передаем новый callback
    resetTrigger, // Передаем триггер сброса
  });

  // При загрузке фильтров из localStorage передаем их на верхний уровень
  // Используем ref чтобы отследить первую загрузку
  const filtersInitializedRef = useRef(false);
  useEffect(() => {
    // Передаем фильтры наверх когда они загружены из localStorage (при первом рендере после инициализации)
    if (onFiltersChange && !filtersInitializedRef.current && Object.keys(filters).length > 0) {
      filtersInitializedRef.current = true;
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);

  // Сбрасываем фильтры когда меняется resetTrigger
  useEffect(() => {
    if (resetTrigger > 0) {
      clearFilters();
    }
  }, [resetTrigger]);

  // Обработчик изменения таблицы (фильтры, сортировка, пагинация)
  const handleTableChange = (pagination, filters, sorter) => {
    handleLocalFiltersChange(filters);
    
    // Передаем фильтры на верхний уровень если callback передан
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
    
    // Сохраняем сортировку
    if (sorter.field) {
      setSortOrder({
        field: sorter.field,
        order: sorter.order,
      });
    }
    
    // Сохраняем pageSize в localStorage при изменении
    if (pagination.pageSize !== pageSize) {
      setPageSize(pagination.pageSize);
      localStorage.setItem(PAGE_SIZE_KEY, pagination.pageSize.toString());
    }
    
    // Обновляем текущую страницу
    setCurrentPage(pagination.current);
  };

  return (
    <div className="employee-table-container">
      <style>{tableStyles}</style>
      <Table
        columns={columns}
        dataSource={employees}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `Всего: ${total}`,
        }}
        rowClassName={(record, index) =>
          index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
        }
        scroll={{ 
          x: 1300,
          y: 'calc(100vh - 220px)'
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

