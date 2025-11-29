import { Table } from 'antd';
import { useState, useEffect } from 'react';
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
  
  /* Убираем отступы у таблицы */
  .ant-table-wrapper {
    margin-top: 0 !important;
  }
  
  /* Отступ пагинации от правого края */
  .ant-pagination {
    padding-right: 10px !important;
  }
`;

/**
 * Widget таблицы сотрудников
 * Оптимизирован для быстрой загрузки и рендеринга
 * Сохраняет состояние фильтров в localStorage
 */
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

  const columns = useEmployeeColumns({
    departments,
    onEdit,
    onView,
    onDelete,
    onViewFiles,
    onDepartmentChange,
    canExport,
    canDeleteEmployee,
    uniqueFilters,
    filters, // Передаем фильтры в хук колонок
    defaultCounterpartyId,
    userCounterpartyId,
    onConstructionSitesEdit, // Передаем новый callback
    resetTrigger, // Передаем триггер сброса
  });

  // Сбрасываем фильтры когда меняется resetTrigger
  useEffect(() => {
    if (resetTrigger > 0) {
      clearFilters();
    }
  }, [resetTrigger]);

  // Обработчик изменения фильтров
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
  };

  return (
    <>
      <style>{tableStyles}</style>
      <Table
        columns={columns}
        dataSource={employees}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
        rowClassName={(record, index) =>
          index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
        }
        scroll={{ 
          x: 1300,
          y: 670
        }}
        onChange={handleTableChange}
      />
    </>
  );
};

