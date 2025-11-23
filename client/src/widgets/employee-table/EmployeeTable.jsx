import { Table } from 'antd';
import { useEmployeeColumns } from './EmployeeColumns';

// CSS для чередующихся цветов строк и переноса текста в Select
const tableStyles = `
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
`;

/**
 * Widget таблицы сотрудников
 * Оптимизирован для быстрой загрузки и рендеринга
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
}) => {
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
  });

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
          y: 'calc(100vh - 64px - 77px - 60px)'
          // 64px - Header
          // 77px - Заголовок страницы (padding 16*2 + title ~40px + border 1px)
          // 60px - Pagination
          // Заголовки таблицы автоматически sticky при scroll.y
        }}
      />
    </>
  );
};

