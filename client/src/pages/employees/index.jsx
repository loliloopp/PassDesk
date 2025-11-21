import { useState, useMemo } from 'react';
import { Typography, App } from 'antd';
import { useEmployees, useEmployeeActions, filterEmployees, getUniqueFilterValues } from '@/entities/employee';
import { useDepartments } from '@/entities/department';
import { useSettings } from '@/entities/settings';
import { useAuthStore } from '@/store/authStore';
import { EmployeeTable } from '@/widgets/employee-table';
import { EmployeeSearchFilter } from '@/features/employee-search';
import { EmployeeActions } from '@/features/employee-actions';
import EmployeeFormModal from '@/components/Employees/EmployeeFormModal';
import EmployeeViewModal from '@/components/Employees/EmployeeViewModal';
import EmployeeFilesModal from '@/components/Employees/EmployeeFilesModal';
import ExportToExcelModal from '@/components/Employees/ExportToExcelModal';
import SecurityModal from '@/components/Employees/SecurityModal';

const { Title } = Typography;

/**
 * Страница управления сотрудниками
 * Оптимизирована для быстрой загрузки с параллельными запросами и мемоизацией
 */
const EmployeesPage = () => {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [filesEmployee, setFilesEmployee] = useState(null);

  const { user } = useAuthStore();

  // Параллельная загрузка всех данных для быстрого старта
  const { employees, loading: employeesLoading, refetch: refetchEmployees } = useEmployees();
  const { departments, loading: departmentsLoading } = useDepartments();
  const { defaultCounterpartyId, loading: settingsLoading } = useSettings();

  // Общий статус загрузки
  const loading = employeesLoading || departmentsLoading || settingsLoading;

  // Определяем права доступа
  const canExport = user?.counterpartyId === defaultCounterpartyId && user?.role !== 'user';

  // Actions для работы с сотрудниками
  const { createEmployee, updateEmployee, deleteEmployee, updateDepartment } =
    useEmployeeActions(refetchEmployees);

  // Мемоизированная фильтрация
  const filteredEmployees = useMemo(
    () => filterEmployees(employees, searchText),
    [employees, searchText]
  );

  // Мемоизированные уникальные значения для фильтров
  const uniqueFilters = useMemo(
    () => getUniqueFilterValues(filteredEmployees),
    [filteredEmployees]
  );

  // Handlers
  const handleAdd = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleView = (employee) => {
    setViewingEmployee(employee);
    setIsViewModalOpen(true);
  };

  const handleViewFiles = (employee) => {
    setFilesEmployee(employee);
    setIsFilesModalOpen(true);
  };

  const handleCloseFilesModal = () => {
    setIsFilesModalOpen(false);
    setFilesEmployee(null);
  };

  const handleDelete = async (id) => {
    await deleteEmployee(id);
    refetchEmployees();
  };

  const handleDepartmentChange = async (employeeId, departmentId) => {
    await updateDepartment(employeeId, departmentId);
    refetchEmployees();
  };

  const handleFormSuccess = async (values) => {
    try {
      if (editingEmployee) {
        // Обновление существующего сотрудника
        const updated = await updateEmployee(editingEmployee.id, values);
        setEditingEmployee(updated);
        message.info('Теперь вы можете продолжить заполнение данных сотрудника');
      } else {
        // Создание нового сотрудника
        const newEmployee = await createEmployee(values);
        setEditingEmployee(newEmployee);
        message.info('Теперь вы можете продолжить заполнение данных сотрудника');
      }
      refetchEmployees();
    } catch (error) {
      // Ошибка уже обработана в хуке
      throw error;
    }
  };

  return (
    <div>
      {/* Заголовок с поиском и действиями */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Сотрудники
        </Title>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <EmployeeSearchFilter searchText={searchText} onSearchChange={setSearchText} />
          <EmployeeActions
            onAdd={handleAdd}
            onExport={() => setIsExportModalOpen(true)}
            onSecurity={() => setIsSecurityModalOpen(true)}
            canExport={canExport}
          />
        </div>
      </div>

      {/* Таблица сотрудников */}
      <EmployeeTable
        employees={filteredEmployees}
        departments={departments}
        loading={loading}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
        onViewFiles={handleViewFiles}
        onDepartmentChange={handleDepartmentChange}
        canExport={canExport}
        uniqueFilters={uniqueFilters}
      />

      {/* Модальные окна */}
      <EmployeeFormModal
        visible={isModalOpen}
        employee={editingEmployee}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
        }}
        onSuccess={handleFormSuccess}
      />

      <EmployeeViewModal
        visible={isViewModalOpen}
        employee={viewingEmployee}
        onCancel={() => setIsViewModalOpen(false)}
        onEdit={() => {
          setIsViewModalOpen(false);
          setEditingEmployee(viewingEmployee);
          setIsModalOpen(true);
        }}
      />

      <EmployeeFilesModal
        visible={isFilesModalOpen}
        employeeId={filesEmployee?.id}
        employeeName={
          filesEmployee
            ? `${filesEmployee.lastName} ${filesEmployee.firstName} ${filesEmployee.middleName || ''}`
            : ''
        }
        onClose={handleCloseFilesModal}
      />

      <ExportToExcelModal
        visible={isExportModalOpen}
        onCancel={() => {
          setIsExportModalOpen(false);
          refetchEmployees();
        }}
      />

      <SecurityModal
        visible={isSecurityModalOpen}
        onCancel={() => setIsSecurityModalOpen(false)}
        onSuccess={() => refetchEmployees()}
      />
    </div>
  );
};

export default EmployeesPage;

